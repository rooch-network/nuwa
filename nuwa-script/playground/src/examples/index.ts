import { ExampleConfig } from '../types/Example';

import basicExample from './basic';
import tradingExample from './trading';
import weatherExample from './weather';

// Export all example configurations
export const examples: ExampleConfig[] = [
  basicExample,
  tradingExample,
  weatherExample,
];

// Index examples by ID
export const examplesById = examples.reduce((acc, example) => {
  acc[example.id] = example;
  return acc;
}, {} as Record<string, ExampleConfig>);