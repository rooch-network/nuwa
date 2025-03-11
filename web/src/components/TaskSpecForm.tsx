import React from 'react';
import { TaskSpecification, TaskArgument } from '../types/task';
import { createEmptyTaskArgument } from '../utils/task';

interface TaskSpecFormProps {
  spec: TaskSpecification;
  onChange: (spec: TaskSpecification) => void;
  onRemove: () => void;
}

export function TaskSpecForm({ spec, onChange, onRemove }: TaskSpecFormProps) {
  const handleArgumentChange = (index: number, field: keyof TaskArgument, value: string | boolean) => {
    const newArgs = [...spec.arguments];
    newArgs[index] = { ...newArgs[index], [field]: value };
    onChange({ ...spec, arguments: newArgs });
  };

  const removeArgument = (index: number) => {
    const newArgs = spec.arguments.filter((_, i) => i !== index);
    onChange({ ...spec, arguments: newArgs });
  };

  const addArgument = () => {
    onChange({
      ...spec,
      arguments: [...spec.arguments, createEmptyTaskArgument()],
    });
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium">Task Specification</h3>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          Remove
        </button>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={spec.name}
            onChange={(e) => onChange({ ...spec, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="task::your_task_name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={spec.description}
            onChange={(e) => onChange({ ...spec, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Arguments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arguments
          </label>
          <div className="space-y-2">
            {spec.arguments.map((arg, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={arg.name}
                  onChange={(e) => handleArgumentChange(index, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <select
                  value={arg.type_desc}
                  onChange={(e) => handleArgumentChange(index, 'type_desc', e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
                <input
                  type="text"
                  value={arg.description}
                  onChange={(e) => handleArgumentChange(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <input
                  type="checkbox"
                  checked={arg.required}
                  onChange={(e) => handleArgumentChange(index, 'required', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeArgument(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addArgument}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Argument
            </button>
          </div>
        </div>

        {/* Resolver */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Resolver Address
          </label>
          <input
            type="text"
            value={spec.resolver}
            onChange={(e) => onChange({ ...spec, resolver: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* On-chain */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={spec.on_chain}
              onChange={(e) => onChange({ ...spec, on_chain: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">On-chain Task</span>
          </label>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Price (RGas)
          </label>
          <input
            type="text"
            value={spec.price}
            onChange={(e) => onChange({ ...spec, price: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
