declare module 'nuwa-script' {
  export type NuwaType = 'string' | 'number' | 'boolean' | 'null' | 'list' | 'object' | 'any';
  
  export interface NuwaValue {
    type: NuwaType;
    value: string | number | boolean | null | Record<string, unknown> | unknown[] | unknown;
  }
  
  export interface ToolParameter {
    name: string;
    type: NuwaType;
    description?: string;
    required?: boolean;
  }
  
  export interface ToolSchema {
    name: string;
    description: string;
    parameters: ToolParameter[];
    returns: NuwaType;
  }
  
  export type EvaluatedToolArguments = Record<string, NuwaValue>;
  
  export type ToolFunction = (args: EvaluatedToolArguments) => any | Promise<any>;
  
  export interface RegisteredTool {
    schema: ToolSchema;
    execute: ToolFunction;
  }
  
  export class ToolRegistry {
    register(toolName: string, schema: ToolSchema, execute: ToolFunction): void;
    lookup(toolName: string): RegisteredTool | undefined;
    getSchema(toolName: string): ToolSchema | undefined;
    getAllSchemas(): ToolSchema[];
    isRegistered(toolName: string): boolean;
  }
  
  export type Scope = Map<string, NuwaValue>;
  export type OutputHandler = (output: string) => void;
  
  export interface Script {
    type: 'Script';
    statements: Array<Record<string, unknown>>;
  }
  
  export class Interpreter {
    constructor(toolRegistry?: ToolRegistry, outputHandler?: OutputHandler);
    
    /**
     * Executes a NuwaScript script string.
     * Parses the script and executes it.
     */
    execute(scriptText: string): Promise<Scope>;
    
    /**
     * Sets the output handler function.
     */
    setOutputHandler(handler: OutputHandler): void;
    
    /**
     * Registers a tool with the interpreter.
     */
    registerTool(toolName: string, description: string, parameters: Record<string, {type: string, description?: string, required?: boolean}>, returns: string, execute: ToolFunction): void;
  }
} 