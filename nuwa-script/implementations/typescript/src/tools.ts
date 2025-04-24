// import { NuwaValue } from './values.js'; // Import the runtime value type
import { Scope } from './interpreter.js'; // For ToolContext potentially
import { JsonValue } from './values.js'; // Import JsonValue

/**
 * Defines the expected type of a tool parameter or return value.
 * Using strings for now; could use an enum or type literals.
 */
export type NuwaType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object' | 'any';

/**
 * Describes a parameter expected by a tool.
 */
export interface ToolParameter {
  name: string;
  type: NuwaType;
  description?: string;
  required?: boolean; // Assume true if not specified
}

/**
 * Describes the interface (schema) of a callable tool.
 */
export interface ToolSchema {
  name: string; // The unique name used in CALL statements
  description: string;
  parameters: ToolParameter[];
  returns: NuwaType; // The type of value the tool is expected to return
}

/**
 * Defines the structure of the evaluated arguments passed to a tool function.
 * Maps parameter name to its runtime NuwaValue.
 */
export type EvaluatedToolArguments = { [key: string]: JsonValue | undefined }; // Use JsonValue

/**
 * A safer version of StateStore that can handle undefined values.
 */
export class SafeStateStore {
  private store: Map<string, JsonValue> = new Map();
  
  /**
   * Sets a value in the store, skipping undefined values
   */
  set(key: string, value: JsonValue | undefined): void {
    if (value === undefined) {
      console.warn(`Attempted to set undefined value for state key: ${key}`);
      return;
    }
    this.store.set(key, value);
  }
  
  /**
   * Gets a value from the store
   */
  get(key: string): JsonValue | undefined {
    return this.store.get(key);
  }
  
  /**
   * Checks if a key exists in the store
   */
  has(key: string): boolean {
    return this.store.has(key);
  }
  
  /**
   * Clears all values from the store
   */
  clear(): void {
    this.store.clear();
  }
  
  /**
   * Returns the size of the store
   */
  get size(): number {
    return this.store.size;
  }
  
  /**
   * Returns entries from the store
   */
  entries(): IterableIterator<[string, JsonValue]> {
    return this.store.entries();
  }
}

/**
 * Represents additional metadata associated with a state value.
 */
export interface StateMetadata {
    description?: string;
    formatter?: (value: JsonValue) => string;
    // Add other metadata like visibility, persistence hints, etc.
}

/**
 * Represents a state value bundled with its metadata, used for setting state.
 */
export interface StateValueWithMetadata {
    value: JsonValue; // Use JsonValue
    metadata: StateMetadata;
}

/**
 * Function context containing additional information like state that can be passed to tool functions.
 */
export interface ToolContext {
  setState: (key: string, value: JsonValue) => void; // Use JsonValue
  getStateValue: (key: string) => JsonValue | undefined; // Use JsonValue
  hasState: (key: string) => boolean;
  getAllState: () => Map<string, JsonValue>; // Use JsonValue
  clearState: () => void;
  // Potentially add other context info like current scope (read-only?) or user info
}

/**
 * Defines the signature for an actual tool implementation function.
 * It receives the evaluated arguments and an optional context object.
 * It can return a NuwaValue or a Promise<NuwaValue>.
 */
export type ToolFunction = (
    args: EvaluatedToolArguments,
    context: ToolContext
) => JsonValue | Promise<JsonValue>; // Use JsonValue


/**
 * Represents a registered tool, pairing its schema with its implementation.
 */
export interface RegisteredTool {
  schema: ToolSchema;
  execute: ToolFunction;
}

