import { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Examples from './components/Examples';
import Output from './components/Output';
import ToolPanel from './components/ToolPanel';
import AIChat from './components/AIChat';
import { BoltIcon, CodeFileIcon } from './components/AppIcons';
import { examples, examplesById } from './examples';
import { createInterpreter, Interpreter, Tool } from './services/interpreter';
import { AIService } from './services/ai';
import { storageService } from './services/storage';
import { tools as basicTools } from './examples/basic';
import { tools as tradingTools } from './examples/trading';
import { tools as weatherTools } from './examples/weather';
import { ExampleConfig } from './types/Example';

import './App.css';

// Define some types to supplement original component interfaces
interface CustomMessage {
  role: string;
  content: string;
}

function App() {
  // State management
  const [selectedExample, setSelectedExample] = useState<ExampleConfig | null>(null);
  const [script, setScript] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [interpreter, setInterpreter] = useState<Interpreter | null>(null);
  const [apiKey, setApiKey] = useState(storageService.getApiKey());
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'examples' | 'tools'>('examples');
  const [scriptPanelHeight, setScriptPanelHeight] = useState<string>('40%');
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<CustomMessage[]>([]);

  // Initialization
  useEffect(() => {
    // Load previously selected example or default example
    const lastExampleId = storageService.getLastSelectedExample() || examples[0]?.id;
    if (lastExampleId && examplesById[lastExampleId]) {
      handleSelectExample(examplesById[lastExampleId]);
    } else if (examples.length > 0) {
      handleSelectExample(examples[0]);
    }
  }, []);

  // Select example
  const handleSelectExample = (example: ExampleConfig) => {
    setSelectedExample(example);
    setScript(example.script);
    setOutput('');
    setError(undefined);
    storageService.saveLastSelectedExample(example.id);
    
    // Create new interpreter and register tools
    setupInterpreter(example);
  };

  // Setup interpreter and tools
  const setupInterpreter = (example: ExampleConfig) => {
    const newInterpreter = createInterpreter();
    
    // Register tools based on the selected example
    let exampleTools: Tool[] = [];
    
    if (example.id === 'basic') {
      exampleTools = basicTools;
    } else if (example.id === 'trading') {
      exampleTools = tradingTools;
    } else if (example.id === 'weather') {
      exampleTools = weatherTools;
    }
    
    // Register tools
    exampleTools.forEach(tool => newInterpreter.registerTool(tool));
    
    setInterpreter(newInterpreter);
  };

  // Run script
  const handleRun = async () => {
    if (!interpreter) return;
    
    setIsRunning(true);
    setOutput('');
    setError(undefined);
    
    try {
      const result = await interpreter.execute(script);
      setOutput(result.output);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  // Handle AI chat message
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
    try {
      if (!selectedExample) {
        throw new Error('Missing example');
      }
      
      const aiService = new AIService({ apiKey });
      const generatedCode = await aiService.generateNuwaScript(
        message,
        selectedExample.tools
      );
      
      // Add AI response message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I generated the following code for you:\n\n```js\n' + generatedCode + '\n```' 
      }]);
      
      setScript(generatedCode);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      // Add error message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error generating code: ${errorMsg}` 
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear output
  const handleClearOutput = () => {
    setOutput('');
    setError(undefined);
  };

  // Start resize operation for editor/output panels
  const startResize = () => {
    setIsDragging(true);
  };

  // Handle resize on drag 
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const container = document.querySelector('.flex-col') as HTMLDivElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const y = e.clientY - containerRect.top;
          
          // Calculate percentage
          const percentage = (y / containerRect.height) * 100;
          
          // Set minimum panel height
          const minHeight = 20;
          const maxHeight = 80;
          
          // Limit range
          const clampedPercentage = Math.min(Math.max(percentage, minHeight), maxHeight);
          
          setScriptPanelHeight(`${clampedPercentage}%`);
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="nuwa-header flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <a href="/" className="flex items-center">
            <img src="/nuwa-icon.svg" alt="Nuwa Logo" className="logo h-8 w-8" />
          </a>
          <div className="ml-2 text-base font-semibold text-gray-800">NuwaScript</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRun}
            disabled={isRunning || !script.trim()}
            className="nuwa-button flex items-center"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>Run</>
            )}
          </button>
          <button
            onClick={() => setShowScriptPanel(!showScriptPanel)}
            className={`nuwa-button-secondary flex items-center ${showScriptPanel ? 'border-brand-primary text-brand-primary' : ''}`}
          >
            <CodeFileIcon size="small" className="mr-1" />
            Toggle Script
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with examples list (VS Code style) */}
        <div className="w-64 bg-gray-800 text-white flex flex-col">
          <div className="flex border-b border-gray-700">
            <button
              className={`flex-1 py-2 px-4 text-center text-sm font-medium ${
                activeSidePanel === 'examples'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveSidePanel('examples')}
            >
              Examples
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center text-sm font-medium ${
                activeSidePanel === 'tools'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveSidePanel('tools')}
            >
              Tools
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {activeSidePanel === 'examples' ? (
              <Examples 
                examples={examples.map(example => ({
                  name: example.name,
                  description: example.description,
                  code: example.script
                }))} 
                onSelect={(code) => {
                  // Find and select the matching example
                  const example = examples.find(e => e.script === code);
                  if (example) {
                    handleSelectExample(example);
                  }
                }} 
              />
            ) : (
              <div className="h-full">
                <ToolPanel tools={selectedExample?.tools || []} />
              </div>
            )}
          </div>
        </div>

        {/* Middle and right content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main application panel and AI chat area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main application panel */}
            <div className="flex-1 overflow-hidden flex flex-col main-panel">
              <div className="flex-1 overflow-hidden relative">
                {/* Output panel */}
                <div className="h-full overflow-hidden bg-white">
                  <div className="flex items-center px-4 py-2 bg-white border-b border-gray-200">
                    <BoltIcon size="small" className="text-gray-700 mr-2 w-4 h-4" />
                    <span className="text-sm text-gray-700">Application Output</span>
                  </div>
                  <div className="h-[calc(100%-36px)] p-4 bg-white overflow-auto flex flex-col items-center justify-center">
                    {!output && !error && !isRunning && (
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
                      error={error || null} 
                      loading={isRunning}
                      onClear={handleClearOutput}
                    />
                  </div>
                </div>
              </div>
              
              {/* Script panel (collapsible) */}
              {showScriptPanel && (
                <div className="border-t border-gray-200" style={{ height: scriptPanelHeight }}>
                  <div 
                    className="resize-handle cursor-ns-resize w-full h-1 bg-gray-200 hover:bg-blue-300"
                    onMouseDown={startResize}
                  ></div>
                  <div className="px-4 py-1 bg-white border-b border-gray-200 text-sm text-gray-700 flex justify-between items-center">
                    <div>NuwaScript</div>
                    <button 
                      onClick={() => setShowScriptPanel(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                  <div className="h-[calc(100%-32px)] overflow-hidden">
                    <Editor 
                      defaultValue={script} 
                      onChange={setScript} 
                      language="javascript" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* AI Chat panel (always visible) */}
            <div className="w-96 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
              <div className="p-4 h-full">
                <AIChat 
                  onSendMessage={handleAIChatMessage}
                  messages={messages}
                  isProcessing={isGenerating}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
