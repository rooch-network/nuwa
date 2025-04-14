// Import everything directly from the nuwa-script package (assuming ESM exports now work)
import { 
    Interpreter, 
    ToolRegistry, 
    ToolSchema, 
    ToolParameter, 
    ToolFunction, 
    NuwaValue, 
    EvaluatedToolArguments,
    OutputHandler,
    Scope,
    parse, // Added import for parse function
    AST // Added import for AST namespace
} from 'nuwa-script';

// Define the Interpreter instance type - Removed as not needed
// type NuwaInterpreterInstance = InstanceType<typeof Interpreter>;

// Helper type for interpreter creation result
export interface NuwaInterface {
  interpreter: Interpreter; // Use the imported class directly
  outputBuffer: string[];
  toolRegistry: ToolRegistry; // Use the imported class directly
}

// Factory function to create and configure a NuwaScript interpreter
export function createInterpreter(): NuwaInterface {
  // Instantiate directly from imports
  const toolRegistry = new ToolRegistry(); 
  const outputBuffer: string[] = [];
  
  // Define the output handler using the imported type
  const outputHandler: OutputHandler = (message) => { 
    outputBuffer.push(message);
  };

  // Create the interpreter instance
  const interpreter = new Interpreter(toolRegistry, outputHandler);

  return {
    interpreter,
    outputBuffer,
    toolRegistry,
  };
} 

// Re-export classes/values
export { 
    Interpreter, 
    ToolRegistry, 
    parse // Re-export the parse function
}; 

// Re-export types
export type { 
    ToolSchema, 
    ToolParameter, 
    ToolFunction, 
    NuwaValue, 
    EvaluatedToolArguments, 
    OutputHandler, 
    Scope,
    Interpreter as InterpreterType, 
    ToolRegistry as ToolRegistryType,
    AST // Re-export the AST namespace type
}; 

// Remove debug logs
// console.log(...); 