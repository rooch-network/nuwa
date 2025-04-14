import { ExampleConfig } from '../types/Example';
import { Tool } from '../services/interpreter';

// Tool implementations for basic example
export const tools: Tool[] = [
  {
    name: 'greet',
    description: 'Send a greeting to the user',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet'
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { name } = args;
      return `Hello, ${name}! Welcome to NuwaScript.`;
    }
  },
  {
    name: 'add',
    description: 'Add two numbers together',
    parameters: {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          description: 'First number'
        },
        b: {
          type: 'number',
          description: 'Second number'
        }
      },
      required: ['a', 'b']
    },
    handler: async (args) => {
      const { a, b } = args;
      return Number(a) + Number(b);
    }
  },
  {
    name: 'currentTime',
    description: 'Get the current time',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      return new Date().toLocaleString();
    }
  }
];

// Basic example configuration
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
  tools: [
    {
      name: 'greet',
      description: 'Send a greeting to the user',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name to greet'
          }
        },
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
          a: {
            type: 'number',
            description: 'First number'
          },
          b: {
            type: 'number',
            description: 'Second number'
          }
        },
        required: ['a', 'b']
      },
      returnType: 'number'
    },
    {
      name: 'currentTime',
      description: 'Get the current time',
      parameters: {
        type: 'object',
        properties: {}
      },
      returnType: 'string'
    }
  ],
  aiPrompt: 'Please create a simple NuwaScript script that demonstrates how to use variables and tool functions.'
};

export default basicExample;