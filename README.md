# MiniMax for OpenClaw

This is an OpenClaw skill that provides integration with MiniMax's AI services.

## What This Skill Does

This skill enables OpenClaw to access MiniMax's AI capabilities:

- **Web Search** - Search the internet using MiniMax's search API
- **Image Understanding** - Analyze and describe images using MiniMax's vision-language models
- **LLM Chat** - Have conversations with MiniMax's large language models
- **Translation** - Translate text between different languages

## Installation

This skill is installed as part of OpenClaw. Once installed, the `minimax-use` skill will be automatically available.

## Setup

You'll need a MiniMax API key:

1. Go to https://platform.minimaxi.com
2. Sign up for an account
3. Subscribe to a plan to get your API key
4. Set the `MINIMAX_API_KEY` environment variable

## Usage in OpenClaw

Once configured, you can use MiniMax tools directly in OpenClaw:

```
/minimax-use web_search "your search query"
/minimax-use chat "your message"
```

Or use them as tools in your agent workflow.

## Requirements

- Python 3.8+
- `requests` library
- MiniMax API key

## Documentation

- [SKILL.md](SKILL.md) - Complete skill documentation
- [references/API.md](references/API.md) - Detailed API reference
- [assets/models.json](assets/models.json) - Available models

## License

MIT
