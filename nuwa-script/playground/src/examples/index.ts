import { ExampleConfig } from '../types/Example';

import tradingExample from './trading';
import canvasExample from './canvas';

// Export only the DeFi and AI Drawing examples
export const examples: ExampleConfig[] = [
  tradingExample,
  canvasExample,
];

// Index examples by ID
export const examplesById = examples.reduce((acc, example) => {
  acc[example.id] = example;
  return acc;
}, {} as Record<string, ExampleConfig>);