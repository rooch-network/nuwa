import { ExampleConfig } from '../types/Example';
import type { 
  ToolSchema, 
  ToolFunction, 
  NuwaValue, 
  EvaluatedToolArguments 
} from '../services/nuwaInterpreter';
import type { DrawableShape } from '../components/DrawingCanvas'; // Import shape type

// --- Shared State for Canvas --- 
// NOTE: This is a simple global state for demonstration.
// In a real app, consider Zustand, Context API, or other state management.
export let canvasShapes: DrawableShape[] = [];

// Function for React components to subscribe to changes (simple approach)
let changeListeners: (() => void)[] = [];
export const subscribeToCanvasChanges = (listener: () => void) => {
  changeListeners.push(listener);
  // Return an unsubscribe function
  return () => {
    changeListeners = changeListeners.filter(l => l !== listener);
  };
};
const notifyCanvasChange = () => {
  changeListeners.forEach(listener => listener());
};
// --- End Shared State ---\


// --- Canvas Tool Definitions ---\n
// drawLine Tool
const drawLineSchema: ToolSchema = {
  name: 'drawLine',
  description: 'Draws a line on the canvas.',
  parameters: [
    { name: 'x1', type: 'number', description: 'Starting X coordinate', required: true },
    { name: 'y1', type: 'number', description: 'Starting Y coordinate', required: true },
    { name: 'x2', type: 'number', description: 'Ending X coordinate', required: true },
    { name: 'y2', type: 'number', description: 'Ending Y coordinate', required: true },
    { name: 'color', type: 'string', description: 'Line color (e.g., \'red\', \'#00ff00\')', required: false },
    { name: 'width', type: 'number', description: 'Line width', required: false }
  ],
  returns: 'null' // This tool modifies state, doesn't return a value
};

const drawLineFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  // Helper to get number or default
  const getNum = (name: string, defaultVal: number): number => args[name]?.value as number ?? defaultVal;
  // Helper to get string or default
  const getStr = (name: string, defaultVal: string): string => args[name]?.value as string ?? defaultVal;
  
  const x1 = getNum('x1', 0);
  const y1 = getNum('y1', 0);
  const x2 = getNum('x2', 0);
  const y2 = getNum('y2', 0);
  const color = getStr('color', 'black');
  const width = getNum('width', 2);

  canvasShapes.push({ type: 'line', points: [x1, y1, x2, y2], color: color, strokeWidth: width });
  notifyCanvasChange(); // Notify listeners about the change
  return { type: 'null', value: null };
};

// drawRect Tool
const drawRectSchema: ToolSchema = {
  name: 'drawRect',
  description: 'Draws a rectangle on the canvas.',
  parameters: [
    { name: 'x', type: 'number', description: 'Top-left X coordinate', required: true },
    { name: 'y', type: 'number', description: 'Top-left Y coordinate', required: true },
    { name: 'width', type: 'number', description: 'Rectangle width', required: true },
    { name: 'height', type: 'number', description: 'Rectangle height', required: true },
    { name: 'color', type: 'string', description: 'Border color', required: false },
    { name: 'fill', type: 'string', description: 'Fill color (optional)', required: false }
  ],
  returns: 'null'
};

const drawRectFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const getNum = (name: string, defaultVal: number): number => args[name]?.value as number ?? defaultVal;
  const getStr = (name: string, defaultVal: string): string => args[name]?.value as string ?? defaultVal;
  const getStrOpt = (name: string): string | undefined => args[name]?.value as string | undefined;

  const x = getNum('x', 10);
  const y = getNum('y', 10);
  const width = getNum('width', 50);
  const height = getNum('height', 30);
  const color = getStr('color', 'black');
  const fill = getStrOpt('fill');

  canvasShapes.push({ type: 'rect', x, y, width, height, color, fill });
  notifyCanvasChange();
  return { type: 'null', value: null };
};

