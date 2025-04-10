# NuwaScript - Python Implementation

This directory contains the Python implementation of the NuwaScript interpreter. NuwaScript is a lightweight, structured scripting language designed for AI Agents to define executable logic and actions.

## ✨ Features

This implementation currently supports the following NuwaScript features:

*   **Variable Assignment**: `LET variable = expression`
*   **Tool Invocation**: `CALL tool_name { arg1: value1, ... }` (both as statements and expressions within `LET`)
*   **Conditional Logic**: `IF condition THEN ... END` and `IF condition THEN ... ELSE ... END`
*   **Iteration**: `FOR element IN list_variable DO ... END` (currently iterates over Python lists)
*   **Expression Evaluation**:
    *   Literals: Numbers (int, float), Strings, Booleans (`true`, `false`)
    *   Variables
    *   Binary Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `AND`, `OR`
    *   Unary Operators: `NOT`
    *   Parentheses for grouping: `(expression)`
    *   Basic Member Access: `variable.member` (parsed, assumes `variable` evaluates to a dict)
*   **Built-in Functions**: `NOW()` (returns current Unix timestamp)
*   **Calculation Block**: `CALC { formula: "...", vars: {...} }` (uses `eval()` - **currently unsafe!**)
*   **Comments**: Single-line comments starting with `//`

## 📦 Installation

It is highly recommended to use a Python virtual environment (`venv`) to manage dependencies for this project.

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone https://github.com/rooch-network/nuwa.git # Or your repo URL
    cd nuwa/nuwa-script/implementations/python
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    # Create the environment (e.g., named 'venv')
    python -m venv venv

    # Activate the environment
    # On macOS/Linux (bash/zsh):
    source venv/bin/activate
    # On Windows (cmd.exe):
    # venv\\Scripts\\activate.bat
    # On Windows (PowerShell):
    # venv\\Scripts\\Activate.ps1
    ```
    You should see `(venv)` prepended to your command prompt after activation.

3.  **Install dependencies within the activated environment**:
    Use `pip` to install the package and its dependencies.

    For regular use:
    ```bash
    pip install .
    ```
    For development (including test dependencies like `pytest`). Use quotes around `.[dev]` if your shell (like zsh) requires it:
    ```bash
    pip install -e '.[dev]'
    ```

4.  **Deactivate** (when you are finished):
    ```bash
    deactivate
    ```

## 🚀 Usage

Here's how to use the interpreter:

```python
from nuwa.parser import parse_script
from nuwa.interpreter import Interpreter, InterpreterError
# Import schema classes
from nuwa.tools import ToolRegistry, ToolExecutionError, ToolNotFoundException, ToolSchema, ToolParameter
# Optionally import prompt builder
from nuwa.prompts import generate_tools_prompt_section, build_system_prompt

# 1. Define your NuwaScript
script_content = """
LET user_id = "user-123"
LET user_info = CALL get_user_details { id: user_id }

IF user_info.is_active == true THEN
    CALL send_notification { user: user_id, message: "Welcome back!" }
ELSE
    CALL log_event { event: "inactive_user_login", user: user_id }
END
"""

# 2. Define tool functions and their schemas
def get_user_details_impl(id: str) -> dict:
    print(f"[Tool] Getting details for {id}")
    if id == "user-123": return {"name": "Alice", "is_active": True}
    return {"name": "Unknown", "is_active": False}

def send_notification_impl(user: str, message: str) -> bool:
    print(f"[Tool] Sending to {user}: {message}")
    return True

def log_event_impl(event: str, user: str):
    print(f"[Tool] Logging event '{event}' for user {user}")

# Define schemas
get_user_details_schema = ToolSchema(
    name="get_user_details",
    description="Retrieves details for a given user ID.",
    parameters=[ToolParameter(name="id", type="String", description="The user's unique identifier.")],
    returns="Object (user details)",
    callable=get_user_details_impl
)

send_notification_schema = ToolSchema(
    name="send_notification",
    description="Sends a notification message to a user.",
    parameters=[
        ToolParameter(name="user", type="String", description="The recipient user ID."),
        ToolParameter(name="message", type="String", description="The message content.")
    ],
    returns="Boolean (success status)",
    callable=send_notification_impl
)

