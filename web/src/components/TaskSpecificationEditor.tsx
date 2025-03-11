import React, { useState } from 'react';
import { TaskSpecification } from '../types/task';
import { createEmptyTaskSpec } from '../utils/task';
import { TaskSpecForm } from './TaskSpecForm';

interface TaskSpecificationEditorProps {
  taskSpecs: TaskSpecification[];
  onSave: (specs: TaskSpecification[]) => void;
  onCancel: () => void;
}

export function TaskSpecificationEditor({ 
  taskSpecs, 
  onSave, 
  onCancel 
}: TaskSpecificationEditorProps) {
  const [specs, setSpecs] = useState(taskSpecs);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const toggleEditMode = () => setJsonMode(!jsonMode);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={toggleEditMode}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Switch to {jsonMode ? 'Form' : 'JSON'} Mode
        </button>
      </div>

      {jsonMode ? (
        <div>
          <textarea
            className="w-full h-96 font-mono text-sm p-4 border rounded"
            value={JSON.stringify(specs, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setSpecs(parsed);
                setJsonError(null);
              } catch (error) {
                if (error instanceof Error) {
                  setJsonError(error.message);
                } else {
                  setJsonError('Invalid JSON format');
                }
              }
            }}
          />
          {jsonError && (
            <p className="text-red-500 text-sm mt-2">{jsonError}</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {specs.map((spec, index) => (
            <TaskSpecForm
              key={index}
              spec={spec}
              onChange={(updated) => {
                const newSpecs = [...specs];
                newSpecs[index] = updated;
                setSpecs(newSpecs);
              }}
              onRemove={() => {
                const newSpecs = specs.filter((_, i) => i !== index);
                setSpecs(newSpecs);
              }}
            />
          ))}
          
          <button
            onClick={() => {
              setSpecs([...specs, createEmptyTaskSpec()]);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            + Add Task Specification
          </button>
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-4">
        <button
          onClick={() => onCancel()}
          className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(specs)}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
