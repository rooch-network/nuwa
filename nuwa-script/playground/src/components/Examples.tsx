import React, { useState } from 'react';

interface ExampleScript {
  name: string;
  description: string;
  code: string;
}

interface ExamplesProps {
  examples: ExampleScript[];
  onSelect: (code: string) => void;
}

const Examples: React.FC<ExamplesProps> = ({ examples, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExamples = examples.filter(
    (example) =>
      example.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
          placeholder="Search examples..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredExamples.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 p-4 text-center">
          <div>
            <p>No examples found matching "{searchQuery}"</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 p-2">
            {filteredExamples.map((example) => (
              <div
                key={example.name}
                className="p-3 hover:bg-gray-50 border border-gray-200 hover:border-brand-primary rounded-lg cursor-pointer transition-all duration-200"
                onClick={() => onSelect(example.code)}
              >
                <h3 className="font-medium text-sm text-gray-800 mb-1">
                  {example.name}
                </h3>
                <p className="text-xs text-gray-600 mb-2">
                  {example.description}
                </p>
                <div className="text-xs text-brand-primary font-medium flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  Load example
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Examples;