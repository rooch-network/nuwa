import { ExampleConfig, ComponentStateManager } from '../types/Example';
import type { 
  ToolSchema, 
  ToolFunction, 
  EvaluatedToolArguments,
  StateValueWithMetadata,
  ToolRegistry,
  ToolContext,
  NuwaType,
  JsonValue
} from '../services/interpreter';
import type { DrawableShape } from '../components/DrawingCanvas';

// --- Command Object Interface ---
interface PathCommandObject {
    command: string;
    x?: number;
    y?: number;
    cx1?: number;
    cy1?: number;
    cx2?: number;
    cy2?: number;
}

// --- Canvas State Interface ---
export interface CanvasState {
  shapes: DrawableShape[];
  canvasJSON: object | null;
  width: number;
  height: number;
  lastModified: number;
}

// --- Shared State for Canvas --- 
// NOTE: This is a simple global state for demonstration.
// In a real app, consider Zustand, Context API, or other state management.
export const canvasShapes: DrawableShape[] = [];
// Store canvas JSON representation
export let canvasJSON: object | null = null;

// Initialize canvas state
export const canvasState: CanvasState = {
  shapes: canvasShapes,
  canvasJSON: canvasJSON,
  width: 500,
  height: 400,
  lastModified: Date.now()
};

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
  // Update lastModified timestamp
  canvasState.lastModified = Date.now();
  // Notify all listeners
  changeListeners.forEach(listener => listener());
};

// Update canvas JSON representation
export const updateCanvasJSON = (json: object) => {
  canvasJSON = json;
  canvasState.canvasJSON = json;
  
  // Get tool registry
  const globalObj = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
  const registry = (globalObj as { __toolRegistry?: ToolRegistry }).__toolRegistry;
  if (registry) {
    registry.setState('canvas_json', createState(
      JSON.stringify(json),
      `JSON representation of the canvas for better spatial understanding.\nThis contains detailed information about all shapes and their positions on the canvas.\nFormat:\n- canvas dimensions (width: 500, height: 400)\n- shapes array containing all objects with their precise coordinates\n- each shape has properties like:\n  * x, y: position coordinates (origin is top-left)\n  * width, height: dimensions of rectangles\n  * radius: size of circles\n  * points: coordinates for lines [x1,y1,x2,y2]\n  * color: stroke color\n  * fill: fill color if present\n\nSpatial Guidelines:\n- x increases from left to right (0 at left edge, 500 at right edge)\n- y increases from top to bottom (0 at top edge, 400 at bottom edge)\n- shapes may overlap if their coordinates and dimensions intersect\n- to place objects "next to" others, ensure their boundaries don't overlap\n- typically, maintain at least 20-50 pixels spacing between objects\n- center of canvas is approximately at x: 250, y: 200`
    ));
  }
  
  // Notify change
  notifyCanvasChange();
};
// --- End Shared State ---

// --- Helper for State Management ---
// Helper function to create state with metadata
function createState<T>(value: T, description: string, formatter?: (value: unknown) => string): StateValueWithMetadata {
  return {
    value: value as unknown as JsonValue, // Type cast with more safety
    metadata: {
      description,
      formatter: formatter as unknown as ((value: JsonValue) => string) | undefined
    }
  };
}

// Update state with canvas information
export function updateCanvasState(context?: ToolContext): void {
  // If no context or state, try to get registry from global object
  let registry: ToolRegistry | undefined;
  
  if (context) {
    registry = (context as unknown as { registry?: ToolRegistry }).registry;
  }
  
  if (!registry) {
    // Get global registry if not from context
    const globalObj = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
    registry = (globalObj as { __toolRegistry?: ToolRegistry }).__toolRegistry;
  }
  
  // Return if registry not found
  if (!registry) return;
  
  // Update canvas state values
  updateCanvasStateWithRegistry(registry);
}

