import React from 'react';

interface OutputProps {
  output: string;
  error: string | null;
  loading: boolean;
  onClear: () => void;
}

const Output: React.FC<OutputProps> = ({ output, error, loading, onClear }) => {
  return (
    <div className="h-full flex flex-col rounded-md border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center">
          <svg className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Execution Output</h3>
        </div>
        <div className="flex space-x-2">
          {(output || error) && (
            <button
              onClick={onClear}
              className="text-xs flex items-center px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
            >
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-3"></div>
            <p>Executing script...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md p-3 text-sm">
            <div className="flex items-center mb-2">
              <svg className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="font-medium text-red-800 dark:text-red-300">Error</span>
            </div>
            <pre className="whitespace-pre-wrap text-red-700 dark:text-red-300 font-mono text-xs p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">
              {error}
            </pre>
          </div>
        ) : output ? (
          <div>
            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 overflow-auto">
              {output}
            </pre>
            <div className="mt-2 text-xs text-right text-slate-500 dark:text-slate-400">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-4 text-center">
            <svg className="h-12 w-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <p>Run your code to see output here</p>
            <p className="text-xs mt-2 max-w-sm">Press the "Run" button above to execute your NuwaScript code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Output;