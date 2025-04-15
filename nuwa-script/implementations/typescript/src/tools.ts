import { NuwaValue } from './values'; // Import the runtime value type

/**
 * Defines the expected type of a tool parameter or return value.
 * Using strings for now; could use an enum or type literals.
 */
export type NuwaType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'list' // Represents NuwaValue[]
  | 'object' // Represents NuwaObject
  | 'any'; // Represents any NuwaValue

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
export type EvaluatedToolArguments = Record<string, NuwaValue>;

/**
 * Defines a type for storing state information.
 * Maps a state key to its value.
 */
export type StateStore = Map<string, NuwaValue>;

/**
 * A safer version of StateStore that can handle undefined values.
 */
export class SafeStateStore {
  private store: Map<string, NuwaValue> = new Map();
  
  /**
   * Sets a value in the store, skipping undefined values
   */
  set(key: string, value: NuwaValue | undefined): void {
    if (value === undefined) {
      console.warn(`Attempted to set undefined value for state key: ${key}`);
      return;
    }
    this.store.set(key, value);
  }
  
  /**
   * Gets a value from the store
   */
  get(key: string): NuwaValue | undefined {
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
  entries(): IterableIterator<[string, NuwaValue]> {
    return this.store.entries();
  }
}

/**
 * Defines metadata for state values, providing description and formatting capabilities.
 */
export interface StateMetadata {
  /**
   * Description of the state value, explaining its meaning and purpose.
   */
  description: string;
  
  /**
   * Optional formatter function to convert the state value to a more readable string.
   */
  formatter?: (value: NuwaValue) => string;
}

/**
 * Extended state value with optional metadata.
 * This is a separate structure and not meant to be stored directly in the StateStore.
 */
export interface StateValueWithMetadata {
  /**
   * The actual state value to be stored.
   */
  value: NuwaValue;
  
  /**
   * Optional metadata for the state value.
   * This is stored separately and not as part of the state value.
   */
  metadata?: StateMetadata;
}

/**
 * Function context containing additional information like state that can be passed to tool functions.
 */
export interface ToolContext {
  state: StateStore;
}

/**
 * Defines the signature for an actual tool implementation function.
 * It receives the evaluated arguments and an optional context object.
 * It can return a NuwaValue or a Promise<NuwaValue>.
 */
export type ToolFunction = (
    args: EvaluatedToolArguments,
    context?: ToolContext
) => NuwaValue | Promise<NuwaValue>;


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
  private stateStore: StateStore = new Map();
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
  getState(): StateStore {
    return this.stateStore;
  }

  /**
   * Creates a tool context with the current state.
   * @returns A tool context object containing the current state.
   */
  createToolContext(): ToolContext {
    return {
      state: this.stateStore
    };
  }

  /**
   * Sets a state value with the given key, optionally including metadata.
   * @param key - The state key.
   * @param valueOrObject - The state value or an object containing value and metadata.
   */
  setState(key: string, valueOrObject: NuwaValue | StateValueWithMetadata | undefined): void {
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
      this.stateStore.set(key, value);
      
      // If metadata is provided, register it
      if (metadata) {
        this.stateMetadata.set(key, metadata);
      }
    } else {
      // Handle as direct NuwaValue
      this.stateStore.set(key, valueOrObject as NuwaValue);
    }
  }

  /**
   * Gets a state value by key.
   * @param key - The state key.
   * @returns The state value or undefined if not found.
   */
  getStateValue(key: string): NuwaValue | undefined {
    return this.stateStore.get(key);
  }

  /**
   * Checks if a state value exists.
   * @param key - The state key.
   * @returns True if the state value exists, false otherwise.
   */
  hasState(key: string): boolean {
    return this.stateStore.has(key);
  }

  /**
   * Clears all state values.
   */
  clearState(): void {
    this.stateStore.clear();
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
    if (this.stateStore.size === 0) {
      return "No state information available.";
    }

    const entries = Array.from(this.stateStore.entries());
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
  private defaultFormatter(key: string, value: NuwaValue): string {
    // Handle timestamps
    if (key.endsWith('_time') && typeof value === 'number') {
      const date = new Date(value);
      return `${JSON.stringify(value)} (${date.toISOString()})`;
    }
    
    return JSON.stringify(value);
  }
}
