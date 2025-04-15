import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Path } from 'react-konva'; // Removed Shape as it wasn't used
import Konva from 'konva';

// Define the possible shapes AI can draw
export type DrawableShape = 
  | { type: 'line', points: number[], color: string, strokeWidth: number }
  | { type: 'rect', x: number, y: number, width: number, height: number, color: string, fill?: string } // Added optional fill
  | { type: 'circle', x: number, y: number, radius: number, color: string, fill?: string } // Added optional fill
  | { type: 'path', d: string, color: string, fill?: string, strokeWidth: number }; // Added path type

interface DrawingCanvasProps {
  width: number;
  height: number;
  shapes: DrawableShape[];
  onCanvasChange?: (json: object) => void;
}

// Function to get the JSON representation of canvas
export const getCanvasJSON = (stageRef: React.RefObject<Konva.Stage | null>): object | null => {
  if (!stageRef.current) return null;
  
  // Get JSON representation
  const stageJSON = stageRef.current.toJSON();
  return JSON.parse(stageJSON);
};

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ width, height, shapes, onCanvasChange }) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  
  // Trigger onCanvasChange callback when shapes change
  useEffect(() => {
    if (stageRef.current && onCanvasChange) {
      // Wait for konva to finish rendering
      setTimeout(() => {
        const json = getCanvasJSON(stageRef);
        if (json) {
          onCanvasChange(json);
        }
      }, 0);
    }
  }, [shapes, onCanvasChange]);

  return (
    <Stage 
      ref={stageRef}
      width={width} 
      height={height} 
      style={{ border: '1px solid #ccc', background: '#fff' }}
    >
      <Layer>
        {shapes.map((shape, index) => {
          switch (shape.type) {
            case 'line':
              return (
                <Line
                  key={index}
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
                  key={index}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  stroke={shape.color}
                  fill={shape.fill} // Use fill color if provided
                  strokeWidth={1} // Default stroke width for rect
                />
              );
            case 'circle':
              return (
                <Circle
                  key={index}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  stroke={shape.color}
                  fill={shape.fill} // Use fill color if provided
                  strokeWidth={1} // Default stroke width for circle
                />
              );
            case 'path':
              return (
                <Path
                  key={index}
                  data={shape.d} // Use the 'd' property for path data
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill}
                />
              );
            default:
              // Ensure exhaustiveness checking if new shape types are added
              // const _exhaustiveCheck: never = shape; 
              console.warn("Unsupported shape type:", shape);
              return null; 
          }
        })}
      </Layer>
    </Stage>
  );
};

export default DrawingCanvas;
