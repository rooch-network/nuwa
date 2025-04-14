import React, { useState, useRef, useEffect } from 'react';

interface AIChatProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: Array<{ role: string; content: string }>;
  isProcessing: boolean;
}

const AIChat: React.FC<AIChatProps> = ({ onSendMessage, messages, isProcessing }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      const message = input;
      setInput('');
      await onSendMessage(message);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full flex flex-col rounded-md border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-base font-medium text-slate-700 dark:text-slate-200">AI Assistant</h3>
        </div>
        <div className="flex items-center">
          {isProcessing && (
            <span className="flex items-center text-xs text-purple-700 dark:text-purple-400 animate-pulse">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              Thinking...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 animate-fadeIn">
            <svg className="h-16 w-16 mb-4 opacity-70 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
            <h4 className="font-medium text-lg mb-2 text-slate-700 dark:text-slate-300">Welcome to NuwaScript AI Assistant</h4>
            <p className="mb-2">Enter your OpenAI API key to get started</p>
            <p className="text-xs max-w-sm opacity-75">If you don't have an API key, you can get one from the <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">OpenAI platform</a></p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${index === messages.length - 1 ? 'animate-fadeIn' : ''}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 message-bubble shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : message.role === 'system'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {message.role === 'user' 
                    ? 'You' 
                    : message.role === 'system' 
                      ? 'System' 
                      : 'AI Assistant'}
                </div>
                <div className="text-sm whitespace-pre-wrap prose dark:prose-invert max-w-none">
                  {message.content.includes('```') 
                    ? formatWithCodeBlocks(message.content)
                    : message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 ? "Enter OpenAI API key (sk-...)" : "Type your question..."}
            disabled={isProcessing}
            className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-60 text-sm shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function: Format messages containing code blocks
function formatWithCodeBlocks(content: string) {
  const segments = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <>
      {segments.map((segment, i) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          // Extract language and code
          const match = segment.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match?.[1] || '';
          const code = match?.[2] || segment.slice(3, -3);
          
          return (
            <div key={i} className="my-2 rounded-md overflow-hidden bg-slate-800 text-slate-200 dark:bg-slate-900">
              {language && (
                <div className="px-4 py-1 bg-slate-700 dark:bg-slate-800 text-xs font-mono">
                  {language}
                </div>
              )}
              <pre className="p-4 text-xs overflow-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        } else {
          return <span key={i}>{segment}</span>;
        }
      })}
    </>
  );
}

export default AIChat;