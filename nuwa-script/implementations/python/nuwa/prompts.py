from typing import List, Dict
# Assuming ToolRegistry, ToolSchema, ToolParameter are in .tools
from .tools import ToolRegistry, ToolSchema, ToolParameter

def _format_tool_parameter(param: ToolParameter) -> str:
    """Formats a single tool parameter for the prompt."""
    type_str = f": {param.type}"
    req_str = "" if param.required else " (optional)"
    desc_str = f" - {param.description}" if param.description else ""
    return f"{param.name}{type_str}{req_str}{desc_str}"

def _format_tool_schema(schema: ToolSchema, index: int) -> str:
    """Formats a ToolSchema into a string block for the prompt."""
    lines = []
    lines.append(f"{index}. {schema.name}")
    if schema.description:
        lines.append(f"   - Description: {schema.description}")

    if schema.parameters:
        param_strs = [_format_tool_parameter(p) for p in schema.parameters]
        # Format parameters clearly, potentially one per line if many
        if len(param_strs) > 2: # Heuristic: put multiple params on new lines
             param_block = "\n     ".join(param_strs)
             lines.append(f"   - Inputs: {{\n     {param_block}\n   }}")
        else:
             lines.append(f"   - Inputs: {{ {', '.join(param_strs)} }}")
    else:
        lines.append("   - Inputs: {} (no arguments)")

    if schema.returns:
        lines.append(f"   - Outputs: {schema.returns}")

    return "\n".join(lines)

def generate_tools_prompt_section(registry: ToolRegistry) -> str:
    """
    Generates the 'Available Tools' section of the system prompt
    based on the tools registered in the ToolRegistry.

    Args:
        registry: The ToolRegistry instance containing registered tools.

    Returns:
        A formatted string describing the available tools for the LLM prompt.
    """
    if not registry or not registry.list_tools():
        return "No tools are available."

    tool_sections: List[str] = []
    # Access schemas via the property or internal dict
    registered_schemas: Dict[str, ToolSchema] = registry.schemas

    # Sort tools by name for consistent prompt generation
    sorted_tool_names = sorted(registered_schemas.keys())

    for i, tool_name in enumerate(sorted_tool_names):
        schema = registered_schemas[tool_name]
        tool_sections.append(_format_tool_schema(schema, i + 1))

    # Join sections with double newline for separation
    return "\n\n".join(tool_sections)


# --- Optional: Higher-level prompt builder ---
def build_system_prompt(
    registry: ToolRegistry,
    syntax_spec: str = "", # Provide default or load from file
    task_description: str = "", # Provide default
    examples: str = "" # Provide default or few-shot examples
) -> str:
    """
    Constructs the complete system prompt by combining syntax, tools, task, and examples.
    """
    tools_section = generate_tools_prompt_section(registry)

    # Basic structure, adjust formatting as needed
    prompt_parts = [
        "You are an AI assistant capable of generating NuwaScript code.",
        "NuwaScript is a language for defining agent actions.",
    ]
    if syntax_spec:
        prompt_parts.append("\n### NuwaScript Syntax Specification\n" + syntax_spec)
    if tools_section:
        prompt_parts.append("\n### Available Tools\n" + tools_section)
    if task_description:
        prompt_parts.append("\n### Your Task\n" + task_description)
    if examples:
        prompt_parts.append("\n### Examples\n" + examples)

    return "\n".join(prompt_parts)

# --- Example Usage (for testing prompts.py directly) ---
if __name__ == '__main__':
    # Recreate the example from tools.py for demonstration
    from .tools import ToolRegistry, ToolSchema, ToolParameter # Need these again

    def get_weather(location: str) -> str: return "Cloudy"
    def send_message(channel: str, message: str) -> bool: return True

    # Manually define for example:
    weather_schema = ToolSchema(
        name="get_weather",
        description="Retrieves the current weather forecast.",
        parameters=[ToolParameter(name="location", type="String", description="The city name.")],
        returns="String", callable=get_weather
    )
    message_schema = ToolSchema(
        name="send_message", description="Sends a message.",
        parameters=[
            ToolParameter(name="channel", type="String"),
            ToolParameter(name="message", type="String", required=False, description="Content to send.")
        ],
        returns="Boolean", callable=send_message
    )


    registry = ToolRegistry()
    registry.register(weather_schema)
    registry.register(message_schema)

    print("--- Generated Tools Prompt Section ---")
    tools_prompt = generate_tools_prompt_section(registry)
    print(tools_prompt)

    # Example of building full prompt (using placeholder text)
    syntax = "LET x = 1\nCALL tool {}"
    task = "Generate NuwaScript based on user request. Only output code."
    full_prompt = build_system_prompt(registry, syntax_spec=syntax, task_description=task)
    print("\n--- Generated Full System Prompt (Example) ---")
    print(full_prompt) 