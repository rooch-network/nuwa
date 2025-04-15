import { ToolSchema } from '../services/nuwaInterpreter';

// Component state management interfaces
export interface ComponentStateManager<T = any> {
  // Get current state
  getState(): T;
  
  // Subscribe to state changes
  subscribe(listener: () => void): () => void;
  
  // Update state in registry for AI
  updateStateInRegistry(context?: any): void;
}

export interface ExampleConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  script: string;
  tools: ToolSchema[];
  aiPrompt?: string;
  tags?: string[];
  componentId?: string;
  // Optional state manager for the component
  stateManager?: ComponentStateManager;
}