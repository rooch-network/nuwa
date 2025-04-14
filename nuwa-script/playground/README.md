# NuwaScript Playground

NuwaScript Playground 是一个交互式环境，允许用户探索和体验 NuwaScript 语言。通过此平台，你可以学习 NuwaScript 的语法、测试工具调用，以及使用 AI 助手生成脚本。

## 特点

- 多个预置示例展示不同场景下的 NuwaScript 使用
- 内置代码编辑器，支持语法高亮
- 实时执行 NuwaScript 代码
- 工具文档和描述
- AI 助手集成，帮助生成和解释脚本
- 完全在前端运行，无需后端服务

## 快速开始

### 安装依赖

首先，安装项目依赖：

```bash
npm install
```

### 启动开发服务器

运行以下命令启动开发服务器：

```bash
npm run dev
```

服务启动后，通常会在 [http://localhost:5173](http://localhost:5173) 打开。

## 使用说明

### 选择示例

左侧面板显示了可用的示例。每个示例都有自己的工具集和示例代码。点击示例名称加载到编辑器中。

### 编辑和运行脚本

1. 在中央编辑器中编辑 NuwaScript 代码
2. 点击顶部的"运行"按钮执行脚本
3. 查看底部面板中的输出结果或错误信息

### 使用 AI 助手

1. 点击顶部的"AI 助手"按钮打开 AI 面板
2. 输入你的 OpenAI API Key（仅保存在浏览器本地）
3. 提出问题或请求，例如"创建一个获取比特币价格的脚本"
4. AI 将生成 NuwaScript 代码并填入编辑器

## 示例介绍

Playground 包含多个示例：

1. **基础示例** - 演示基本的 NuwaScript 语法，包括变量声明和简单工具调用
2. **加密货币交易助手** - 展示如何创建一个自动交易决策系统
3. **天气助手** - 使用多个 API 获取和分析天气信息，提供穿衣建议

## 开发和扩展

### 添加新示例

1. 在 `src/examples/` 目录下创建新的示例文件
2. 定义工具实现和示例配置
3. 将新示例导出并添加到 `src/examples/index.ts` 中

### 与真实 NuwaScript 解释器集成

当前实现使用了一个简化的解释器。要与完整的 NuwaScript TypeScript 实现集成：

1. 导入 nuwa-script TypeScript 实现
2. 修改 `src/services/interpreter.ts` 文件以使用真实解释器

## 许可证

[MIT](LICENSE)