// Helper function to update state with registry
function updateCanvasStateWithRegistry(registry: ToolRegistry): void {
  // Store basic canvas information
  const shapeCount = canvasShapes.length;
  
  // Set canvas dimensions
  registry.setState('canvas_width', createState(
    canvasState.width,
    "Width of the canvas in pixels"
  ));
  
  registry.setState('canvas_height', createState(
    canvasState.height,
    "Height of the canvas in pixels"
  ));
  
  registry.setState('canvas_shape_count', createState(
    shapeCount,
    "Number of shapes currently on the canvas"
  ));
  
  // Store shape type breakdown
  const shapeTypes: Record<string, number> = {};
  canvasShapes.forEach(shape => {
    shapeTypes[shape.type] = (shapeTypes[shape.type] || 0) + 1;
  });
  
  registry.setState('canvas_shape_types', createState(
    shapeTypes,
    "Breakdown of shape types on the canvas",
    (value) => {
      const types = value as Record<string, number>;
      return Object.entries(types)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');
    }
  ));
  
  // If there's a JSON representation, store it in state
  if (canvasJSON) {
    registry.setState('canvas_json', createState(
      JSON.stringify(canvasJSON),
      `JSON representation of the canvas for better spatial understanding.\nThis contains detailed information about all shapes and their positions on the canvas.\nFormat:\n- canvas dimensions (width: 500, height: 400)\n- shapes array containing all objects with their precise coordinates\n- each shape has properties like:\n  * x, y: position coordinates (origin is top-left)\n  * width, height: dimensions of rectangles\n  * radius: size of circles\n  * points: coordinates for lines [x1,y1,x2,y2]\n  * color: stroke color\n  * fill: fill color if present\n\nSpatial Guidelines:\n- x increases from left to right (0 at left edge, 500 at right edge)\n- y increases from top to bottom (0 at top edge, 400 at bottom edge)\n- shapes may overlap if their coordinates and dimensions intersect\n- to place objects "next to" others, ensure their boundaries don't overlap\n- typically, maintain at least 20-50 pixels spacing between objects\n- center of canvas is approximately at x: 250, y: 200`
    ));
  }
  
  // Store latest shape information if available
  const latestShape = canvasShapes.length > 0 
    ? canvasShapes[canvasShapes.length - 1] 
    : null;
    
  if (latestShape) {
    registry.setState('canvas_last_shape', createState(
      latestShape.type,
      "Type of the most recently added shape"
    ));

    // Store description of the latest shape
    let lastShapeDesc = "";
    switch (latestShape.type) {
      case 'line':
        lastShapeDesc = `Line from (${latestShape.points[0]},${latestShape.points[1]}) to (${latestShape.points[2]},${latestShape.points[3]}), color: ${latestShape.color}`;
        break;
      case 'rect':
        lastShapeDesc = `Rectangle at (${latestShape.x},${latestShape.y}) of size ${latestShape.width}x${latestShape.height}, color: ${latestShape.color}`;
        break;
      case 'circle':
        lastShapeDesc = `Circle at (${latestShape.x},${latestShape.y}) with radius ${latestShape.radius}, color: ${latestShape.color}`;
        break;
      case 'path':
        lastShapeDesc = `Path with SVG data (shortened), color: ${latestShape.color}`;
        break;
    }
    
    registry.setState('canvas_last_shape_details', createState(
      lastShapeDesc,
      "Description of the most recently added shape"
    ));
  }
  
  // Store canvas modification time
  registry.setState('canvas_last_modified', createState(
    canvasState.lastModified,
    "Timestamp of the last canvas modification",
    (value) => {
      const timestamp = value as number;
      const date = new Date(timestamp);
      return `${timestamp} (${date.toLocaleString()})`;
    }
  ));
}

// Canvas state manager that implements ComponentStateManager interface
export const canvasStateManager: ComponentStateManager<CanvasState> = {
  getState: () => ({ 
    shapes: [...canvasShapes], 
    canvasJSON, 
    width: canvasState.width, 
    height: canvasState.height,
    lastModified: canvasState.lastModified
  }),
  subscribe: subscribeToCanvasChanges,
  updateStateInRegistry: updateCanvasState
};

// --- End State Management ---


// --- Canvas Tool Definitions ---

// Helper function to determine the Nuwa type string from a JavaScript value
const getActualNuwaType = (value: unknown): NuwaType => {
    if (value === null) return 'null';
    const jsType = typeof value;
    if (jsType === 'object') {
        return Array.isArray(value) ? 'array' : 'object';
    }
    // Handles string, number, boolean, undefined, bigint, symbol, function
    return jsType as NuwaType; 
};

