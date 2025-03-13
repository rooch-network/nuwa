# Rooch Task Handler

A Python-based task handler for processing Rooch tasks.

## Environment Setup

1. Create a Python virtual environment (Python 3.11+ recommended):
```bash
python3 -m venv venv
```

2. Activate the virtual environment:
```bash
# On macOS/Linux
source venv/bin/activate

# On Windows
.\venv\Scripts\activate
```

## Dependencies Installation

Install Python packages:
```bash
pip install -r requirements.txt
```

## Configuration

Create a `config.json` file in the same directory:

```json
{
    "package_id": "0xb5ee31dafd362db98685b17aaf3fb8b20f36746cd0b34a4086fbdf39f13a1c3b",
    "agent_address": "YOUR_AGENT_ADDRESS",
    "poll_interval": 1,
    "debug": true,
    "openai_api_key": "your-api-key",
    "model_name": "gpt-4"
}
```

## Requirements

- Python 3.11+
- Rooch CLI installed and configured
- OpenAI API key (for content processing)

## Dependencies

Main dependencies include:
- browser-use: For browser automation and AI control (uses Playwright internally)
- langchain-openai: For LLM integration
- openai: For content processing
- tiktoken: For token counting
- readability-lxml: For webpage content extraction
- html2text: For HTML to text conversion

For a complete list of dependencies, see `requirements.txt`.

## Usage

1. Make sure your virtual environment is activated:
```bash
source venv/bin/activate  # On macOS/Linux
```

2. Run the task handler:

Normal mode (monitors tasks from blockchain):
```bash
python main.py
```

Debug mode (manual task testing):
```bash
python main.py --debug
```

In debug mode, you can:
- Select task type from available options
- Input task parameters manually
- See task execution results directly in the console
- Test tasks without blockchain interaction

## Features

- Monitors pending tasks for specified AI agent
- Supports task lifecycle management (start, resolve, fail)
- Configurable polling interval
- Debug mode for command logging and manual task testing
- Browser automation for web content processing
- LLM integration for content analysis
