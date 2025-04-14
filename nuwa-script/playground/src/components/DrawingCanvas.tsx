import React from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva'; // Removed Shape as it wasn't used

// Define the possible shapes AI can draw
export type DrawableShape = 
  | { type: 'line', points: number[], color: string, strokeWidth: number }
  | { type: 'rect', x: number, y: number, width: number, height: number, color: string, fill?: string } // Added optional fill
  | { type: 'circle', x: number, y: number, radius: number, color: string, fill?: string }; // Added optional fill

interface DrawingCanvasProps {
  width: number;
  height: number;
  shapes: DrawableShape[];
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ width, height, shapes }) => {
  return (
    <Stage width={width} height={height} style={{ border: '1px solid #ccc', background: '#fff' }}>
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
