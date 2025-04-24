import { Scope } from './interpreter.js'; // For ToolContext potentially
import { JsonValue } from './values.js'; // Import JsonValue
import { JSONSchema7, JSONSchema7Definition } from 'json-schema'; // Import JSON Schema types
import { z } from 'zod'; // Import zod for SchemaInput
import zodToJsonSchema from 'zod-to-json-schema'; // Ensure this import is present

/**
 * Describes the input interface (schema) of a callable tool, allowing definition
 * using either Zod or JSON Schema.
 */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: SchemaInput;
  returns: { description?: string; schema: SchemaInput; };
}

/**
 * Defines the structure of the evaluated arguments passed to a tool function.
 * Maps parameter name to its runtime JsonValue.
 * The interpreter is responsible for validating this against the NormalizedToolSchema.parameters.
 */
export type EvaluatedToolArguments = { [key: string]: JsonValue | undefined };

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
    value: JsonValue;
    metadata: StateMetadata;
}

/**
 * Function context containing additional information like state that can be passed to tool functions.
 */
export interface ToolContext {
  setState: (key: string, value: JsonValue | StateValueWithMetadata | undefined) => void;
  getStateValue: (key: string) => JsonValue | undefined;
  hasState: (key: string) => boolean;
  getAllState: () => Map<string, JsonValue>;
  clearState: () => void;
  // Potentially add other context info like current scope (read-only?) or user info
}

/**
 * Defines the signature for an actual tool implementation function.
 * Receives evaluated arguments. Tool implementations should be self-contained
 * or use external mechanisms if they need access to broader state.
 */
export type ToolFunction = (
    args: EvaluatedToolArguments
) => JsonValue | Promise<JsonValue>;


/**
 * Represents a registered tool internally, pairing its *normalized* JSON schema
 * with its implementation.
 */
export interface RegisteredTool {
  schema: NormalizedToolSchema;
  execute: ToolFunction;
}

