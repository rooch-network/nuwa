# Nuwa Script Tools Specification

Tools are the primary mechanism for Nuwa Script to interact with the external environment, perform actions, or access data beyond the script's basic capabilities. They are essentially external functions registered with the Nuwa Script interpreter.

## Core Concepts

1.  **Invocation:** Tools are invoked from Nuwa Script using the `CALL` keyword, either as a statement or as an expression.
    ```nuwa
    // CALL as a statement
    CALL send_message { channel: "general", text: "Hello!" }

    // CALL as an expression (result assigned to a variable)
    LET user_data = CALL get_user_profile { user_id: "123" }
    ```

2.  **Definition:** Each tool consists of two main parts:
    *   **Schema (`ToolSchema`):** Defines the tool's interface.
    *   **Implementation (`ToolFunction`):** The actual code (e.g., TypeScript/JavaScript function) that executes the tool's logic.

3.  **Registration:** Tools must be registered with a `ToolRegistry` instance before they can be called from a script. The registry maps tool names to their schema and implementation.

## Tool Schema (`ToolSchema`)

The schema provides a structured description of a tool, used for validation, documentation, and potentially by AI models to understand how to use the tool.

**Interface:**

```typescript
interface ToolSchema {
  name: string;          // Unique name used in CALL statements (case-sensitive).
  description: string;   // Natural language description of what the tool does.
  parameters: ToolParameter[]; // List of parameters the tool accepts.
  returns: NuwaType;     // The expected data type of the value returned by the tool.
}

interface ToolParameter {
  name: string;          // Name of the parameter.
  description: string;   // Natural language description of the parameter.
  type: NuwaType;        // Expected data type of the parameter.
  required?: boolean;    // Whether the parameter is mandatory (defaults to true if omitted).
}

// Represents the basic data types usable in schemas and state
// ('any' allows any valid JSON value)
type NuwaType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object' | 'any';
```

**Example:**

```typescript
const getUserSchema: ToolSchema = {
  name: "get_user_profile",
  description: "Retrieves a user's profile information based on their ID.",
  parameters: [
    { name: "user_id", type: "string", description: "The unique identifier of the user.", required: true }
  ],
  returns: "object" // Expects to return a user profile object
};
```

## Tool Implementation (`ToolFunction`)

This is the actual function executed when the tool is called. It receives evaluated arguments and a context object.

**Signature:**

```typescript
// Represents the key-value pairs passed to a tool after evaluation
type EvaluatedToolArguments = { [key: string]: JsonValue };

// Basic JSON-compatible value types
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// The function signature for a tool implementation
type ToolFunction = (
    args: EvaluatedToolArguments, // The evaluated arguments passed in the CALL
    context: ToolContext        // Context object for state interaction etc.
) => JsonValue | Promise<JsonValue>; // Can return a value directly or a Promise
```

**Arguments (`args`):** The `args` object contains the arguments passed in the `CALL` statement, already evaluated to their `JsonValue` representations by the interpreter.

**Context (`context`):** See the `ToolContext` section below.

**Return Value:** The function should return a `JsonValue` or a `Promise` resolving to a `JsonValue`, matching the `returns` type specified in the `ToolSchema`. The interpreter handles unwrapping the Promise.

**Example:**

```typescript
const getUserFunc: ToolFunction = async (args, context) => {
  const userId = args['user_id'] as string;
  console.log(`Fetching profile for user: ${userId}`);

  // Simulate fetching data
  await new Promise(resolve => setTimeout(resolve, 100));
  const profile = { id: userId, name: "Alice", email: "alice@example.com" };

  // Optionally interact with state via context
  context.setState('last_fetched_user_id', userId);

  return profile; // Return the user profile object (JsonValue)
};
```

## Tool Context (`ToolContext`)

An optional context object can be passed to the `ToolFunction` during execution. This provides a way for tools to interact with the interpreter's state or access other relevant information.

**Interface:**

```typescript
interface ToolContext {
  // State Management
  setState(key: string, value: JsonValue, metadata?: StateMetadata): void;
  getStateValue(key: string): JsonValue | undefined;
  hasState(key: string): boolean;
  getAllState(): Map<string, JsonValue>;
  clearState(): void;

  // State Metadata (Optional)
  getStateMetadata(key: string): StateMetadata | undefined;
  getAllStateMetadata(): Map<string, StateMetadata>;
  registerStateMetadata(key: string, metadata: StateMetadata): void;

  // Potentially other context info could be added here (e.g., security tokens, user identity)
}

// Optional metadata for state values
interface StateMetadata {
    description: string; // Description of the state variable
    formatter?: (value: JsonValue) => string; // Optional function to format the value for display/prompts
}

// Helper type combining value and metadata
interface StateValueWithMetadata {
    value: JsonValue;
    metadata?: StateMetadata;
}
```

**State Interaction:** The primary use of the context is to allow tools to read from and write to a shared key-value state managed by the `ToolRegistry`. This enables tools to share information or maintain state across multiple `CALL`s within a single script execution.

**Metadata:** Tools can optionally associate metadata (like descriptions and formatters) with state variables, which can be useful for observability or generating prompts for AI models.

## Tool Registry (`ToolRegistry`)

The `ToolRegistry` is the central component responsible for managing tools and state.

**Key Responsibilities:**

*   **Registration:** Provides a `register(name, schema, execute)` method to add new tools.
*   **Lookup:** Provides `lookup(name)` and `getSchema(name)` methods for the interpreter to find tools and their schemas.
*   **State Management:** Manages the shared key-value state accessible via the `ToolContext`.
*   **Context Creation:** Provides a `createToolContext()` method to generate the context object passed to tool functions.

Typically, an application using the Nuwa Script interpreter will create a `ToolRegistry` instance, register all the necessary tools, and then pass the registry to the interpreter.
