import { ExampleConfig } from '../types/Example';
// Import necessary types from nuwa-script (re-exported via services)
import type { 
  ToolSchema, 
  ToolParameter, 
  ToolFunction, 
  NuwaValue, 
  EvaluatedToolArguments 
} from '../services/nuwaInterpreter';

// --- Tool Definitions ---

// Greet Tool
const greetSchema: ToolSchema = {
  name: 'greet',
  description: 'Send a greeting to the user',
  parameters: [
    { name: 'name', type: 'string', description: 'Name to greet', required: true }
  ],
  returns: 'string' // Specify the return type
};

const greetFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const nameArg = args['name'];
  // Basic type checking (can be more robust)
  if (nameArg && nameArg.type === 'string') {
    const name = nameArg.value as string;
    const result = `Hello, ${name}! Welcome to NuwaScript.`;
    return { type: 'string', value: result };
  }
  // Handle error or unexpected type
  return { type: 'null', value: null }; // Or throw an error
};

// Add Tool
const addSchema: ToolSchema = {
  name: 'add',
  description: 'Add two numbers together',
  parameters: [
    { name: 'a', type: 'number', description: 'First number', required: true },
    { name: 'b', type: 'number', description: 'Second number', required: true }
  ],
  returns: 'number' // Specify the return type
};

const addFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const aArg = args['a'];
  const bArg = args['b'];
  // Basic type checking
  if (aArg && aArg.type === 'number' && bArg && bArg.type === 'number') {
    const a = aArg.value as number;
    const b = bArg.value as number;
    return { type: 'number', value: a + b };
  }
  // Handle error or unexpected type
  return { type: 'null', value: null }; // Or throw an error
};

// CurrentTime Tool
const currentTimeSchema: ToolSchema = {
  name: 'currentTime',
  description: 'Get the current time',
  parameters: [], // No parameters
  returns: 'string' // Specify the return type
};

const currentTimeFunc: ToolFunction = async (): Promise<NuwaValue> => {
  const result = new Date().toLocaleString();
  return { type: 'string', value: result };
};

// Export tools in a structured way for registration
export const basicTools: { schema: ToolSchema, execute: ToolFunction }[] = [
  { schema: greetSchema, execute: greetFunc },
  { schema: addSchema, execute: addFunc },
  { schema: currentTimeSchema, execute: currentTimeFunc }
];


// --- Basic Example Configuration (Keep for now, might need adjustments later) ---
const basicExample: ExampleConfig = {
  id: 'basic',
  name: 'Basic Example',
  description: 'Simple NuwaScript basics including variables, expressions, and tool calls',
  category: 'Getting Started',
  script: `// This is a simple NuwaScript example
// Declare variables
LET name = "NuwaScript"
LET x = 10
LET y = 20

// Call a tool
CALL greet(name=name)

// Call a tool with parameters
CALL add(a=x, b=y)

// Get the current time
CALL currentTime()
`,
  // Update the tools description within the example config to match ToolSchema structure
  // Note: This part might be used by UI elements like ToolPanel.
  // We keep a representation here but the actual registration uses `basicTools` above.
  tools: [
    {
      name: 'greet',
      description: 'Send a greeting to the user',
      parameters: { // Keep old format for ExampleConfig compatibility if needed by UI
        type: 'object', 
        properties: { name: { type: 'string', description: 'Name to greet' } },
        required: ['name']
      },
      returnType: 'string' 
    },
    {
      name: 'add',
      description: 'Add two numbers together',
      parameters: { 
        type: 'object', 
        properties: { 
          a: { type: 'number', description: 'First number' }, 
          b: { type: 'number', description: 'Second number' } 
        },
        required: ['a', 'b']
      },
      returnType: 'number'
    },
    {
      name: 'currentTime',
      description: 'Get the current time',
      parameters: { type: 'object', properties: {} },
      returnType: 'string'
    }
  ],
  aiPrompt: 'Please create a simple NuwaScript script that demonstrates how to use variables and tool functions.'
};

export default basicExample;