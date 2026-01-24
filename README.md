# InspirAI Skill Market

A collection of AI-powered plugins for Claude Code.

## Installation

Add this marketplace to your Claude Code:

```bash
claude plugin marketplace add inspirai-store/skill-market
```

Or in Claude Code interactive mode:
```
/plugin marketplace add inspirai-store/skill-market
```

Then browse and install plugins:
```
/plugin
```

## Available Plugins

| Plugin | Description |
|--------|-------------|
| [generate-asset](./plugins/generate-asset/) | AI Asset Generator - Uses Gemini to generate UI assets matching your project style |
| [apispec](./plugins/apispec-skill/) | API 规范管理工具 - 跨项目 API 文档的初始化、更新、查询与搜索 |

## Install a specific plugin

```bash
claude plugin install generate-asset@skill-market
```

## License

MIT
