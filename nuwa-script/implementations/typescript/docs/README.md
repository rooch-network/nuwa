# Nuwa-Script 状态感知功能

Nuwa-Script 现在支持 AI Agent 状态感知功能，使 AI 能够在生成代码时考虑系统状态，从而提供更具上下文感知的响应。

## 功能概述

- **状态管理**：工具可以存储和访问共享状态
- **状态感知提示**：状态信息会自动注入到提示中
- **上下文连续性**：AI 可以了解和引用之前的交互

## 快速开始

### 1. 注册带状态工具

```typescript
import { ToolRegistry, ToolContext } from '../src/tools';

const toolRegistry = new ToolRegistry();

// 注册一个可以访问和修改状态的工具
toolRegistry.register('weather_info', weatherSchema, async (args, context) => {
  const location = args['location'];
  const forecast = await getWeatherForecast(location);
  
  // 保存状态
  if (context) {
    context.state.set('last_weather_check_time', Date.now());
    context.state.set('last_weather_location', location);
    context.state.set('last_weather_forecast', forecast);
  }
  
  return forecast;
});
```

### 2. 直接管理状态

```typescript
// 设置状态
toolRegistry.setState('user_name', 'Alice');
toolRegistry.setState('user_preferences', { theme: 'dark', language: 'en' });

// 获取状态
const userName = toolRegistry.getStateValue('user_name');
const userPrefs = toolRegistry.getStateValue('user_preferences');

// 检查状态是否存在
if (toolRegistry.hasState('last_query')) {
  console.log('Last query:', toolRegistry.getStateValue('last_query'));
}

// 清除所有状态
toolRegistry.clearState();
```

### 3. 使用状态生成提示

```typescript
import { buildPrompt } from '../src/prompts';

// 默认包含状态信息
const prompt = buildPrompt(toolRegistry, "Tell me about the weather");

// 明确指定是否包含状态（可选）
const promptWithoutState = buildPrompt(toolRegistry, "Tell me about the weather", false);
```

### 4. 从解释器访问状态

```typescript
import { Interpreter } from '../src/interpreter';

const interpreter = new Interpreter(toolRegistry);

// 通过解释器管理状态
interpreter.setState('execution_count', 0);
interpreter.setState('start_time', Date.now());

// 运行脚本
const script = parse('LET x = 10\nPRINT(x)');
const scope = await interpreter.execute(script);

// 更新状态
const count = interpreter.getStateValue('execution_count') as number || 0;
interpreter.setState('execution_count', count + 1);
interpreter.setState('last_execution_time', Date.now());
```

## 示例

运行示例程序体验状态感知功能：

```bash
# 安装依赖
npm install

# 确保设置了 OPENAI_API_KEY 环境变量
export OPENAI_API_KEY="your-api-key"

# 运行示例
npx ts-node examples/generate_with_llm.ts
```

示例程序会维护一个会话状态，AI 将能够：
- 记住之前查询的信息
- 引用之前调用工具的结果
- 跟踪对话的进展
- 保持上下文连续性

## 文档

更详细的文档请参阅：

- [状态感知设计文档](./state-awareness.md) - 详细的设计和实现信息
- [API 参考](../src/tools.ts) - 完整的 API 文档
- [示例工具](../examples/generate_with_llm.ts) - 带状态工具的实现示例

## 注意事项

- 状态是会话级别的，不会在程序重启后保持
- 过大的状态可能导致提示过长
- 状态应该增强而非替代工具功能 