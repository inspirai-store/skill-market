# project-skill

多 Agent 项目管理工具 — 从想法到立项，自动在 Discord 频道创建项目线程并分配 Agent 任务。

## 前置条件

- OpenClaw 已配置 Discord channel（多 agent + bindings）
- Discord 服务器已创建，每个 Agent 有独立频道
- `~/.openclaw/openclaw.json` 中包含 Discord 配置

## 命令

| 命令 | 说明 |
|------|------|
| `/project:init <项目名>` | 立项：分析需要哪些 Agent，批量创建 Thread，下发初始任务 |
| `/project:discuss <话题>` | 快速讨论：把想法路由到最合适的 Agent 频道 |
| `/project:status [项目名]` | 项目状态：查看活跃项目和各 Thread 最新进展 |

## 工作流

```
想法 → /project:discuss → 讨论 → /project:init → 立项 → /project:status → 跟进
```

## 安装

```bash
openclaw skill install project
```

## 配置

Skill 自动从 `~/.openclaw/openclaw.json` 读取 Discord 配置，无需额外配置。

项目记录保存在 `~/.claude/projects.json`。
