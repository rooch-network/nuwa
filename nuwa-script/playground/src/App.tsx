import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from './components/Editor';
import Examples from './components/Examples';
import Output from './components/Output';
import ToolPanel from './components/ToolPanel';
import AIChat from './components/AIChat';
import { BoltIcon } from './components/AppIcons';
import Layout from './components/Layout';
import { examples, examplesById } from './examples';
import { renderExampleComponent } from './components/ExampleComponents';
import { 
  Interpreter, 
  ToolRegistry,
  ToolSchema,
  ToolFunction,
  NuwaInterface,
  OutputHandler
} from './services/interpreter';
import { parse } from 'nuwa-script';
import { AIService } from './services/ai';
import { storageService } from './services/storage';
import { tradingTools } from './examples/trading';
import { canvasTools, canvasShapes, subscribeToCanvasChanges, updateCanvasJSON } from './examples/canvas';
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

    constructor() {
    }

    // Called by the interpreter for PRINT statements
    handleOutput(message: string): void {
        this.buffer.push(message);
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
        const combined = this.buffer.join('\n');
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
  const [shapes, setShapes] = useState<DrawableShape[]>(canvasShapes);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null); // Keep ref if Editor needs it
  const [editorContent, setEditorContent] = useState(''); // 编辑器内容状态

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
      console.log('[App.tsx] Syncing shapes via subscription. Global state:', JSON.stringify(canvasShapes)); 
      // 强制更新状态以触发重新渲染
      setShapes(prevShapes => {
        // 确保是一个新的引用以触发渲染
        return [...canvasShapes];
      });
    });

    // Cleanup subscription 
    return () => unsubscribe();
  }, []); // Runs once on mount

  // Memoize the onCanvasChange callback to prevent unnecessary re-renders
  const handleCanvasChange = useCallback((json: object) => {
    console.log('[App.tsx] Canvas JSON updated (via callback):', json);
    updateCanvasJSON(json); // Update global JSON state and tool registry state
  }, []);

  // Select example and setup the interpreter
  const handleSelectExample = useCallback((example: ExampleConfig) => {
    setSelectedExample(example);
    setScript(example.script);
    setEditorContent(example.script);
    setOutput('');
    setExecutionError(undefined);
    storageService.saveLastSelectedExample(example.id);
    
    // Reset canvas state for canvas example
    if (example.id === 'canvas') {
      console.log('[App.tsx] Canvas example selected. Clearing shapes.');
      canvasShapes.length = 0; // Clear global array
      updateCanvasJSON({}); // Notify registry about empty canvas
    }

    // Setup interpreter AFTER potentially clearing state
    setupInterpreter(example);
  }, []);

  // Setup interpreter and tools
  const setupInterpreter = (example: ExampleConfig) => {
    const toolRegistry = new ToolRegistry();
    
    // Store registry in global object (browser-compatible way)
    const globalObj = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
    (globalObj as { __toolRegistry?: ToolRegistry }).__toolRegistry = toolRegistry;
    
    const bufferingHandler = new BufferingOutputHandler(); 

    // Pass the buffering handler's bound function to the Interpreter
    const interpreter = new Interpreter(toolRegistry, bufferingHandler.getHandler());
    
    let exampleTools: { schema: ToolSchema, execute: ToolFunction }[] = []; 
    
    if (example.id === 'trading') exampleTools = tradingTools;
    else if (example.id === 'canvas') {
      exampleTools = canvasTools;
    }
    
    exampleTools.forEach(tool => {
      toolRegistry.register(tool.schema.name, tool.schema, tool.execute);
    });
    
    // If example has a state manager, use it to initialize the state
    if (example.stateManager) {
      console.log(`[App.tsx] Initializing state for ${example.id} using state manager`);
      example.stateManager.updateStateInRegistry();
    }
    
    // Set the interpreter and registry in state
    setNuwaInterface({ 
      interpreter, 
      outputBuffer: [], 
      toolRegistry,
      bufferingOutputHandler: bufferingHandler 
    }); 
    
    setCurrentToolSchemas(toolRegistry.getAllSchemas());
  };

  // Run script - 改进执行流程
  const handleRun = async (scriptToRun: string) => {
    if (!nuwaInterface) return;

    setIsRunning(true);
    setOutput(''); // Clear Output panel before run
    setExecutionError(undefined); // Clear previous errors

    const bufferingHandler = nuwaInterface.bufferingOutputHandler;
    bufferingHandler.clear();

    try {
      console.log("[App.tsx] Parsing and executing script...");
      const scriptAST = parse(scriptToRun);

      if (!scriptAST || typeof scriptAST !== 'object' || scriptAST.kind !== 'Script') {
        throw new Error("Parsing did not return a valid Script AST node.");
      }

      // 确保同步 script 状态
      setScript(scriptToRun);
      
      // 执行脚本
      const scope = await nuwaInterface.interpreter.execute(scriptAST);
      console.log("Execution finished. Final scope:", scope);
      
      // 如果是 Canvas 示例，确保触发刷新
      if (selectedExample?.id === 'canvas') {
        // 更新一次画布状态以确保刷新
        console.log("[App.tsx] Canvas example executed, force refreshing canvas...");
        setShapes([...canvasShapes]);
      }

      const capturedOutput = bufferingHandler.flush();
      if (capturedOutput !== null) { 
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: capturedOutput
        }]);
      }

    } catch (err) {
      console.error("Execution or Parsing error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setExecutionError(errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  // 处理脚本变更
  const handleScriptChange = useCallback((newCode = '') => {
    setEditorContent(newCode);
  }, []);

  // 处理运行按钮点击
  const handleRunClick = useCallback(() => {
    // 使用最新的编辑器内容执行
    handleRun(editorContent);
  }, [editorContent]);

  // AI 聊天消息处理
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
      
      // Use example's aiPrompt field as appSpecificGuidance
      const appSpecificGuidance = selectedExample.aiPrompt || "";
      
      const aiService = new AIService({ 
        apiKey,
        appSpecificGuidance 
      });
      const generatedCode = await aiService.generateNuwaScript(
        message,
        nuwaInterface.toolRegistry 
      );
      
      // Update the editor content
      setEditorContent(generatedCode);
      setScript(generatedCode);

      if (editorRef.current) {
        editorRef.current.setValue(generatedCode);
      }

      // Immediately run the generated script
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

  // 清除输出
  const handleClearOutput = useCallback(() => {
    setOutput('');
    setExecutionError(undefined);
  }, []);

  // 准备布局组件属性
  const headerProps = {
    onRunClick: handleRunClick,
    isRunning,
    isRunDisabled: isRunning || !editorContent.trim() || !nuwaInterface
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

  // Memoize the mainPanelContent to prevent unnecessary re-renders
  const mainPanelContent = useMemo(() => (
    <>
      {/* Display Execution Error */}
      {executionError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md flex items-start">
          <span className="w-5 h-5 mr-2 flex-shrink-0 text-red-600 font-bold">(!)</span>
          <pre className="text-sm whitespace-pre-wrap break-words flex-1">{executionError}</pre>
        </div>
      )}

      {selectedExample?.componentId ? (
        // Render custom component based on componentId
        <div className="component-container w-full">
          {renderExampleComponent(
            selectedExample.componentId,
            // Pass component-specific props if needed
            selectedExample.id === 'canvas' ? {
              width: 500,
              height: 400,
              shapes: shapes,
              onCanvasChange: handleCanvasChange
            } : undefined
          )}
        </div>
      ) : (
        // Render standard output for examples without custom component
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
  ), [executionError, selectedExample?.componentId, selectedExample?.id, shapes, handleCanvasChange, output, isRunning, handleClearOutput]);

  // Memoize the scriptPanelContent to prevent unnecessary re-renders
  const scriptPanelContent = useMemo(() => (
    <Editor
      key={selectedExample?.id || 'default'} 
      defaultValue={editorContent}
      readOnly={isRunning}
      onChange={handleScriptChange}
      language="nuwa"
      editorInstanceRef={editorRef}
    />
  ), [selectedExample?.id, isRunning, handleScriptChange, editorContent]);

  const chatPanelContent = useMemo(() => (
    <AIChat 
      onSendMessage={handleAIChatMessage}
      messages={messages}
      isProcessing={isGenerating}
      apiKeySet={!!apiKey}
    />
  ), [handleAIChatMessage, messages, isGenerating, apiKey]);

  // Build dynamic title for main panel based on selected example
  const getMainPanelTitle = () => {
    if (!selectedExample) return 'Application Output';
    
    if (selectedExample.id === 'canvas') return 'Canvas';
    if (selectedExample.id === 'trading') return 'Trading Dashboard';
    
    return 'Application Output';
  };

  // Render using the Layout component
  return (
    <Layout
      headerProps={headerProps}
      sidebarContent={sidebarContent}
      mainPanelTitle={getMainPanelTitle()}
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