// drawCircle Tool
const drawCircleSchema: ToolSchema = {
  name: 'drawCircle',
  description: 'Draws a circle on the canvas.',
  parameters: [
    { name: 'x', type: 'number', description: 'Center X coordinate', required: true },
    { name: 'y', type: 'number', description: 'Center Y coordinate', required: true },
    { name: 'radius', type: 'number', description: 'Circle radius', required: true },
    { name: 'color', type: 'string', description: 'Border color', required: false },
    { name: 'fill', type: 'string', description: 'Fill color (optional)', required: false }
  ],
  returns: 'null'
};

const drawCircleFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const getNum = (name: string, defaultVal: number): number => args[name]?.value as number ?? defaultVal;
  const getStr = (name: string, defaultVal: string): string => args[name]?.value as string ?? defaultVal;
  const getStrOpt = (name: string): string | undefined => args[name]?.value as string | undefined;

  const x = getNum('x', 50);
  const y = getNum('y', 50);
  const radius = getNum('radius', 25);
  const color = getStr('color', 'black');
  const fill = getStrOpt('fill');

  canvasShapes.push({ type: 'circle', x, y, radius, color, fill });
  notifyCanvasChange();
  return { type: 'null', value: null };
};

// clearCanvas Tool
const clearCanvasSchema: ToolSchema = {
  name: 'clearCanvas',
  description: 'Clears the entire canvas.',
  parameters: [],
  returns: 'null'
};

const clearCanvasFunc: ToolFunction = async (): Promise<NuwaValue> => {
  canvasShapes = []; // Clear the global array
  notifyCanvasChange();
  return { type: 'null', value: null };
};

// Export tools
export const canvasTools: { schema: ToolSchema, execute: ToolFunction }[] = [
  { schema: drawLineSchema, execute: drawLineFunc },
  { schema: drawRectSchema, execute: drawRectFunc },
  { schema: drawCircleSchema, execute: drawCircleFunc },
  { schema: clearCanvasSchema, execute: clearCanvasFunc },
];


// --- Canvas Example Configuration ---
const canvasExample: ExampleConfig = {
  id: 'canvas',
  name: 'AI Drawing Assistant',
  description: 'Use NuwaScript tools to instruct an AI to draw on a canvas.',
  category: 'Creative',
  script: `// Ask the AI to draw something!
// Example: Draw a simple house

// Use CALL for actions that modify state
CALL clearCanvas {}

// Draw the base rectangle (house body)
CALL drawRect {x: 100, y: 150, width: 200, height: 150, color: "brown", fill: "#f5deb3"}

// Draw the roof (triangle using lines)
CALL drawLine {x1: 100, y1: 150, x2: 200, y2: 50, color: "darkred", width: 3}
CALL drawLine {x1: 300, y1: 150, x2: 200, y2: 50, color: "darkred", width: 3}
CALL drawLine {x1: 100, y1: 150, x2: 300, y2: 150, color: "darkred", width: 3} // Bottom line of roof

// Draw a door
CALL drawRect {x: 175, y: 220, width: 50, height: 80, color: "saddlebrown", fill: "#a0522d"}

// Draw a window
CALL drawCircle {x: 250, y: 200, radius: 20, color: "blue", fill: "lightblue"}

// Draw the sun
CALL drawCircle {x: 400, y: 80, radius: 40, color: "orange", fill: "yellow"}

PRINT("House drawing complete!")
`,
  // Provide tool schemas for the example config (used by AI prompt generation etc.)
  // Map ToolSchema back to the format ExampleConfig expects for UI/AI interaction
  tools: canvasTools.map(t => ({ 
      name: t.schema.name, 
      description: t.schema.description, 
      parameters: { 
          type: 'object', 
          properties: t.schema.parameters.reduce((acc, param) => { 
              acc[param.name] = { type: param.type, description: param.description || '' }; 
              return acc; 
          }, {} as Record<string, {type: string, description: string}>),
          required: t.schema.parameters.filter(p => p.required).map(p => p.name)
      },
      returnType: t.schema.returns
  })),
  aiPrompt: 'Draw a simple landscape with a blue sky, green ground, a yellow sun, and a red flower.'
};

export default canvasExample;
