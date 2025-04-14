import React from 'react';

interface OutputProps {
  output: string;
  error: string | null;
  loading: boolean;
  onClear?: () => void;
}

const Output: React.FC<OutputProps> = ({ output, error, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 output-section">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500 mb-3"></div>
        <p>Executing script...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-3 output-section">
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium text-red-800">Error</span>
          </div>
          <pre className="whitespace-pre-wrap text-red-700 font-mono text-xs p-2 bg-red-100 rounded overflow-auto">
            {error}
          </pre>
        </div>
      </div>
    );
  }
  
  if (output) {
    return (
      <div className="p-3 output-section">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-white p-3 rounded-md border border-gray-200 overflow-auto">
          {output}
        </pre>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center output-section">
      <svg className="h-12 w-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
      </svg>
      <p>Run your code to see output here</p>
      <p className="text-xs mt-2 max-w-sm">Press the "Run" button above to execute your NuwaScript code</p>
    </div>
  );
};

export default Output;