# nuwa-script/implementations/python/examples/generate_with_llm.py
import os
import sys
from typing import Any, Dict

# --- Prerequisites ---
# 1. Install OpenAI library: pip install openai
# 2. Set your OpenAI API key as an environment variable:
#    export OPENAI_API_KEY='your-api-key'
#    (Or configure the client directly below)
# 3. Ensure the nuwa-script library is installed or accessible
#    (e.g., by running pip install -e . in the parent directory)
try:
    from openai import OpenAI
except ImportError:
    print("Error: OpenAI library not found. Please install it: pip install openai")
    sys.exit(1)

# Assuming the nuwa package is installed or in the Python path
try:
    from nuwa.tools import ToolRegistry, ToolSchema, ToolParameter, ToolNotFoundException, ToolExecutionError
    from nuwa.prompts import generate_tools_prompt_section, build_system_prompt
    from nuwa.parser import parse_script
    from nuwa.interpreter import Interpreter, InterpreterError
except ImportError as e:
    print(f"Error importing nuwa modules: {e}")
    print("Please ensure the nuwa-script library is installed correctly (e.g., `pip install -e .` in the parent directory).")
    sys.exit(1)


# --- 1. Define Example Tools and Schemas ---

def get_current_price(token: str) -> float:
    """Mock function to get a token's price."""
    print(f"[Tool Call] get_current_price(token='{token}')")
    prices = {"BTC": 68500.50, "ETH": 3600.20}
    return prices.get(token.upper(), 0.0)

def execute_swap(from_token: str, to_token: str, amount: float) -> str:
    """Mock function to perform a swap."""
    print(f"[Tool Call] execute_swap(from_token='{from_token}', to_token='{to_token}', amount={amount})")
    # Simulate returning a transaction ID
    return f"tx_{hash(f'{from_token}{to_token}{amount}') % 100000}"

def send_reply(message: str) -> bool:
    """Mock function to send a reply."""
    print(f"[Tool Call] send_reply(message='{message}')")
    return True

# Define schemas for the tools
get_price_schema = ToolSchema(
    name="get_price",
    description="Retrieves the current market price of a specified cryptocurrency token.",
    parameters=[ToolParameter(name="token", type="String", description="The token symbol (e.g., 'BTC', 'ETH').")],
    returns="Number (the current price, or 0.0 if not found)",
    callable=get_current_price
)

swap_schema = ToolSchema(
    name="swap",
    description="Executes a cryptocurrency swap between two tokens.",
    parameters=[
        ToolParameter(name="from_token", type="String", description="The token symbol to sell."),
        ToolParameter(name="to_token", type="String", description="The token symbol to buy."),
        ToolParameter(name="amount", type="Number", description="The amount of 'from_token' to sell.")
    ],
    returns="String (a transaction ID for the swap)",
    callable=execute_swap
)

reply_schema = ToolSchema(
    name="reply",
    description="Sends a message back to the user.",
    parameters=[ToolParameter(name="message", type="String", description="The content of the message to send.")],
    returns="Boolean (true if successful)",
    callable=send_reply
)

# Create and populate the registry
registry = ToolRegistry()
registry.register(get_price_schema)
registry.register(swap_schema)
registry.register(reply_schema)


# --- 2. Define Prompt Components ---

TASK_DESCRIPTION = """
Based on the user's request below, generate a NuwaScript script that fulfills the request using the syntax and available tools defined above.
Constraints:
- Use ONLY the available tools listed. Do not make up tools.
- Ensure the syntax is correct according to the NuwaScript specification. Pay attention to curly braces `{}` for arguments.
- Use `CALC` for string concatenation or formatting involving variables (e.g., `CALC { formula: "'Value: ' + str(v)", vars: { v: my_var } }`). The `reply` tool expects a single string message.
- Generate ONLY the NuwaScript code. Do not include explanations, apologies, or any text other than the script itself.
- If the request cannot be fulfilled with the available tools or syntax, respond ONLY with "// Cannot fulfill request."
"""

# Build the full system prompt using the default syntax from prompts.py
system_prompt = build_system_prompt(
    registry=registry,
    task_description=TASK_DESCRIPTION
    # Add few-shot examples here if desired
)

# --- 3. LLM API Interaction Function ---

# Initialize OpenAI client (ensure API key is set in environment or config)
try:
    client = OpenAI()
    # Test connection (optional, but good for early failure)
    client.models.list()
except Exception as e:
    print(f"Error initializing OpenAI client or connecting: {e}")
    print("Please ensure your API key is configured correctly.")
    client = None # Ensure client is None if initialization fails

def generate_nuwa_script_with_openai(user_request: str, sys_prompt: str) -> str:
    """Generates NuwaScript code using the OpenAI API."""
    if client is None:
        return "// OpenAI client not initialized."

    print("\n--- Sending Request to LLM ---")
    print(f"User Request: {user_request}")
    # print(f"System Prompt:\n{sys_prompt}") # Uncomment to debug the full system prompt

    try:
        response = client.chat.completions.create(
            model="gpt-4o", # Or "gpt-3.5-turbo", etc.
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_request}
            ],
            temperature=0.1, # Low temperature for more predictable code
            max_tokens=400
        )
        generated_script = response.choices[0].message.content.strip()

        # Basic cleanup (remove markdown code blocks if present)
        if generated_script.startswith("```"):
            lines = generated_script.split('\n')
            if len(lines) > 1 and lines[0].strip() != '```': # Check for language specifier like ```nuwa
                 generated_script = '\n'.join(lines[1:])
            else:
                 generated_script = '\n'.join(lines[1:]) # Simple ``` case or just ```
            if generated_script.endswith("```"):
                generated_script = generated_script[:-3].strip()

        return generated_script

    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return f"// Error generating script via LLM: {e}"


# --- 4. Main Execution Logic ---

if __name__ == "__main__":
    user_request = "Check the price of Bitcoin. If it's below $70,000, swap 500 USDT for BTC and tell me the transaction ID. Otherwise, just tell me the current price."

    # Generate the script
    generated_nuwa_code = generate_nuwa_script_with_openai(user_request, system_prompt)

    print("\n--- Generated NuwaScript ---")
    print(generated_nuwa_code)

    # Optional: Validate and Execute
    if generated_nuwa_code and not generated_nuwa_code.startswith("//"):
        print("\n--- Validating Script Syntax ---")
        ast = parse_script(generated_nuwa_code)

        if ast:
            print("Syntax validation successful.")
            print("\n--- Executing Script ---")
            interpreter = Interpreter(tool_registry=registry)
            try:
                interpreter.execute(ast)
                print("\n--- Execution Finished ---")
                print("Final Variables:", interpreter.variables)
            except (InterpreterError, ToolNotFoundException, ToolExecutionError) as e:
                print(f"Execution Error: {e}")
        else:
            print("Syntax validation failed (check parser output for details).")
    elif generated_nuwa_code.startswith("//"):
         print(f"(LLM indicated inability or error: {generated_nuwa_code})") 