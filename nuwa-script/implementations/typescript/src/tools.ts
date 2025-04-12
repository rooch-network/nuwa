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
 * Defines the signature for an actual tool implementation function.
 * It receives the evaluated arguments and should return a NuwaValue or a Promise<NuwaValue>.
 * It can optionally receive context (e.g., interpreter state, API keys).
 */
export type ToolFunction = (
    args: EvaluatedToolArguments,
    // context?: any // Optional context object
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
}
