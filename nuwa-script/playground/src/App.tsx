import { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import Examples from './components/Examples';
import Output from './components/Output';
import ToolPanel from './components/ToolPanel';
import AIChat from './components/AIChat';
import { BoltIcon } from './components/AppIcons';
import DrawingCanvas from './components/DrawingCanvas';
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
import { basicTools } from './examples/basic';
import { tradingTools } from './examples/trading';
import { weatherTools } from './examples/weather';
import { canvasTools, canvasShapes as initialCanvasShapes, subscribeToCanvasChanges, updateCanvasJSON } from './examples/canvas';
import { ExampleConfig } from './types/Example';
import type { DrawableShape } from './components/DrawingCanvas';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import './App.css';

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

function App() {
  // State management
  const [selectedExample, setSelectedExample] = useState<ExampleConfig | null>(null);
  const [script, setScript] = useState('');
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState<string | undefined>(undefined);
  // Use the extended interface for state
  const [nuwaInterface, setNuwaInterface] = useState<ExtendedNuwaInterface | null>(null);
  const [apiKey, setApiKey] = useState(storageService.getApiKey());
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'examples' | 'tools'>('examples');
  const [scriptPanelHeight, setScriptPanelHeight] = useState<string>('40%');
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [currentToolSchemas, setCurrentToolSchemas] = useState<ToolSchema[]>([]);
  const [shapes, setShapes] = useState<DrawableShape[]>(initialCanvasShapes);
  // Ref to hold the editor instance
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

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
      // Update React state with a new array copy
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
    
    // Ensure canvas state is explicitly cleared or initialized for the canvas example
    if (example.id === 'canvas') {
        console.log('[App.tsx] Canvas example selected. Clearing shapes.');
        initialCanvasShapes.length = 0; // Clear the global array
        setShapes([]); // Clear the React state
    } else {
        // Optional: Clear shapes if switching away from canvas?
        // initialCanvasShapes.length = 0;
        // setShapes([]);
    }

    // Setup interpreter *after* potentially clearing state
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

  // Start resize operation for editor/output panels
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle resize on drag 
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const container = document.querySelector('.flex.flex-col.h-screen') as HTMLDivElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const y = e.clientY - containerRect.top;
          
          const height = containerRect.height || 1;
          const percentage = (y / height) * 100;
          
          const minHeight = 15;
          const maxHeight = 85;
          
          const clampedPercentage = Math.min(Math.max(percentage, minHeight), maxHeight);
          
          setScriptPanelHeight(`${clampedPercentage}%`);
        }
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="nuwa-header flex items-center justify-between px-4 py-2 shadow-md bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <a href="https://github.com/rooch-network/nuwa" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <img src="/nuwa-icon.svg" alt="Nuwa Logo" className="logo h-8 w-8" />
          </a>
          <div className="ml-2 text-lg font-semibold text-gray-800 dark:text-gray-200">NuwaScript Playground</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleRun(script)}
            disabled={isRunning || !script.trim() || !nuwaInterface}
            className="nuwa-button flex items-center"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                <BoltIcon className="mr-1" /> Run
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with examples list (VS Code style) */}
        <aside className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium text-center ${activeSidePanel === 'examples' ? 'bg-gray-100 dark:bg-gray-700 text-brand-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveSidePanel('examples')}
            >
              Examples
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium text-center ${activeSidePanel === 'tools' ? 'bg-gray-100 dark:bg-gray-700 text-brand-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveSidePanel('tools')}
            >
              Tools
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {activeSidePanel === 'examples' ? (
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
            )}
          </div>
        </aside>

        {/* Middle and right content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Main application panel and AI chat area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main application panel */}
            <div className="flex-1 overflow-hidden flex flex-col main-panel min-w-[600px]">
              <div className="flex-1 overflow-hidden relative">
                {/* Output panel container - content changes based on example */}
                <div className="h-full overflow-hidden bg-white">
                  <div className="flex items-center px-4 py-2 bg-white border-b border-gray-200">
                    <BoltIcon size="small" className="text-gray-700 mr-2 w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      {selectedExample?.id === 'canvas' ? 'Canvas' : 'Application Output'}
                    </span>
                  </div>
                  <div className="h-[calc(100%-36px)] p-4 bg-white overflow-auto flex flex-col items-center justify-center">
                    {/* Display Execution Error Here */}
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
                          <div className="text-center text-gray-500">
                            <div className="welcome-icon">
                              <BoltIcon size="small" className="mx-auto mb-3 opacity-50" />
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
                  </div>
                </div>
              </div>
              
              {/* Script panel (collapsible, always visible now) */}
              <div className="border-t border-gray-200" style={{ height: scriptPanelHeight }}>
                <div 
                  className="resize-handle cursor-ns-resize w-full h-1 bg-gray-200 hover:bg-blue-300"
                  onMouseDown={startResize}
                ></div>
                <div className="px-4 py-1 bg-white border-b border-gray-200 text-sm text-gray-700 flex justify-between items-center">
                  <div>NuwaScript</div>
                  <button 
                    onClick={() => setScriptPanelHeight('40%')}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div className="h-[calc(100%-32px)] overflow-hidden">
                  <Editor
                    key={selectedExample?.id || 'default'}
                    defaultValue={script}
                    readOnly={isRunning}
                    onChange={(newCode = '') => setScript(newCode)}
                    language="javascript"
                  />
                </div>
              </div>
            </div>

            {/* AI Chat panel (always visible) */}
            <div className="w-80 min-w-80 max-w-80 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
              <div className="p-4 h-full">
                <AIChat 
                  onSendMessage={handleAIChatMessage}
                  messages={messages}
                  isProcessing={isGenerating}
                  apiKeySet={!!apiKey}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
