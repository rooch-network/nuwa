import dataclasses
from typing import Any, Dict, Callable, List

class ToolNotFoundException(Exception):
    """Exception raised when a requested tool is not found in the registry."""
    def __init__(self, tool_name: str):
        self.tool_name = tool_name
        super().__init__(f"Tool '{tool_name}' not found in the registry.")

class ToolExecutionError(Exception):
    """Exception raised when a tool fails during execution."""
    def __init__(self, tool_name: str, original_exception: Exception):
        self.tool_name = tool_name
        self.original_exception = original_exception
        super().__init__(f"Error executing tool '{tool_name}': {original_exception}")


@dataclasses.dataclass
class ToolParameter:
    """Describes a parameter for a tool."""
    name: str
    type: str # e.g., "String", "Number", "Boolean", "List[String]", "Object"
    description: str = ""
    required: bool = True # Assume required unless specified

@dataclasses.dataclass
class ToolSchema:
    """Describes the schema (metadata and callable) for a tool."""
    name: str
    description: str
    parameters: List[ToolParameter]
    returns: str # e.g., "Number", "String", "Boolean", "Object", "List[Object]"
    callable: Callable[..., Any]


class ToolRegistry:
    """
    Manages the registration and calling of external tools for the interpreter,
    using ToolSchema for metadata.
    """
    def __init__(self):
        # Store ToolSchema objects mapped by tool name
        self._tools: Dict[str, ToolSchema] = {}

    def register(self, schema: ToolSchema):
        """
        Registers a tool using its schema.

        Args:
            schema: A ToolSchema object containing the tool's metadata
                    and callable implementation.

        Raises:
            TypeError: If the provided schema is not a ToolSchema or
                       if the callable is invalid.
        """
        if not isinstance(schema, ToolSchema):
            raise TypeError("Registry expects a ToolSchema object.")
        if not callable(schema.callable):
            raise TypeError(f"Callable implementation missing or invalid for tool '{schema.name}'.")
        if schema.name in self._tools:
            # Optionally raise an error or log a warning on re-registration
            print(f"Warning: Re-registering tool '{schema.name}'")
        self._tools[schema.name] = schema

    def get_schema(self, tool_name: str) -> ToolSchema:
        """Retrieves the schema for a registered tool."""
        if tool_name not in self._tools:
            raise ToolNotFoundException(tool_name)
        return self._tools[tool_name]

    def call_tool(self, tool_name: str, args: Dict[str, Any]) -> Any:
        """
        Executes a registered tool with the given arguments.

        Args:
            tool_name: The name of the tool to call.
            args: A dictionary of evaluated arguments from the script.

        Returns:
            The result returned by the tool function.

        Raises:
            ToolNotFoundException: If the tool is not registered.
            ToolExecutionError: If the tool function raises an exception.
            # Optional: Could add validation errors if args don't match schema
        """
        schema = self.get_schema(tool_name) # Raises ToolNotFoundException if not found
        tool_func = schema.callable

        # Optional: Validate args against schema.parameters here before calling
        # (Check required args are present, types match, etc.)

        try:
            # Call the tool function with keyword arguments
            return tool_func(**args)
        except Exception as e:
            # Wrap the original exception for better context
            raise ToolExecutionError(tool_name, e) from e

    def list_tools(self) -> List[str]:
        """Returns a list of names of registered tools."""
        return list(self._tools.keys())

    @property
    def schemas(self) -> Dict[str, ToolSchema]:
        """Returns the dictionary of registered tool schemas."""
        return self._tools


# Example Usage (Updated)
if __name__ == '__main__':
    # Define example Python functions
    def get_weather(location: str) -> str:
        if location == "London": return "Cloudy"
        elif location == "Paris": return "Sunny"
        else: return f"Weather data not available for {location}"

    def send_message(channel: str, message: str) -> bool:
        print(f"Sending message to {channel}: '{message}'")
        return True

    # Define schemas for the tools
    weather_schema = ToolSchema(
        name="get_weather",
        description="Retrieves the current weather forecast for a given location.",
        parameters=[
            ToolParameter(name="location", type="String", description="The city or area name.")
        ],
        returns="String (e.g., 'Cloudy', 'Sunny')",
        callable=get_weather
    )

    message_schema = ToolSchema(
        name="send_message",
        description="Sends a message to a specified channel.",
        parameters=[
            ToolParameter(name="channel", type="String", description="The target channel name."),
            ToolParameter(name="message", type="String", description="The message content.")
        ],
        returns="Boolean (true if successful)",
        callable=send_message
    )

    # Create registry and register using schemas
    registry = ToolRegistry()
    registry.register(weather_schema)
    registry.register(message_schema)

    print("\nRegistered tools:", registry.list_tools())

    # Simulate calling tools (call_tool usage remains the same)
    try:
        print("\nCalling get_weather(location='London')")
        weather = registry.call_tool("get_weather", {"location": "London"})
        print(f"Result: {weather}")

        print("\nCalling send_message(channel='alerts', message='System online')")
        success = registry.call_tool("send_message", {"channel": "alerts", "message": "System online"})
        print(f"Result: {success}")

    except (ToolNotFoundException, ToolExecutionError) as e:
        print(f"Error: {e}")
