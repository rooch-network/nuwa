# NuwaScript Playground

NuwaScript Playground is an interactive environment that allows users to explore and experience the NuwaScript language. Through this platform, you can learn NuwaScript syntax, test tool calls, and generate scripts using the AI assistant.

## Features

- Multiple pre-configured examples showcasing NuwaScript usage in different scenarios
- Built-in code editor with syntax highlighting
- Real-time execution of NuwaScript code
- Tool documentation and descriptions
- AI assistant integration to help generate and explain scripts
- Fully client-side, no backend services required

## Quick Start

### Install Dependencies

First, install the project dependencies:

```bash
npm install
```

### Start the Development Server

Run the following command to start the development server:

```bash
npm run dev
```

After the service starts, it typically opens at [http://localhost:5173](http://localhost:5173).

## Usage Guide

### Select an Example

The left panel displays available examples. Each example has its own set of tools and sample code. Click on an example name to load it into the editor.

### Edit and Run Scripts

1. Edit NuwaScript code in the central editor
2. Click the "Run" button at the top to execute the script
3. View the output results or error messages in the bottom panel

### Using the AI Assistant

1. Click the "AI Assistant" button at the top to open the AI panel
2. Enter your OpenAI API Key (stored only in your browser's local storage)
3. Ask questions or make requests, such as "Create a script to get Bitcoin prices"
4. The AI will generate NuwaScript code and populate it in the editor

## Example Introduction

The Playground includes multiple examples:

1. **Basic Example** - Demonstrates basic NuwaScript syntax, including variable declarations and simple tool calls
2. **Cryptocurrency Trading Assistant** - Shows how to create an automated trading decision system
3. **Weather Assistant** - Uses multiple APIs to retrieve and analyze weather information, providing clothing recommendations

## Development and Extension

### Adding New Examples

1. Create a new example file in the `src/examples/` directory
2. Define tool implementations and example configuration
3. Export the new example and add it to `src/examples/index.ts`

### Integration with the Real NuwaScript Interpreter

The current implementation uses a simplified interpreter. To integrate with the complete NuwaScript TypeScript implementation:

1. Import the nuwa-script TypeScript implementation
2. Modify the `src/services/interpreter.ts` file to use the real interpreter

## License

[MIT](LICENSE)
