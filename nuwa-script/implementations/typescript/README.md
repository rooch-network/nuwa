# NuwaScript - TypeScript Implementation

This directory contains the TypeScript implementation of the NuwaScript interpreter, parser, and lexer.

## Features

- Parses NuwaScript text into an Abstract Syntax Tree (AST).
- Interprets the AST, executing statements and evaluating expressions.
- Supports variables (LET), conditionals (IF/THEN/ELSE/END), loops (FOR/IN/DO/END), and basic operators (arithmetic, comparison, logical).
- Handles built-in functions (NOW()) and statements (PRINT).
- Extensible tool calling mechanism (CALL) via a `ToolRegistry`.
- Basic error handling for runtime issues (type errors, undefined variables, tool errors).

## Setup

1.  **Navigate** to this directory:
    ```bash
    cd nuwa-script/implementations/typescript
    ```
2.  **Install Dependencies**: Use npm or yarn.
    ```bash
    npm install
    # or
    yarn install
    ```

## Building

To compile the TypeScript code to JavaScript (output to the `dist` directory, as configured in `tsconfig.json`):

```bash
npm run build
# or
yarn build
```

## Testing

Run the unit and integration tests using Jest:

```bash
npm test
# or
yarn test
```

This will execute the tests defined in the `tests/` directory.

## Usage (Example)

```typescript
import { Interpreter, ToolRegistry, parse } from './src'; // Adjust import path if using built code

async function main() {
  // 1. Create a Tool Registry and add tools
  const registry = new ToolRegistry();
  registry.register(
    'greet', // Tool name
    { // Tool Schema
      name: 'greet',
      description: 'Greets someone',
      parameters: [{ name: 'name', type: 'string', required: true }],
      returns: 'string'
    },
    (args) => { // Tool implementation
      const name = args['name'];
      if (typeof name === 'string') {
        return `Hello, ${name}!`;
      }
      throw new Error('Invalid name provided');
    }
  );

  // 2. Define the NuwaScript code
  const scriptText = `
    LET target = "World"
    LET message = CALL greet { name: target }
    PRINT(message)
    LET time = NOW()
    PRINT(time)
  `;

  // 3. Create the Interpreter
  const interpreter = new Interpreter(registry, (output) => {
    console.log("[NuwaScript Output]:", output);
  });

  try {
    // 4. Parse the script
    const ast = parse(scriptText);

    // 5. Execute the script
    console.log("Executing script...");
    const finalScope = await interpreter.execute(ast);
    console.log("Execution finished.");
    console.log("Final Variables:", Object.fromEntries(finalScope));

  } catch (error) {
    console.error("Script execution failed:", error);
  }
}

main();

```

## TODO / Future Enhancements

- [ ] Implement argument/return type validation in `executeToolCall`.
- [ ] Implement more robust scope management (e.g., nested scopes instead of simple map modifications).
- [ ] Add more built-in functions (e.g., string manipulation, list operations).
- [ ] Improve error reporting with more precise source locations.
- [ ] Add support for list and object literals in the syntax/parser.
