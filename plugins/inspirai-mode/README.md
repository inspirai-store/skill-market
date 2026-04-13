# Inspirai Mode - 多 CLI 协作开发模式

结构化开发工作流——将决策（当前 CLI 协调）与执行（按任务类型路由到对应 CLI）分离，通过 handoff 文件实现 Claude Code 与 Gemini CLI 的无缝协作。

## 核心理念

```
┌─────────────────────────────────────┐
│         Decision Layer              │
│  当前 CLI = 决策者（协调和规划）      │
├─────────────────────────────────────┤
│         Execution Layer             │
│  后端/设计/部署 → Claude Code       │
│  UI 交互稿     → Pencil MCP        │
│  前端开发      → Gemini CLI         │
└─────────────────────────────────────┘
```

## 安装

```bash
# 1. 添加 marketplace
claude plugin marketplace add inspirai-store/skill-market

# 2. 安装插件
claude plugin install inspirai-mode@skill-market
```

## 快速开始

### 方式一：Slash 命令

在 Claude Code 中直接运行：

```
/use-inspirai
```

自动完成环境检测 → 工具链预检 → 项目初始化 → 进入工作流。

### 方式二：`inspirai` CLI

```bash
# 安装 CLI 到 PATH（可选，方便在终端直接调用）
ln -sf $(claude plugin path inspirai-mode)/scripts/inspirai.sh /usr/local/bin/inspirai

# 在项目目录初始化
cd your-project
inspirai init
```

## CLI 命令

```bash
inspirai init [--force]       # 初始化 inspirai/ 目录
inspirai status               # 查看环境 + 交接状态
inspirai env                  # 检测当前 CLI 环境（JSON）
inspirai handoff <title>      # 创建交接文件
inspirai archive <name>       # 归档已完成的交接
inspirai help                 # 帮助信息
```

## 项目目录结构

`inspirai init` 在项目根目录创建：

```
inspirai/
├── config.yaml        # 路由配置（提交到 git）
├── state.json         # 运行状态（自动 gitignore）
└── handoffs/          # 跨 CLI 交接文件
    └── archive/       # 已完成的交接
```

### config.yaml

```yaml
routing:
  backend: claude-code
  design: claude-code
  deploy: claude-code
  infra: claude-code
  frontend: gemini-cli

pencil:
  required_before_frontend: true

handoff:
  format: markdown
  directory: inspirai/handoffs
```

## 工作流

```
inspirai init → Brainstorm → Design (Pencil) → Plan → Implement → Deploy
```

### 1. Brainstorm

使用 `superpowers:brainstorming` 探索需求，明确任务范围。

### 2. UI Design

涉及 UI/交互的任务，先用 **Pencil MCP** 绘制 `.pen` 交互稿，审查通过后再进入开发。

### 3. Plan

使用 `superpowers:writing-plans` 生成实现计划，按执行者标记任务：
- `[claude-code]` — 后端 API、数据库、部署、基础设施
- `[gemini-cli]` — 前端组件、页面、样式

### 4. Implement

- **当前 CLI 能执行的任务** → 直接执行
- **需要交接的任务** → 生成 handoff 文件，提示用户切换 CLI

#### 交接文件示例

```bash
inspirai handoff feat-user-profile
```

生成 `inspirai/handoffs/2026-04-13-feat-user-profile.md`：

```markdown
# Handoff: feat-user-profile
- **From:** claude-code
- **To:** gemini-cli
- **Date:** 2026-04-13

## Context
后端 API 已完成：GET/PUT /user/api/v1/profile

## Task
实现用户个人资料编辑页面

## Design References
- designs/user-profile.pen（Pencil 交互稿）

## Acceptance Criteria
- 页面加载时展示当前用户信息
- 编辑后调用 PUT API 保存
```

### 5. Review & Deploy

代码审查 → 部署 → 归档交接：

```bash
inspirai archive feat-user-profile
```

## 环境检测

`inspirai env` 输出路由 JSON：

```json
{
  "platform": "claude-code",
  "role": "decision",
  "can_execute": ["backend", "design", "deploy", "infra"],
  "should_handoff": ["frontend"],
  "handoff_target": "gemini-cli",
  "project_initialized": true,
  "precheck_passed": true
}
```

支持的 CLI 环境：

| CLI | 检测信号 | 可执行 |
|-----|---------|--------|
| Claude Code | `CLAUDE_PLUGIN_ROOT` | backend, design, deploy, infra |
| Gemini CLI | `GEMINI.md` / `GEMINI_API_KEY` | frontend |
| Cursor | `CURSOR_PLUGIN_ROOT` | 同 Claude Code |
| Copilot CLI | `COPILOT_CLI` | handoff only |

> 注：目前仅支持 macOS 环境。

## 前置要求

- **macOS**（其他平台暂不支持）
- **Claude Code CLI** — `npm i -g @anthropic-ai/claude-code`
- **Gemini CLI** — 参考 [gemini-cli](https://github.com/google-gemini/gemini-cli)
- **Pencil MCP** — 在 Claude Code 中安装 Pencil 插件
- **Node.js** ≥ 18

首次运行 `/use-inspirai` 会自动检测以上工具，通过后缓存结果不再重复检测。使用 `--force` 强制重新检测。

## License

MIT
