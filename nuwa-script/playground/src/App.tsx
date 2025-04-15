import { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import Examples from './components/Examples';
import Output from './components/Output';
import ToolPanel from './components/ToolPanel';
import AIChat from './components/AIChat';
import { BoltIcon } from './components/AppIcons';
import DrawingCanvas from './components/DrawingCanvas';
import Layout from './components/Layout';
import { examples, examplesById } from './examples';
import { 
  Interpreter, 
  ToolRegistry,
  ToolSchema,
  ToolFunction,
  NuwaInterface,
  OutputHandler
} from './services/nuwaInterpreter';
import { parse } from 'nuwa-script';
import { AIService } from './services/ai';
import { storageService } from './services/storage';
import { tradingTools } from './examples/trading';
import { canvasTools, canvasShapes as initialCanvasShapes, subscribeToCanvasChanges, updateCanvasJSON } from './examples/canvas';
import { ExampleConfig } from './types/Example';
import type { DrawableShape } from './components/DrawingCanvas';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';


// Define some types to supplement original component interfaces
interface CustomMessage {
  role: string;
  content: string;
}

// Class to handle buffering PRINT output
class BufferingOutputHandler {
    private buffer: string[] = [];
    private outputPanelHandler: OutputHandler; // Handler to update the UI panel

    constructor(outputPanelHandler: OutputHandler) {
        this.outputPanelHandler = outputPanelHandler;
    }

    // Called by the interpreter for PRINT statements
    handleOutput(message: string): void {
        this.buffer.push(message);
        // Optionally, still send to the output panel immediately if desired
        // this.outputPanelHandler(message); 
    }

    // Clear the buffer (called before a run)
    clear(): void {
        this.buffer = [];
    }

    // Get the buffered messages as a single string and clear buffer
    flush(): string | null {
        if (this.buffer.length === 0) {
            return null;
        }
        const combined = this.buffer.join('');
        this.clear(); // Clear after flushing
        return combined;
    }

    // Get the bound handler function to pass to the interpreter
    getHandler(): OutputHandler {
        return this.handleOutput.bind(this);
    }
}

// Extend NuwaInterface to include the buffering handler
interface ExtendedNuwaInterface extends NuwaInterface {
  bufferingOutputHandler: BufferingOutputHandler;
}

type ActiveSidePanel = 'examples' | 'tools'; // Define type if needed here

function App() {
  // State management - Keep application logic state
  const [selectedExample, setSelectedExample] = useState<ExampleConfig | null>(null);
  const [script, setScript] = useState('');
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState<string | undefined>(undefined);
  const [nuwaInterface, setNuwaInterface] = useState<ExtendedNuwaInterface | null>(null);
  const [apiKey, setApiKey] = useState(storageService.getApiKey());
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // State moved to Layout: activeSidePanel, scriptPanelHeight, isDragging
  const [activeSidePanel, setActiveSidePanel] = useState<ActiveSidePanel>('examples'); // Keep state here, pass down initial value and handler
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [currentToolSchemas, setCurrentToolSchemas] = useState<ToolSchema[]>([]);
  const [shapes, setShapes] = useState<DrawableShape[]>(initialCanvasShapes);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null); // Keep ref if Editor needs it

  // Initialization
  useEffect(() => {
    const lastExampleId = storageService.getLastSelectedExample() || examples[0]?.id;
    if (lastExampleId && examplesById[lastExampleId]) {
      handleSelectExample(examplesById[lastExampleId]);
    } else if (examples.length > 0) {
      handleSelectExample(examples[0]);
    }

    // Subscribe to canvas shape changes
    const unsubscribe = subscribeToCanvasChanges(() => {
      console.log('[App.tsx] Canvas shapes updated in canvas.ts. Global state:', JSON.stringify(initialCanvasShapes)); // Log global state
      const newShapes = [...initialCanvasShapes];
      setShapes(newShapes);
      console.log('[App.tsx] React state set with new shapes:', JSON.stringify(newShapes)); // Log state being set
    });

    // Cleanup subscription
    return () => unsubscribe();

  }, []);

  // Select example
  const handleSelectExample = (example: ExampleConfig) => {
    setSelectedExample(example);
    setScript(example.script);
    setOutput('');
    setExecutionError(undefined);
    storageService.saveLastSelectedExample(example.id);
    
    // Reset canvas state for canvas example
    if (example.id === 'canvas') {
        console.log('[App.tsx] Canvas example selected. Clearing shapes.');
        initialCanvasShapes.length = 0;
        setShapes([]);
    }

    // Setup interpreter AFTER potentially clearing state
    setupInterpreter(example);
  };

  // Setup interpreter and tools
  const setupInterpreter = (example: ExampleConfig) => {
    const toolRegistry = new ToolRegistry();
    
    // Store registry in global object (browser-compatible way)
    const globalObj = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
    (globalObj as { __toolRegistry?: ToolRegistry }).__toolRegistry = toolRegistry;
    
    // Define the handler that updates the actual Output UI panel
    const uiOutputHandler: OutputHandler = (message) => {
        setOutput(prev => (prev ? prev + '\n' + message : message));
    };

    // Create the buffering handler, passing the UI handler to it (if needed for live output)
    // If we ONLY want output in chat, we can pass a dummy handler: () => {}
    const bufferingHandler = new BufferingOutputHandler(uiOutputHandler); 

    // Pass the buffering handler's bound function to the Interpreter
    const interpreter = new Interpreter(toolRegistry, bufferingHandler.getHandler());
    
    let exampleTools: { schema: ToolSchema, execute: ToolFunction }[] = []; 
    
    if (example.id === 'basic') exampleTools = basicTools;
    else if (example.id === 'trading') exampleTools = tradingTools;
    else if (example.id === 'weather') exampleTools = weatherTools;
    else if (example.id === 'canvas') {
      exampleTools = canvasTools;
      
      // Initialize canvas state with metadata
      toolRegistry.setState('canvas_shape_count', 0);
      toolRegistry.registerStateMetadata('canvas_shape_count', {
        description: "Number of shapes currently on the canvas"
      });
      
      // Initialize timestamp
      const now = Date.now();
      toolRegistry.setState('canvas_initialized', now);
      toolRegistry.registerStateMetadata('canvas_initialized', {
        description: "Time when the canvas was initialized",
        formatter: (value) => {
          const date = new Date(value as number);
          return `${value} (${date.toLocaleString()})`;
        }
      });
    }
    
    exampleTools.forEach(tool => {
        toolRegistry.register(tool.schema.name, tool.schema, tool.execute);
    });
    
    // Set the interpreter and registry in state.
    // Store the buffering handler instance
    setNuwaInterface({ 
        interpreter, 
        outputBuffer: [], // This is now redundant, consider removing
        toolRegistry,
        bufferingOutputHandler: bufferingHandler // Store the handler instance
    }); 
    setCurrentToolSchemas(toolRegistry.getAllSchemas());
  };

  // Run script
  const handleRun = async (scriptToRun: string) => { // Accept script as argument
    if (!nuwaInterface) return;

    setIsRunning(true);
    setOutput(''); // Clear Output panel before run
    setExecutionError(undefined); // Clear previous errors

    // Get the buffering handler instance
    const bufferingHandler = nuwaInterface.bufferingOutputHandler;
    // Clear buffer before execution
    bufferingHandler.clear();

    // No need to swap handlers anymore

    try {
      console.log("Parsing script:", scriptToRun);
      const scriptAST = parse(scriptToRun); // Use the passed script
      console.log("Parsed AST:", scriptAST);

      if (!scriptAST || typeof scriptAST !== 'object' || scriptAST.kind !== 'Script') {
         throw new Error("Parsing did not return a valid Script AST node.");
      }

      console.log("Executing AST...");
      // Interpreter uses the buffering handler provided during setup
      const scope = await nuwaInterface.interpreter.execute(scriptAST);
      console.log("Execution finished. Final scope:", scope);
      
      // After successful execution, flush buffer and add to chat if needed
      const capturedOutput = bufferingHandler.flush();
      if (capturedOutput !== null) { 
        setMessages(prev => [...prev, {
          role: 'assistant', // Use 'assistant' role for interpreter PRINT output
          content: capturedOutput // Remove prefix, treat as direct AI response
        }]);
      }

    } catch (err) {
      console.error("Execution or Parsing error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setExecutionError(errorMsg); // Set specific execution error state
    } finally {
      // No need to restore handler anymore
      setIsRunning(false);
    }
  };

  // AI Chat message handler
  const handleAIChatMessage = async (message: string) => {
    // Check if API key is set
    if (!apiKey) {
      // If message looks like an API key
      if (message.startsWith('sk-') && message.length > 20) {
        setApiKey(message);
        storageService.saveApiKey(message);
        // Add system notification
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: 'API key has been successfully set, now you can start asking questions!' 
        }]);
        return;
      } else {
        // Prompt user to enter API key
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: 'Please enter your OpenAI API key (starting with sk-) to use the AI assistant.' 
        }]);
        return;
      }
    }
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    setIsGenerating(true);
    // Clear previous errors and output when starting a new generation
    setExecutionError(undefined);
    setOutput('');

    try {
      if (!selectedExample || !nuwaInterface || !nuwaInterface.toolRegistry) {
        throw new Error('Missing example or interpreter/toolRegistry not initialized');
      }
      
      // Define application-specific guidance for canvas example
      let appSpecificGuidance = "";
      if (selectedExample.id === 'canvas') {
        appSpecificGuidance = `
# Canvas-Specific Guidelines:
- DO NOT automatically call clearCanvas {} at the beginning unless explicitly requested.
- Build upon the existing canvas content unless the user asks to start fresh.
- Use the current state variable 'canvas_json' to understand what's already drawn before adding new elements. It contains a JSON string representing all shapes.

# Spatial Positioning Guidelines:
- The canvas is 500x400 pixels. Coordinate system: (0,0) is top-left; x increases right, y increases down. Center is roughly (250, 200).
- Before placing new shapes, carefully examine the 'canvas_json' state variable to check existing shapes (coordinates, size).
- When placing objects relative to others (e.g., "next to", "above"), calculate positions thoughtfully based on the 'canvas_json' data to avoid unwanted overlaps and maintain reasonable spacing (e.g., 20-50 pixels generally looks good).
- Ensure new shapes fit within canvas bounds (x: 0-500, y: 0-400).

# Layout and Aesthetics Guidelines:
- Consider the overall composition and visual appeal of the entire canvas when placing elements.
- Arrange elements thoughtfully on the canvas, leaving appropriate space between them.
- Consider the relative positions requested (e.g., 'sun in the sky', 'tree next to the house').
- Avoid placing elements directly overlapping unless specifically instructed.
- Try to create a visually balanced composition.

# Thinking Process:
- Use PRINT statements to explain your reasoning, especially for coordinate calculations and layout decisions. For example: PRINT("Placing the sun at x=400, y=80 to be in the top-right sky.")
`;
      }
      
      const aiService = new AIService({ 
        apiKey,
        appSpecificGuidance 
      });
      const generatedCode = await aiService.generateNuwaScript(
        message,
        nuwaInterface.toolRegistry 
      );
      
      // Update the editor content FIRST
      setScript(generatedCode);

      // 2. Update the editor content directly via its instance
      if (editorRef.current) {
        editorRef.current.setValue(generatedCode);
      } else {
        // Fallback or log error if editor instance not available
        console.warn("Editor instance not available to set value programmatically.");
        // The editor might still pick up the change via defaultValue on next render if key changes, but direct update is better.
      }

      // Immediately run the generated script AFTER setting state
      await handleRun(generatedCode);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // Set execution error state
      setExecutionError(errorMsg);
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error generating or executing code: ${errorMsg}`
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear output
  const handleClearOutput = () => {
    setOutput('');
    setExecutionError(undefined); // Clear execution error too
  };

  // Prepare props for Layout component
  const headerProps = {
    onRunClick: () => handleRun(script),
    isRunning: isRunning,
    isRunDisabled: isRunning || !script.trim() || !nuwaInterface
  };

  const sidebarContent = activeSidePanel === 'examples' ? (
    <Examples 
      examples={examples.map(ex => ({
        name: ex.name,
        description: ex.description,
        code: ex.script
      }))} 
      onSelect={(code) => {
        const example = examples.find(e => e.script === code);
        if (example) {
          handleSelectExample(example);
        }
      }} 
    />
  ) : (
    <ToolPanel 
      tools={currentToolSchemas}
    />
  );

  const mainPanelContent = (
    <>
      {/* Display Execution Error */}
      {executionError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md flex items-start">
          <span className="w-5 h-5 mr-2 flex-shrink-0 text-red-600 font-bold">(!)</span>
          <pre className="text-sm whitespace-pre-wrap break-words flex-1">{executionError}</pre>
        </div>
      )}

      {selectedExample?.id === 'canvas' ? (
        <>
          {/* Log shapes prop passed to DrawingCanvas - Return null to be valid JSX */} 
          {(() => { 
              console.log('[App.tsx] Rendering DrawingCanvas with shapes:', JSON.stringify(shapes)); 
              return null; 
          })()}
          <div className="canvas-container w-full h-full flex items-center justify-center overflow-auto">
            <DrawingCanvas 
              width={500}
              height={400}
              shapes={shapes}
              onCanvasChange={(json) => {
                console.log('[App.tsx] Canvas JSON updated:', json);
                updateCanvasJSON(json);
              }}
            />
          </div>
        </>
      ) : (
        // Render standard output for other examples
        <>
          {!output && !executionError && !isRunning && (
            <div className="text-center text-gray-500 flex-1 flex flex-col justify-center items-center">
              <div className="welcome-icon">
                <BoltIcon size="large" className="mx-auto mb-3 opacity-50" />
              </div>
              <p>Run your code to see output here</p>
              <p className="text-xs mt-2 max-w-sm">Press the "Run" button above to execute your NuwaScript code</p>
            </div>
          )}
          <Output 
            output={output} 
            error={null} 
            onClear={handleClearOutput} 
            loading={isRunning}
          />
        </>
      )}
    </>
  );

  const scriptPanelContent = (
    <Editor
      key={selectedExample?.id ? `${selectedExample.id}-${script}` : `default-${script}`}
      defaultValue={script}
      readOnly={isRunning}
      onChange={(newCode = '') => setScript(newCode)}
      language="nuwa"
      editorInstanceRef={editorRef}
    />
  );

  const chatPanelContent = (
    <AIChat 
      onSendMessage={handleAIChatMessage}
      messages={messages}
      isProcessing={isGenerating}
      apiKeySet={!!apiKey}
    />
  );

  // Render using the Layout component
  return (
    <Layout
      headerProps={headerProps}
      sidebarContent={sidebarContent}
      mainPanelTitle={selectedExample?.id === 'canvas' ? 'Canvas' : 'Application Output'}
      mainPanelContent={mainPanelContent}
      scriptPanelTitle="NuwaScript"
      scriptPanelContent={scriptPanelContent}
      chatPanelContent={chatPanelContent}
      onSelectSidebarTab={setActiveSidePanel}
      initialActiveSidePanel={activeSidePanel}
    >
    </Layout>
  );
}

export default App;
