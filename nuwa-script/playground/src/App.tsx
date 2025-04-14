import { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Examples from './components/Examples';
import Output from './components/Output';
import ToolPanel from './components/ToolPanel';
import AIChat from './components/AIChat';
import { examples, examplesById } from './examples';
import { createInterpreter, Interpreter, Tool } from './services/interpreter';
import { AIService } from './services/ai';
import { storageService } from './services/storage';
import { tools as basicTools } from './examples/basic';
import { tools as tradingTools } from './examples/trading';
import { tools as weatherTools } from './examples/weather';
import { ExampleConfig } from './types/Example';

import './App.css';

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
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeSidePanel, setActiveSidePanel] = useState<'examples' | 'tools'>('examples');

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

  // Generate script using AI
  const handleGenerateScript = async (prompt: string) => {
    if (!selectedExample || !apiKey || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const aiService = new AIService({ apiKey });
      const generatedCode = await aiService.generateNuwaScript(
        prompt,
        selectedExample.tools
      );
      
      setScript(generatedCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Save API Key
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    storageService.saveApiKey(key);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">NuwaScript Playground</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRun}
            disabled={isRunning || !script.trim()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center shadow-sm transition-colors"
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
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Run
              </>
            )}
          </button>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-colors ${
              showAIPanel 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            {showAIPanel ? 'Hide AI' : 'AI Assistant'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with examples list and tools */}
        {showSidebar && (
          <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                className={`flex-1 py-3 px-4 text-center font-medium ${
                  activeSidePanel === 'examples'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                onClick={() => setActiveSidePanel('examples')}
              >
                Examples
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center font-medium ${
                  activeSidePanel === 'tools'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                onClick={() => setActiveSidePanel('tools')}
              >
                Tools
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {activeSidePanel === 'examples' ? (
                <Examples examples={examples} onSelectExample={handleSelectExample} />
              ) : (
                <div className="h-full">
                  <ToolPanel tools={selectedExample?.tools || []} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Middle code editor and output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code editor */}
          <div className="flex-1 p-4 overflow-hidden">
            <Editor 
              defaultValue={script} 
              onChange={setScript} 
              language="javascript" 
            />
          </div>
          
          {/* Output panel */}
          <div className="h-2/5 border-t border-slate-200 dark:border-slate-700">
            <Output output={output} error={error} />
          </div>
        </div>

        {/* Right sidebar with AI assistant */}
        {showAIPanel && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto flex flex-col">
            <div className="p-4 h-full">
              <AIChat 
                apiKey={apiKey} 
                onApiKeyChange={handleApiKeyChange}
                prompt={selectedExample?.aiPrompt}
                onSubmit={handleGenerateScript}
                loading={isGenerating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
