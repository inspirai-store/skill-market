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
| [gen](./plugins/gen-skill/) | 通用素材生成 - AI 图片/视频/音频/文本/截图，支持多 Provider |
| [apispec](./plugins/apispec-skill/) | API 规范管理工具 - 跨项目 API 文档的初始化、更新、查询与搜索 |
| [aliyun](./plugins/aliyun-skill/) | 阿里云资源管理 - ECS、OSS、DNS、RDS、ACK、ACR、SLB、AI |
| [wxm](./plugins/wxm-skill/) | 微信小程序开发调试 - 编译、截图、日志、测试与 UI 迭代 |
| [deploy](./plugins/deploy-skill/) | 智能部署 - 自动检测策略，预检查、发布、监控一体化 |
| [audit](./plugins/skill-audit/) | Skill 重叠分析 - 检测功能重复，辅助精简配置 |

## Install a specific plugin

```bash
claude plugin install gen@skill-market
```

## License

MIT