/**
 * Manages the registration and lookup of available tools.
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private state: Map<string, JsonValue> = new Map(); // Use JsonValue for state
  private stateMetadata: Map<string, StateMetadata> = new Map();

  /**
   * Registers a tool with its schema and implementation.
   * Throws an error if a tool with the same name is already registered.
   * @param toolName - The name of the tool (case-sensitive).
   * @param schema - The schema defining the tool's interface.
   * @param execute - The function that implements the tool's logic.
   */
  register(toolName: string, schema: ToolSchema, execute: ToolFunction): void {
    if (toolName !== schema.name) {
        throw new Error(`Tool name mismatch: registry name '${toolName}' vs schema name '${schema.name}'`);
    }
    if (this.tools.has(toolName)) {
      throw new Error(`Tool '${toolName}' is already registered.`);
    }
    this.tools.set(toolName, { schema, execute });
  }

  /**
   * Retrieves a registered tool by its name.
   * @param toolName - The name of the tool.
   * @returns The RegisteredTool object or undefined if not found.
   */
  lookup(toolName: string): RegisteredTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Retrieves the schema for a registered tool.
   * @param toolName - The name of the tool.
   * @returns The ToolSchema object or undefined if not found.
   */
  getSchema(toolName: string): ToolSchema | undefined {
    return this.tools.get(toolName)?.schema;
  }

  /**
   * Gets a list of all registered tool schemas.
   * Useful for providing context to an LLM.
   */
  getAllSchemas(): ToolSchema[] {
    return Array.from(this.tools.values()).map(tool => tool.schema);
  }

  /**
   * Checks if a tool with the given name is registered.
   */
  isRegistered(toolName: string): boolean {
      return this.tools.has(toolName);
  }

  /**
   * Gets the current state store.
   * @returns The current state store.
   */
  getState(): Map<string, JsonValue> { // Use JsonValue
    return this.state;
  }

  /**
   * Creates a tool context with the current state.
   * @returns A tool context object containing the current state.
   */
  createToolContext(): ToolContext {
    return {
      setState: this.setState.bind(this),
      getStateValue: this.getStateValue.bind(this),
      hasState: this.hasState.bind(this),
      getAllState: this.getState.bind(this),
      clearState: this.clearState.bind(this),
    };
  }

  /**
   * Sets a state value with the given key, optionally including metadata.
   * @param key - The state key.
   * @param valueOrObject - The state value or an object containing value and metadata.
   */
  setState(key: string, valueOrObject: JsonValue | StateValueWithMetadata | undefined): void {
    // Skip if undefined
    if (valueOrObject === undefined) {
      console.warn(`Attempted to set undefined value for state key: ${key}`);
      return;
    }
    
    // Check if the valueOrObject is a StateValueWithMetadata by testing for value property
    if (valueOrObject !== null && 
        typeof valueOrObject === 'object' && 
        'value' in valueOrObject &&
        (valueOrObject as any).metadata !== undefined) {
      // If provided with a StateValueWithMetadata, extract value and metadata
      const { value, metadata } = valueOrObject as StateValueWithMetadata;
      this.state.set(key, value);
      
      // If metadata is provided, register it
      if (metadata) {
        this.stateMetadata.set(key, metadata);
      }
    } else {
      // Handle as direct JsonValue
      this.state.set(key, valueOrObject as JsonValue);
    }
  }

  /**
   * Gets a state value by key.
   * @param key - The state key.
   * @returns The state value or undefined if not found.
   */
  getStateValue(key: string): JsonValue | undefined { // Use JsonValue
    return this.state.get(key);
  }

  /**
   * Checks if a state value exists.
   * @param key - The state key.
   * @returns True if the state value exists, false otherwise.
   */
  hasState(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Clears all state values.
   */
  clearState(): void {
    this.state.clear();
    this.stateMetadata.clear();
  }

  /**
   * Registers metadata for a state key.
   * @param key - The state key.
   * @param metadata - The metadata to register.
   */
  registerStateMetadata(key: string, metadata: StateMetadata): void {
    this.stateMetadata.set(key, metadata);
  }

  /**
   * Formats the current state as a string for inclusion in prompts.
   * @returns A formatted string representation of the current state.
   */
  formatStateForPrompt(): string {
    if (this.state.size === 0) {
      return "No state information available.";
    }

    const entries = Array.from(this.state.entries());
    return entries.map(([key, value]) => {
      const metadata = this.stateMetadata.get(key);
      
      // If metadata exists, use it for formatting
      if (metadata) {
        const formattedValue = metadata.formatter 
          ? metadata.formatter(value) 
          : this.defaultFormatter(key, value);
        return `${key}: ${formattedValue} - ${metadata.description}`;
      }
      
      // Default formatting without metadata
      return `${key}: ${this.defaultFormatter(key, value)}`;
    }).join('\n');
  }

  /**
   * Default formatter for state values based on key patterns.
   * @param key - The state key.
   * @param value - The state value.
   * @returns Formatted value string.
   */
  private defaultFormatter(key: string, value: JsonValue): string {
    // Handle timestamps
    if (key.endsWith('_time') && typeof value === 'number') {
      const date = new Date(value);
      return `${JSON.stringify(value)} (${date.toISOString()})`;
    }
    
    return JSON.stringify(value);
  }
}
