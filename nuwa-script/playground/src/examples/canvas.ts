import { ExampleConfig } from '../types/Example';
import type { 
  ToolSchema, 
  ToolFunction, 
  // NuwaValue, // Removed unused import
  EvaluatedToolArguments 
} from '../services/nuwaInterpreter';
import type { DrawableShape } from '../components/DrawingCanvas'; // Keep this import

// --- Shared State for Canvas --- 
// NOTE: This is a simple global state for demonstration.
// In a real app, consider Zustand, Context API, or other state management.
export const canvasShapes: DrawableShape[] = [];

// Function for React components to subscribe to changes (simple approach)
let changeListeners: (() => void)[] = [];
export const subscribeToCanvasChanges = (listener: () => void): (() => void) => {
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


// --- Canvas Tool Definitions ---

// Helper function to determine the Nuwa type string from a JavaScript value
const getActualNuwaType = (value: unknown): string => {
    if (value === null) return 'null';
    const jsType = typeof value;
    if (jsType === 'object') {
        return Array.isArray(value) ? 'list' : 'object';
    }
    // Handles string, number, boolean, undefined, bigint, symbol, function
    // Note: typeof undefined === 'undefined'. Tool args shouldn't be undefined if present.
    return jsType; 
}

// Helper to get value from EvaluatedToolArguments
const getArgValue = <T>(args: EvaluatedToolArguments, name: string, expectedType: string, defaultVal: T): T => {
    const value = args[name];

    // Undefined means arg was not provided at all
    if (value === undefined) {
        // If type 'null' is expected, undefined doesn't match, use default.
        // If other type is expected, undefined doesn't match, use default.
        return defaultVal;
    }
    
    const actualType = getActualNuwaType(value);

    if (actualType === expectedType || expectedType === 'any') {
         // Allow null only if expectedType is 'null' or 'any'
         if (actualType === 'null' && expectedType !== 'null' && expectedType !== 'any') {
             // Fall through to mismatch warning/default value
         } else {
            return value as T;
         }
    }

    console.warn(`Type mismatch for argument '${name}': Expected ${expectedType}, got ${actualType}. Using default.`);
    return defaultVal;
};

// Optional version
const getOptArgValue = <T>(args: EvaluatedToolArguments, name: string, expectedType: string): T | undefined => {
    const value = args[name];

    // Undefined means optional arg was not provided
    if (value === undefined) {
        return undefined;
    }

    const actualType = getActualNuwaType(value);
    
    if (actualType === expectedType || expectedType === 'any') {
         // Allow null only if expectedType is 'null' or 'any'
         if (actualType === 'null' && expectedType !== 'null' && expectedType !== 'any') {
             // Fall through to mismatch warning/undefined
         } else {
            return value as T | undefined;
         }
    }

    // Optional arg with wrong type, return undefined
    // Don't warn if value is null and expected type wasn't null (this is valid for optional)
    if (actualType !== 'null') { 
        console.warn(`Type mismatch for optional argument '${name}': Expected ${expectedType}, got ${actualType}. Ignoring.`);
    }
    return undefined;
};

// drawLine Tool
const drawLineSchema: ToolSchema = {
  name: 'drawLine',
  description: 'Draws a line on the canvas.',
  parameters: [
    { name: 'x1', type: 'number', description: 'Starting X coordinate', required: true },
    { name: 'y1', type: 'number', description: 'Starting Y coordinate', required: true },
    { name: 'x2', type: 'number', description: 'Ending X coordinate', required: true },
    { name: 'y2', type: 'number', description: 'Ending Y coordinate', required: true },
    { name: 'color', type: 'string', description: 'Line color (e.g., "red", "#00ff00")', required: false },
    { name: 'width', type: 'number', description: 'Line width', required: false }
  ],
  returns: 'null'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const drawLineFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<any> => {
  const x1 = getArgValue<number>(args, 'x1', 'number', 0);
  const y1 = getArgValue<number>(args, 'y1', 'number', 0);
  const x2 = getArgValue<number>(args, 'x2', 'number', 0);
  const y2 = getArgValue<number>(args, 'y2', 'number', 0);
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const width = getArgValue<number>(args, 'width', 'number', 2);

  const newShape = { type: 'line' as const, points: [x1, y1, x2, y2], color: color, strokeWidth: width };
  console.log('[canvas.ts] Adding Line:', JSON.stringify(newShape)); // Log added shape
  canvasShapes.push(newShape);
  notifyCanvasChange();
  return null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const drawRectFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<any> => {
  const x = getArgValue<number>(args, 'x', 'number', 10);
  const y = getArgValue<number>(args, 'y', 'number', 10);
  const width = getArgValue<number>(args, 'width', 'number', 50);
  const height = getArgValue<number>(args, 'height', 'number', 30);
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const fill = getOptArgValue<string>(args, 'fill', 'string');

  const newShape = { type: 'rect' as const, x, y, width, height, color, fill };
  console.log('[canvas.ts] Adding Rect:', JSON.stringify(newShape)); // Log added shape
  canvasShapes.push(newShape);
  notifyCanvasChange();
  return null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const drawCircleFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<any> => {
  const x = getArgValue<number>(args, 'x', 'number', 50);
  const y = getArgValue<number>(args, 'y', 'number', 50);
  const radius = getArgValue<number>(args, 'radius', 'number', 25);
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const fill = getOptArgValue<string>(args, 'fill', 'string');

  const newShape = { type: 'circle' as const, x, y, radius, color, fill };
  console.log('[canvas.ts] Adding Circle:', JSON.stringify(newShape)); // Log added shape
  canvasShapes.push(newShape);
  notifyCanvasChange();
  return null;
};

// *** NEW: drawPath Tool ***
const drawPathSchema: ToolSchema = {
  name: 'drawPath',
  description: 'Draws a complex path on the canvas using SVG path data format.',
  parameters: [
    { name: 'd', type: 'string', description: 'SVG path data string (e.g., "M10 10 L 100 100 C 150 0, 200 200, 250 100 Z")', required: true },
    { name: 'color', type: 'string', description: 'Stroke color', required: false },
    { name: 'fill', type: 'string', description: 'Fill color (optional)', required: false },
    { name: 'width', type: 'number', description: 'Stroke width', required: false }
  ],
  returns: 'null'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const drawPathFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<any> => {
  const d = getArgValue<string>(args, 'd', 'string', '');
  if (!d) {
    console.warn("drawPath called with empty path data.");
    return null; 
  }
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const fill = getOptArgValue<string>(args, 'fill', 'string');
  const width = getArgValue<number>(args, 'width', 'number', 2);

  const newShape = { type: 'path' as const, d, color, fill, strokeWidth: width };
  console.log('[canvas.ts] Adding Path:', JSON.stringify(newShape)); // Log added shape
  canvasShapes.push(newShape);
  notifyCanvasChange();
  return null;
};
// *** END NEW TOOL ***

// clearCanvas Tool
const clearCanvasSchema: ToolSchema = {
  name: 'clearCanvas',
  description: 'Clears the entire canvas.',
  parameters: [],
  returns: 'null'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clearCanvasFunc: ToolFunction = async (): Promise<any> => {
  console.log('[canvas.ts] Clearing canvas shapes.'); // Log clear action
  canvasShapes.length = 0; // Clear the global array more explicitly
  notifyCanvasChange();
  return null;
};

// Export tools
export const canvasTools: { schema: ToolSchema, execute: ToolFunction }[] = [
  { schema: drawLineSchema, execute: drawLineFunc },
  { schema: drawRectSchema, execute: drawRectFunc },
  { schema: drawCircleSchema, execute: drawCircleFunc },
  { schema: drawPathSchema, execute: drawPathFunc },
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
