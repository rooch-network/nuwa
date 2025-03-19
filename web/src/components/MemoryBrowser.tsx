import { useState } from 'react';
import { Memory} from '../types/agent';
import { formatTimestamp } from '../utils/time';

interface MemoryBrowserProps {
  memories: Memory[];
}

export function MemoryBrowser({ memories }: MemoryBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter memories by search term
  const filteredMemories = memories.filter(memory => {
    return searchTerm === '' || memory.content.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Sort memories by timestamp
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    return sortOrder === 'newest' 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search memories..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {sortedMemories.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No memories found matching your criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMemories.map((memory) => (
            <div 
              key={memory.index} 
              className="p-4 bg-white border border-gray-200 rounded-md shadow-sm"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">
                  {formatTimestamp(memory.timestamp)}
                </span>
              </div>
              <p className="mt-2 text-gray-700">{memory.content}</p>
              <div className="mt-2 text-xs text-gray-500">
                Memory #{memory.index}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
