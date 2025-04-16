import React, { useRef, useEffect, memo, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Path } from 'react-konva';
import Konva from 'konva';

// Define the possible shapes AI can draw
export type DrawableShape = 
  | { type: 'line', points: number[], color: string, strokeWidth: number }
  | { type: 'rect', x: number, y: number, width: number, height: number, color: string, fill?: string }
  | { type: 'circle', x: number, y: number, radius: number, color: string, fill?: string }
  | { type: 'path', d: string, color: string, fill?: string, strokeWidth: number };

interface DrawingCanvasProps {
  width: number;
  height: number;
  shapes: DrawableShape[];
  onCanvasChange: (json: object) => void;
}

// Function to get the JSON representation of canvas
export const getCanvasJSON = (stageRef: React.RefObject<Konva.Stage | null>): object | null => {
  if (!stageRef.current) return null;
  
  // Get JSON representation
  const stageJSON = stageRef.current.toJSON();
  return JSON.parse(stageJSON);
};

// Use React.memo to prevent unnecessary re-renders of the canvas component
const DrawingCanvas: React.FC<DrawingCanvasProps> = memo(({ width, height, shapes, onCanvasChange }) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const lastJsonRef = useRef<string | null>(null); // Ref to store last JSON string
  const shapesRef = useRef<DrawableShape[]>([]); // Initialize empty to ensure first render
  const [forceUpdateKey, setForceUpdateKey] = useState(0); // Add a state to force refresh

  // Update render on initial load and whenever shapes array changes
  useEffect(() => {
    // Add debug logs to track shapes changes
    console.log('[DrawingCanvas] Shapes changed:', shapes.length, 'shapes');
    
    // Detect changes from previous shapes
    const prevShapesJSON = JSON.stringify(shapesRef.current);
    const newShapesJSON = JSON.stringify(shapes);
    const hasShapesChanged = prevShapesJSON !== newShapesJSON;
    
    // Ensure a force update triggers after initial render, even if shapes are the same
    if (hasShapesChanged) {
      console.log('[DrawingCanvas] Shapes content changed, updating...');
      shapesRef.current = [...shapes]; // Copy new shapes to ref
      
      // Force component refresh - this solves the initial rendering issue
      setForceUpdateKey(prev => prev + 1);
      
      // Use requestAnimationFrame to ensure Konva has rendered
      if (stageRef.current && onCanvasChange) {
        requestAnimationFrame(() => { 
          if (!stageRef.current) return;
          
          const stage = stageRef.current;
          const jsonString = stage.toJSON();

          // Only call onCanvasChange if JSON string has actually changed
          if (jsonString !== lastJsonRef.current) {
            lastJsonRef.current = jsonString;
            try {
              const jsonObject = JSON.parse(jsonString);
              onCanvasChange(jsonObject);
            } catch (e) {
              console.error("Failed to parse Konva stage JSON:", e);
            }
          }
        });
      }
    } else {
      console.log('[DrawingCanvas] Shapes reference changed but content is the same');
    }
  }, [shapes, onCanvasChange]); 

  // Perform initial render immediately after component mount
  useEffect(() => {
    console.log('[DrawingCanvas] Initial mount, forcing first render');
    // Force a render when component mounts
    setForceUpdateKey(prev => prev + 1);
    
    // Cleanup on component unmount
    return () => {
      console.log('[DrawingCanvas] Component unmounting');
    };
  }, []);

  console.log(`[DrawingCanvas] Rendering with key ${forceUpdateKey}, ${shapes.length} shapes`);

  return (
    <Stage 
      ref={stageRef}
      width={width} 
      height={height} 
      style={{ border: '1px solid #ccc', background: '#fff' }}
      key={`canvas-stage-${forceUpdateKey}`} // Add key to support forced re-renders
    >
      <Layer>
        {shapes.map((shape, index) => {
          switch (shape.type) {
            case 'line':
              return (
                <Line
                  key={`${index}-${forceUpdateKey}`}
                  points={shape.points}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            case 'rect':
              return (
                <Rect
                  key={`${index}-${forceUpdateKey}`}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  stroke={shape.color}
                  fill={shape.fill}
                  strokeWidth={1}
                />
              );
            case 'circle':
              return (
                <Circle
                  key={`${index}-${forceUpdateKey}`}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  stroke={shape.color}
                  fill={shape.fill}
                  strokeWidth={1}
                />
              );
            case 'path':
              return (
                <Path
                  key={`${index}-${forceUpdateKey}`}
                  data={shape.d}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill}
                />
              );
            default:
              console.warn("Unsupported shape type:", shape);
              return null; 
          }
        })}
      </Layer>
    </Stage>
  );
});

export default DrawingCanvas;