/**
 * Manages the registration and lookup of available tools.
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private state: Map<string, JsonValue> = new Map();
  private stateMetadata: Map<string, StateMetadata> = new Map();

  /**
   * Registers a tool, providing type inference for the execute function's arguments
   * when Zod schemas are used for parameters.
   * The execute function no longer receives ToolContext.
   */
  register<
    ParamSchema extends SchemaInput,
    ReturnSchema extends SchemaInput
  >(
    toolInput: {
      name: string;
      description: string;
      parameters: ParamSchema;
      returns: {
        description?: string;
        schema: ReturnSchema;
      };
    },
    execute: (
      args: ParamSchema extends z.ZodTypeAny ? z.infer<ParamSchema> : EvaluatedToolArguments
    ) =>
      | (ReturnSchema extends z.ZodTypeAny ? z.infer<ReturnSchema> : JsonValue)
      | Promise<ReturnSchema extends z.ZodTypeAny ? z.infer<ReturnSchema> : JsonValue>
  ): void {
    const toolName = toolInput.name;
    if (this.tools.has(toolName)) { throw new Error(`Tool '${toolName}' is already registered.`); }

    const toolSchema: ToolSchema = {
      name: toolInput.name,
      description: toolInput.description,
      parameters: toolInput.parameters,
      returns: toolInput.returns,
    };

    try {
      const normalizedParamsSchema = normalizeSchemaToJsonSchema(
        toolSchema.parameters, 'parameters', toolName, true
      );
      const normalizedReturnsSchema = normalizeSchemaToJsonSchema(
        toolSchema.returns.schema, 'returns.schema', toolName, false
      );
      const normalizedSchema: NormalizedToolSchema = {
        name: toolName,
        description: toolSchema.description,
        parameters: normalizedParamsSchema as NormalizedToolSchema['parameters'],
        returns: {
          description: toolSchema.returns.description,
          schema: normalizedReturnsSchema,
        },
      };

      // --- Storage ---
      // Cast to the updated ToolFunction type (without context)
      // Use 'unknown' intermediary cast to satisfy the type checker
      this.tools.set(toolName, { schema: normalizedSchema, execute: execute as unknown as ToolFunction });

    } catch (error: any) { throw new Error(`Failed to register tool '${toolName}': ${error.message}`); }
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
   * @returns The ToolSchema object (with JSON Schema) or undefined if not found.
   */
  getSchema(toolName: string): NormalizedToolSchema | undefined {
    return this.tools.get(toolName)?.schema;
  }

  /**
   * Gets a list of all registered tool schemas.
   * Useful for providing context to an LLM.
   */
  getAllSchemas(): NormalizedToolSchema[] {
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
  getState(): Map<string, JsonValue> {
    return this.state;
  }

  /**
   * Creates a tool context with access to the state management methods.
   * @returns A tool context object.
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
   * Handles both direct value and StateValueWithMetadata object.
   * @param key - The state key.
   * @param valueOrObject - The state value (JsonValue) or an object containing value and metadata, or undefined.
   */
  setState(key: string, valueOrObject: JsonValue | StateValueWithMetadata | undefined): void {
    if (valueOrObject === undefined) {
      console.warn(`Attempted to set undefined value for state key: ${key}`);
      return;
    }

    if (typeof valueOrObject === 'object' &&
        valueOrObject !== null &&
        'value' in valueOrObject &&
        'metadata' in valueOrObject &&
        typeof (valueOrObject as any).metadata === 'object') {
      const { value, metadata } = valueOrObject as StateValueWithMetadata;

      if (value === undefined) {
        console.warn(`Attempted to set state key '${key}' with undefined value inside StateValueWithMetadata.`);
        return;
      }
      this.state.set(key, value);

      if (metadata) {
        this.stateMetadata.set(key, metadata);
      } else {
        this.stateMetadata.delete(key);
      }
    } else {
      this.state.set(key, valueOrObject as JsonValue);
    }
  }

  /**
   * Gets a state value by key.
   * @param key - The state key.
   * @returns The state value or undefined if not found.
   */
  getStateValue(key: string): JsonValue | undefined {
    return this.state.get(key);
  }

  /**
   * Gets the metadata associated with a state key.
   * @param key The state key.
   * @returns The StateMetadata or undefined if not found.
   */
  getStateMetadata(key: string): StateMetadata | undefined {
    return this.stateMetadata.get(key);
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
   * Clears all state values and their metadata.
   */
  clearState(): void {
    this.state.clear();
    this.stateMetadata.clear();
  }

  /**
   * Registers metadata for a state key without setting the value.
   * If state for the key doesn't exist, it won't be created here.
   * @param key - The state key.
   * @param metadata - The metadata to register.
   */
  registerStateMetadata(key: string, metadata: StateMetadata): void {
    this.stateMetadata.set(key, metadata);
  }

  /**
   * Formats the current state as a string for inclusion in prompts.
   * Uses registered metadata for descriptions and formatting where available.
   * @returns A formatted string representation of the current state.
   */
  formatStateForPrompt(): string {
    if (this.state.size === 0) {
      return "No state information available.";
    }

    const entries = Array.from(this.state.entries());
    return entries.map(([key, value]) => {
      const metadata = this.stateMetadata.get(key);
      let descriptionPart = '';
      let formattedValue: string;

      if (metadata) {
          descriptionPart = metadata.description ? ` (${metadata.description})` : '';
          formattedValue = metadata.formatter
              ? metadata.formatter(value)
              : this.defaultFormatter(key, value);
      } else {
          formattedValue = this.defaultFormatter(key, value);
      }

      return `${key}: ${formattedValue}${descriptionPart}`;
    }).join('\n');
  }

  /**
   * Default formatter for state values based on key patterns or type.
   * @param key - The state key.
   * @param value - The state value.
   * @returns Formatted value string.
   */
  private defaultFormatter(key: string, value: JsonValue): string {
    if ((key.toLowerCase().includes('time') || key.toLowerCase().includes('date')) && typeof value === 'number') {
      if (value > 1000000000 && value < 99999999999999) {
         try {
           const date = new Date(value);
           if (!isNaN(date.getTime())) {
              return `${JSON.stringify(value)} (${date.toISOString()})`;
           }
         } catch (e) {
            // Ignore errors if it's not a valid date
         }
      }
    }

    try {
        if (typeof value === 'object' && value !== null) {
            const str = JSON.stringify(value);
            if (str.length > 200) {
                return `${str.substring(0, 197)}...`;
            }
            return JSON.stringify(value, null, 2);
        }
        return JSON.stringify(value);
    } catch (e) {
        return "[Unserializable Value]";
    }
  }
}

// --- Input Schema Definition ---

/**
 * Represents a schema definition that can be either a Zod schema
 * or a standard JSON Schema definition object.
 */
export type SchemaInput = z.ZodTypeAny | JSONSchema7Definition;

// --- Normalized Internal Schema ---

/**
 * Represents the tool schema after normalization, always using JSON Schema 7.
 * This is the format used internally by the registry and potentially passed to LLMs.
 */
export interface NormalizedToolSchema {
  name: string;
  description: string;
  parameters: JSONSchema7 & { type: 'object'; properties?: { [key: string]: JSONSchema7Definition }; };
  returns: { description?: string; schema: JSONSchema7Definition; };
}

/**
 * Normalizes a Zod schema or JSON Schema definition into a valid JSONSchema7Definition.
 * Handles boolean schemas and ensures object properties are accessed safely.
 * @param schemaInput The Zod schema or JSON Schema object/boolean.
 * @param schemaName The name of the schema (e.g., 'parameters', 'returns') for error messages.
 * @param toolName The name of the tool for error messages.
 * @param expectObject If true, ensures the output is a valid JSON Schema object.
 * @returns The normalized JSONSchema7Definition.
 * @throws Error if the input is invalid or normalization fails.
 */
export function normalizeSchemaToJsonSchema(
    schemaInput: SchemaInput,
    schemaName: string,
    toolName: string,
    expectObject: boolean
): JSONSchema7Definition {
    let jsonSchema: JSONSchema7Definition;

    if (schemaInput instanceof z.ZodType) {
        try {
            const converted = zodToJsonSchema(schemaInput, { target: 'jsonSchema7', $refStrategy: 'none', definitionPath: 'definitions' }) as any;
            const { $schema, definitions, ...rest } = converted;

             if (Object.keys(rest).length === 0 && definitions && typeof definitions === 'object' && Object.keys(definitions).length === 1) {
                 const defKey = Object.keys(definitions)[0];
                 if (defKey !== undefined) {
                    jsonSchema = definitions[defKey];
                 } else {
                     jsonSchema = rest;
                 }
             } else {
                 jsonSchema = rest;
             }

            if (typeof jsonSchema === 'object' && jsonSchema !== null) {
                 if (schemaInput.description && !jsonSchema.description) {
                    jsonSchema.description = schemaInput.description;
                }
                if (!jsonSchema.type && jsonSchema.properties) {
                    jsonSchema.type = 'object';
                }
            } else if (typeof jsonSchema !== 'boolean') {
                // If it's not an object or boolean after conversion, treat as error or default?
                // zod-to-json-schema should produce valid JSON Schema or throw.
                 // For now, assume it's valid if no error thrown.
            }

        } catch (error: any) {
             throw new Error(`Failed to convert Zod schema '${schemaName}' for tool '${toolName}': ${error.message}`);
         }
    } else if (typeof schemaInput === 'object' || typeof schemaInput === 'boolean') {
         if (typeof schemaInput === 'object' && schemaInput !== null) {
            jsonSchema = { ...schemaInput };
            delete (jsonSchema as any).$schema;
        } else {
            jsonSchema = schemaInput;
        }
    } else {
        throw new Error(`Invalid schema format for '${schemaName}' of tool '${toolName}'. Expected Zod schema, JSON Schema object, or boolean.`);
    }

    // --- Enforce object type if required (for parameters) --- 
    if (expectObject) {
        let finalObjectSchema: JSONSchema7 & { type: 'object'; properties?: { [key: string]: JSONSchema7Definition }; };

        if (typeof jsonSchema === 'object' && jsonSchema !== null && jsonSchema.type === 'object') {
             finalObjectSchema = jsonSchema as typeof finalObjectSchema;
        } else if (typeof jsonSchema === 'object' && jsonSchema !== null && !jsonSchema.type && jsonSchema.properties) {
             finalObjectSchema = { ...jsonSchema, type: 'object' } as typeof finalObjectSchema;
        } else if (jsonSchema === true || (typeof jsonSchema === 'object' && jsonSchema !== null && Object.keys(jsonSchema).length === 0)) {
             finalObjectSchema = { type: 'object', properties: {} };
        } else {
            throw new Error(`Tool parameters schema for '${toolName}' must resolve to type 'object'. Received: ${JSON.stringify(jsonSchema)}`);
        }

        if (!finalObjectSchema.properties) {
            finalObjectSchema.properties = {};
        }
        return finalObjectSchema;
    }

    return jsonSchema;
}

// ... rest of file ...
