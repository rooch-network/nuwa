import { ExampleConfig } from '../types/Example';

import basicExample from './basic';
import tradingExample from './trading';
import weatherExample from './weather';

// 导出所有示例配置
export const examples: ExampleConfig[] = [
  basicExample,
  tradingExample,
  weatherExample,
];

// 按 ID 索引示例
export const examplesById = examples.reduce((acc, example) => {
  acc[example.id] = example;
  return acc;
}, {} as Record<string, ExampleConfig>);