log_event_schema = ToolSchema(
    name="log_event",
    description="Logs an event related to a user.",
    parameters=[
        ToolParameter(name="event", type="String", description="The event name/type."),
        ToolParameter(name="user", type="String", description="The user ID associated with the event.")
    ],
    returns="None", # Or specify if it returns something
    callable=log_event_impl
)

# 3. Create registry and register tools via schemas
registry = ToolRegistry()
registry.register(get_user_details_schema)
registry.register(send_notification_schema)
registry.register(log_event_schema)

# 4. (Optional) Generate prompt section for LLM
print("\n--- Tools Prompt Section ---")
tools_prompt = generate_tools_prompt_section(registry)
print(tools_prompt)
# You can combine this with other parts using build_system_prompt(...)

# 5. Parse the script
print("\nParsing script...")
ast = parse_script(script_content)

if ast:
    print("Script parsed successfully.")
    # 6. Create an interpreter instance (with tools)
    interpreter = Interpreter(tool_registry=registry)

    # 7. Execute the script
    try:
        print("Executing script...")
        interpreter.execute(ast)
        print("\nExecution finished.")
        print("Final variables:", interpreter.variables)
    except (InterpreterError, ToolNotFoundException, ToolExecutionError) as e:
        print(f"\nRuntime Error: {e}")
else:
    print("Script parsing failed.")

```

## ✅ Testing

Make sure you are inside the activated virtual environment where you installed the development dependencies.

To run the unit tests, navigate to the `nuwa-script/implementations/python` directory and run `pytest`:

```bash
# Ensure your virtual environment is active
# (venv) ... $
cd nuwa-script/implementations/python
pytest
```

Make sure you have installed the development dependencies (`pip install -e '.[dev]'`)

## 🚧 Limitations & Future Work

This implementation is currently under development and has several limitations:

*   **Unsafe `CALC`**: Uses Python's `eval()` which is **not safe** for untrusted input. This needs to be replaced with a secure math expression evaluator (e.g., `simpleeval`).
*   **Global Scope Only**: All variables share a single global scope. Proper block-level scoping (for `IF`, `FOR`) is not yet implemented.
*   **Basic Error Reporting**: Syntax and runtime errors provide basic messages but lack precise line/column information in many cases.
*   **Limited Built-ins**: Only `NOW()` is implemented. More functions (e.g., string manipulation, math functions) could be added.
*   **Limited Operators**: Only core logical and comparison operators are supported. Arithmetic (`+`, `-`, `*`, `/`) and string concatenation currently require `CALC`.
*   **Basic Member Access**: `variable.member` assumes the base variable holds a dictionary. Deeper access (`a.b.c`) or attribute access on objects is not directly supported by the interpreter logic yet.
*   **No Type System**: No static or runtime type checking beyond basic Python type compatibility during operations.
*   **No Security Sandboxing**: Lacks execution limits (time, memory, loop iterations).

Future work could include addressing these limitations, adding support for script imports/modules, and improving overall robustness and performance.

## 🐛 Troubleshooting

*   **`SSL: CERTIFICATE_VERIFY_FAILED` during `pip install`**:
    *   This error indicates that `pip` cannot verify the SSL certificate of PyPI (pypi.org), often due to network proxy/firewall configurations or outdated system root certificates.
    *   **Try updating certificates**: `pip install --upgrade certifi` within your activated `venv`.
    *   **(macOS)** If you installed Python via the official installer from python.org, run the `Install Certificates.command` script in your `/Applications/Python X.Y` folder.
    *   **Temporary Workaround (Use with caution)**: You can temporarily tell `pip` to trust the PyPI hosts. This bypasses the security check:
        ```bash
        pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -e '.[dev]'
        ```
        It's better to resolve the underlying certificate issue if possible, especially for production environments.

*   **`AssertionError: Multiple .egg-info directories found` during `pip install -e`**:
    *   This usually means previous build attempts left conflicting metadata directories.
    *   **Solution**: Clean up build artifacts from the `nuwa-script/implementations/python` directory:
        ```bash
        rm -rf build/ dist/ *.egg-info/
        ```
    *   Then try the `pip install -e '.[dev]'` command again.


## 📜 License

This code is licensed under the MIT License. See the main project license file for details. (Assuming MIT based on `pyproject.toml`, adjust if different).
