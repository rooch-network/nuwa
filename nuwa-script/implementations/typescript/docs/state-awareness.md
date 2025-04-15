# AI Agent 状态感知机制

本文档描述了 nuwa-script 中新实现的状态感知机制，该机制允许 AI Agent 感知和使用状态信息，从而提高其上下文感知能力和推理能力。

## 设计概述

状态感知机制的核心设计思想是在工具执行过程中维护一个共享的状态存储，并将这些状态信息注入到提示（prompt）中，使 AI Agent 能够利用状态信息进行更具上下文感知的决策。

主要组件包括：

1. **状态存储（State Store）**：一个中央存储，用于保存键值对形式的状态数据
2. **工具上下文（Tool Context）**：在工具执行时提供状态访问
3. **状态格式化**：将状态转换为可读的格式，以便在提示中使用
4. **状态感知提示**：在提示中包含当前状态信息

## 主要修改

### 1. 工具注册表（ToolRegistry）

在 `tools.ts` 中，我们添加了状态管理功能：

- 新增 `StateStore` 类型，用于存储状态数据
- 向 `ToolRegistry` 类添加状态管理方法
- 新增工具上下文（`ToolContext`）接口，使工具函数能够访问状态
- 实现 `formatStateForPrompt()` 方法，将状态信息转换为可读格式

```typescript
export type StateStore = Map<string, NuwaValue>;

export interface ToolContext {
  state: StateStore;
}

export class ToolRegistry {
  private stateStore: StateStore = new Map();
  
  // 获取状态
  getState(): StateStore { /* ... */ }
  
  // 创建包含状态的工具上下文
  createToolContext(): ToolContext { /* ... */ }
  
  // 设置状态值
  setState(key: string, value: NuwaValue): void { /* ... */ }
  
  // 获取特定状态值
  getStateValue(key: string): NuwaValue | undefined { /* ... */ }
  
  // 检查状态是否存在
  hasState(key: string): boolean { /* ... */ }
  
  // 清除所有状态
  clearState(): void { /* ... */ }
  
  // 格式化状态供提示使用
  formatStateForPrompt(): string { /* ... */ }
}
```

### 2. 解释器（Interpreter）

在 `interpreter.ts` 中，我们修改了解释器以支持状态管理：

- 在 `executeToolCall` 方法中传递工具上下文
- 添加状态管理便捷方法，如 `setState`、`getStateValue` 等
- 确保所有工具调用都能访问和修改共享状态

```typescript
export class Interpreter {
  // 获取工具注册表
  getToolRegistry(): ToolRegistry { /* ... */ }
  
  // 状态管理便捷方法
  setState(key: string, value: NuwaValue): void { /* ... */ }
  getStateValue(key: string): NuwaValue | undefined { /* ... */ }
  hasState(key: string): boolean { /* ... */ }
  getAllState(): Map<string, NuwaValue> { /* ... */ }
  clearState(): void { /* ... */ }
  
  // 执行工具调用时包含状态上下文
  private async executeToolCall(toolName: string, argsExpr: Record<string, AST.Expression>, scope: Scope): Promise<NuwaValue> {
    // ...
    // 创建包含当前状态的工具上下文
    const context = this.toolRegistry.createToolContext();
    // 执行工具，传递参数和上下文
    const result = await execute(evaluatedArgs, context);
    // ...
  }
}
```

### 3. 提示构建（Prompts）

在 `prompts.ts` 中，我们更新了提示模板和构建函数：

- 在提示模板中添加了状态部分
- 更新了 `buildPrompt` 函数，使其包含状态信息
- 添加了控制是否包含状态的选项

```typescript
export const GENERATION_PROMPT_TEMPLATE = `
// ...

# Current System State:
This represents the current state of the system. You can use this information to inform your response:
--- START STATE ---
{state_info}
--- END STATE ---

// ...
`;

export function buildPrompt(registry: ToolRegistry, userTask: string, includeState: boolean = true): string {
  // ...
  const stateInfo = includeState ? registry.formatStateForPrompt() : "No state information available.";
  // ...
}
```

## 工作原理

### 状态传播流程

1. **状态初始化**：在应用启动时，可以预先设置一些状态值
2. **工具执行**：工具执行时，可以通过 `context.state` 访问和修改状态
3. **状态注入**：构建提示时，系统会将当前状态信息注入到提示中
4. **AI 感知**：AI 根据提示中的状态信息生成更具上下文感知的响应
5. **状态更新**：执行生成的代码时，会进一步更新状态，形成一个反馈循环

### 示例：对话状态管理

以下是一个简单的对话状态管理示例：

1. 用户首次询问比特币价格：
   - 系统执行 `get_current_btc_price` 工具
   - 工具在状态中记录 `last_btc_price_time` 和 `last_btc_price_value`
   - AI 能够看到这些状态，并在后续对话中引用

2. 用户询问"价格变了多少"：
   - 提示中包含之前记录的价格信息
   - AI 能够理解用户指的是比特币价格
   - 可以获取新价格并与状态中的旧价格比较

### 状态存储的键值约定

为确保一致性，建议使用以下命名约定：

- 时间戳类：以 `_time` 结尾，如 `last_query_time`
- 计数器类：以 `_count` 结尾，如 `interactions_count`
- 上次值类：以 `last_` 开头，如 `last_query`
- 用户相关：以 `user_` 开头，如 `user_preferences`
- 布尔标志：使用 `has_` 或 `is_` 开头，如 `has_conversation_history`

## 使用示例

### 注册带状态工具

```typescript
toolRegistry.register('get_user_preferences', userPrefsSchema, async (args, context) => {
  const userId = args['user_id'];
  
  // 获取用户偏好
  const preferences = await fetchUserPreferences(userId);
  
  // 在状态中存储用户信息
  if (context) {
    context.state.set('last_accessed_user', userId);
    context.state.set('user_preferences', preferences);
  }
  
  return preferences;
});
```

### 读取状态信息

```typescript
// 在解释器中直接访问
const lastUser = interpreter.getStateValue('last_accessed_user');

// 或者从工具中访问
toolRegistry.register('get_conversation_history', historySchema, async (args, context) => {
  const userId = args['user_id'];
  
  // 使用状态信息增强功能
  let extraMessage = "";
  if (context && context.state.get('last_accessed_user') === userId) {
    extraMessage = "We were just talking about your preferences.";
  }
  
  // ...
});
```

### 构建带状态的提示

```typescript
// 默认包含状态
const prompt = buildPrompt(toolRegistry, userTask);

// 明确指定是否包含状态
const promptWithoutState = buildPrompt(toolRegistry, userTask, false);
```

## 最佳实践

1. **状态命名**：使用清晰、一致的命名约定
2. **状态隔离**：不同功能领域使用不同的状态前缀
3. **状态清理**：定期清理不再需要的状态
4. **合理使用**：不要过度依赖状态，状态应该增强而非完全替代工具功能
5. **状态验证**：在使用状态前验证其存在和类型
6. **默认值**：在获取可能不存在的状态时提供默认值

## 局限性

- **持久化**：当前实现不支持状态持久化，重启后状态会丢失
- **大型状态**：过大的状态对象可能导致提示过长
- **状态冲突**：不同工具可能会使用相同的状态键，导致冲突
- **状态过度**：过多依赖状态可能导致系统复杂性增加

## 未来改进

1. **状态持久化**：实现状态的持久化存储
2. **状态命名空间**：引入命名空间避免状态冲突
3. **状态过滤**：根据相关性选择性地在提示中包含状态
4. **状态压缩**：压缩或摘要大型状态对象
5. **状态监控**：提供状态变更监控和调试工具 