// Helper function to get value from EvaluatedToolArguments
const getArgValue = <T>(args: EvaluatedToolArguments, name: string, expectedType: NuwaType, defaultVal: T): T => {
    const value = args[name];

    if (value === undefined) {
        return defaultVal;
    }
    
    const actualType = getActualNuwaType(value);

    if (actualType === expectedType || expectedType === 'any') {
         if (actualType === 'null' && expectedType !== 'null' && expectedType !== 'any') {
            return defaultVal; // Return default value for null when not expecting null
         } else {
            return value as T;
         }
    }

    console.warn(`Type mismatch for argument '${name}': Expected ${expectedType}, got ${actualType}. Using default.`);
    return defaultVal;
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
const drawLineFunc: ToolFunction = async (args: EvaluatedToolArguments, context?: ToolContext): Promise<any> => {
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
  
  // Update canvas state
  updateCanvasState(context);
  
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
const drawRectFunc: ToolFunction = async (args: EvaluatedToolArguments, context?: ToolContext): Promise<any> => {
  const x = getArgValue<number>(args, 'x', 'number', 10);
  const y = getArgValue<number>(args, 'y', 'number', 10);
  const width = getArgValue<number>(args, 'width', 'number', 50);
  const height = getArgValue<number>(args, 'height', 'number', 30);
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const fill = getArgValue<string>(args, 'fill', 'string', '');

  const newShape = { type: 'rect' as const, x, y, width, height, color, fill };
  console.log('[canvas.ts] Adding Rect:', JSON.stringify(newShape)); // Log added shape
  canvasShapes.push(newShape);
  notifyCanvasChange();
  
  // Update canvas state
  updateCanvasState(context);
  
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
const drawCircleFunc: ToolFunction = async (args: EvaluatedToolArguments, context?: ToolContext): Promise<any> => {
  const x = getArgValue<number>(args, 'x', 'number', 50);
  const y = getArgValue<number>(args, 'y', 'number', 50);
  const radius = getArgValue<number>(args, 'radius', 'number', 25);
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const fill = getArgValue<string>(args, 'fill', 'string', '');

  const newShape = { type: 'circle' as const, x, y, radius, color, fill };
  console.log('[canvas.ts] Adding Circle:', JSON.stringify(newShape)); // Log added shape
  canvasShapes.push(newShape);
  notifyCanvasChange();
  
  // Update canvas state
  updateCanvasState(context);
  
  return null;
};

// *** MODIFIED: drawPath Tool ***
const drawPathSchema_New: ToolSchema = {
  name: 'drawPath',
  description: 'Draws a path on the canvas using SVG path commands.',
  parameters: [
    { name: 'commands', type: 'array', description: 'Array of path commands', required: true },
    { name: 'color', type: 'string', description: 'Path color', required: false },
    { name: 'fill', type: 'string', description: 'Fill color (optional)', required: false },
    { name: 'width', type: 'number', description: 'Path width', required: false }
  ],
  returns: 'null'
};

// Fix: Use the interface and add blocks to switch cases
const drawPathFunc_New: ToolFunction = async (args: EvaluatedToolArguments, context?: ToolContext): Promise<JsonValue> => { // Return null explicitly
  // Get commands, assert type for better checking later
  const commandsInput = getArgValue<(PathCommandObject | Record<string, unknown>)[]>(args, 'commands', 'array', []); // Changed to 'array' type
  const color = getArgValue<string>(args, 'color', 'string', 'black');
  const fill = getArgValue<string>(args, 'fill', 'string', '');
  const width = getArgValue<number>(args, 'width', 'number', 2);

  if (!Array.isArray(commandsInput) || commandsInput.length === 0) {
    console.warn("drawPath called with empty or invalid commands list.");
    return null;
  }

  let d = "";
  for (const cmdObj of commandsInput) {
    // Basic validation
    if (typeof cmdObj !== 'object' || cmdObj === null || !cmdObj.command || typeof cmdObj.command !== 'string') {
      console.warn("Skipping invalid command object:", cmdObj);
      continue;
    }
    const command = cmdObj.command.toUpperCase();
    d += command;

    // Use block scope for each case
    switch (command) {
      case 'M':
      case 'L': { // Add block scope
        // Type assertion after validation improves safety somewhat
        const typedCmd = cmdObj as PathCommandObject;
        const x = Number(typedCmd.x);
        const y = Number(typedCmd.y);
        if (!isNaN(x) && !isNaN(y)) {
           d += ` ${x} ${y}`;
        } else {
           console.warn(`Invalid coordinates for ${command}:`, cmdObj);
        }
        break;
      } // Close block scope
      case 'C': { // Add block scope
        const typedCmd = cmdObj as PathCommandObject;
        const cx1 = Number(typedCmd.cx1); const cy1 = Number(typedCmd.cy1);
        const cx2 = Number(typedCmd.cx2); const cy2 = Number(typedCmd.cy2);
        const endX = Number(typedCmd.x); const endY = Number(typedCmd.y);
        if (!isNaN(cx1) && !isNaN(cy1) && !isNaN(cx2) && !isNaN(cy2) && !isNaN(endX) && !isNaN(endY)) {
            d += ` ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
        } else {
             console.warn(`Invalid coordinates for ${command}:`, cmdObj);
        }
        break;
      } // Close block scope
      case 'Z': { // Add block scope (good practice even if empty)
        // No coordinates needed
        break;
      } // Close block scope
      default: { // Add block scope
        console.warn(`Unsupported path command: ${command}`);
        break;
      } // Close block scope
    }
    d += " ";
  }
  d = d.trim();

  if (!d) {
    console.warn("drawPath resulted in an empty path data string after processing commands.");
    return null;
  }

  const newShape: DrawableShape = { type: 'path', d, color, fill, strokeWidth: width }; // Ensure type compatibility
  console.log('[canvas.ts] Adding Path:', JSON.stringify(newShape));
  canvasShapes.push(newShape);
  notifyCanvasChange();

  updateCanvasState(context);
  return null; // Explicitly return null
};
// *** END MODIFIED TOOL ***

// clearCanvas Tool
const clearCanvasSchema: ToolSchema = {
  name: 'clearCanvas',
  description: 'Clears the entire canvas.',
  parameters: [],
  returns: 'null'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clearCanvasFunc: ToolFunction = async (_args: EvaluatedToolArguments, context?: ToolContext): Promise<any> => {
  console.log('[canvas.ts] Clearing canvas shapes.'); // Log clear action
  canvasShapes.length = 0; // Clear the global array more explicitly
  notifyCanvasChange();
  
  // Update canvas state
  updateCanvasState(context);
  
  return null;
};

// Export tools - USE THE NEW SCHEMA AND FUNCTION FOR drawPath
export const canvasTools: { schema: ToolSchema, execute: ToolFunction }[] = [
  { schema: drawLineSchema, execute: drawLineFunc },
  { schema: drawRectSchema, execute: drawRectFunc },
  { schema: drawCircleSchema, execute: drawCircleFunc },
  { schema: drawPathSchema_New, execute: drawPathFunc_New },
  { schema: clearCanvasSchema, execute: clearCanvasFunc }
];

// Canvas Example Config
export const canvasExample: ExampleConfig = {
  id: 'canvas',
  name: 'Canvas Drawing',
  description: 'Interactive canvas drawing API with tools to create shapes and paths.',
  category: 'Intermediate',
  script: `// Canvas Drawing Example
// Try running this code to see what happens!

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

PRINT("House drawing complete!")
`,
  // Provide tool schemas for the example config (used by AI prompt generation etc.)
  // Map ToolSchema back to the format ExampleConfig expects for UI/AI interaction
  tools: canvasTools.map(t => t.schema),
  aiPrompt: `# Canvas-Specific Guidelines:
- DO NOT automatically call clearCanvas {} at the beginning unless explicitly requested.
- Build upon the existing canvas content unless the user asks to start fresh.
- Use the current state variable 'canvas_json' to understand what's already drawn before adding new elements. It contains a JSON string representing all shapes.

# Spatial Positioning Guidelines:
- The canvas is 500x400 pixels. Coordinate system: (0,0) is top-left; x increases right, y increases down. Center is roughly (250, 200).
- Before placing new shapes, carefully examine the 'canvas_json' state variable to check existing shapes (coordinates, size).
- When placing objects relative to others (e.g., "next to", "above"), calculate positions thoughtfully based on the 'canvas_json' data to avoid unwanted overlaps and maintain reasonable spacing (e.g., 20-50 pixels generally looks good).
- Ensure new shapes fit within canvas bounds (x: 0-500, y: 0-400).

# Layout and Aesthetics Guidelines:
- Consider the overall composition and visual appeal of the entire canvas when placing elements.
- Arrange elements thoughtfully on the canvas, leaving appropriate space between them.
- Consider the relative positions requested (e.g., 'sun in the sky', 'tree next to the house').
- Avoid placing elements directly overlapping unless specifically instructed.
- Try to create a visually balanced composition.

# Thinking Process:
- Use PRINT statements to explain your reasoning, especially for coordinate calculations and layout decisions. For example: PRINT("Placing the sun at x=400, y=80 to be in the top-right sky.")`,
  componentId: 'canvas',
  stateManager: canvasStateManager
};

export default canvasExample;
