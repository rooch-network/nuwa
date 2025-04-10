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


class ToolRegistry:
    """
    Manages the registration and calling of external tools for the interpreter.
    """
    def __init__(self):
        self._tools: Dict[str, Callable[..., Any]] = {}

    def register(self, name: str, func: Callable[..., Any]):
        """
        Registers a Python callable as a tool.

        Args:
            name: The name the tool will be called by in NuwaScript.
            func: The Python function or method to execute for this tool.
                  It should accept keyword arguments corresponding to the
                  arguments defined in the NuwaScript CALL.
        """
        if not callable(func):
            raise TypeError(f"Tool implementation for '{name}' must be callable.")
        self._tools[name] = func
        # print(f"Tool registered: {name}") # Debug print - commented out

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
            ToolExecutionError: If the tool function raises an exception during execution.
        """
        if tool_name not in self._tools:
            raise ToolNotFoundException(tool_name)

        tool_func = self._tools[tool_name]
        try:
            # Call the tool function with keyword arguments
            return tool_func(**args)
        except Exception as e:
            # Wrap the original exception for better context
            raise ToolExecutionError(tool_name, e) from e

    def list_tools(self) -> List[str]:
        """Returns a list of names of registered tools."""
        return list(self._tools.keys())

# Example Usage (can be removed or kept for demonstration)
if __name__ == '__main__':
    # Define some example Python functions to act as tools
    def get_weather(location: str) -> str:
        # In a real scenario, this would call an API
        if location == "London":
            return "Cloudy"
        elif location == "Paris":
            return "Sunny"
        else:
            return f"Weather data not available for {location}"

    def send_message(channel: str, message: str) -> bool:
        print(f"Sending message to {channel}: '{message}'")
        # Simulate success
        return True

    # Create a registry and register the tools
    registry = ToolRegistry()
    registry.register("get_weather", get_weather)
    registry.register("send_message", send_message)

    print("\nRegistered tools:", registry.list_tools())

    # Simulate calling tools
    try:
        print("\nCalling get_weather(location='London')")
        weather = registry.call_tool("get_weather", {"location": "London"})
        print(f"Result: {weather}")

        print("\nCalling send_message(channel='alerts', message='System online')")
        success = registry.call_tool("send_message", {"channel": "alerts", "message": "System online"})
        print(f"Result: {success}")

        print("\nCalling unknown tool")
        registry.call_tool("get_stock_price", {"ticker": "ACME"})

    except (ToolNotFoundException, ToolExecutionError) as e:
        print(f"Error: {e}")
