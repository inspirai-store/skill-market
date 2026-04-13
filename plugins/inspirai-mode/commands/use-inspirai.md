---
description: 启用 Inspirai 开发模式 — 检测环境、预检工具链、初始化项目后进入工作流
argument-hint: [--force 强制重新检测]
allowed-tools: [Bash, Read, Write, Glob, Grep, Agent, Skill]
---

# /use-inspirai

启用 Inspirai 开发模式。

## 执行流程

### Step 1: 检测 CLI 环境

```bash
ENV_JSON=$(bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh env)
```

解析 `platform`、`can_execute`、`should_handoff`、`handoff_target`。
`platform` 为 `unknown` 时提示仅支持 Claude Code 和 Gemini CLI。

### Step 2: 环境预检

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh {{args}}
```

- `PRECHECK_OK` → 继续
- `PRECHECK_FAIL` → 输出安装指引，停止
- `platform_unsupported` → 告知仅支持 macOS，停止

### Step 3: 初始化项目

如果 `project_initialized` 为 `false`：

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh init
```

创建 `inspirai/` 目录（config.yaml + state.json + handoffs/）。

### Step 4: 检查待处理 handoffs

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh status
```

如果有待处理的 handoff 文件，读取并展示给用户，询问是否优先处理。

### Step 5: 进入工作流

读取 `${CLAUDE_PLUGIN_ROOT}/skills/inspirai-dev/SKILL.md` 获取完整工作流。

根据 `platform` 和 `can_execute` 路由：
- **Claude Code**：直接处理后端/设计/部署。前端生成 handoff。
- **Gemini CLI**：直接处理前端。后端生成 handoff。
- **其他 CLI**：仅做决策和规划，所有执行生成 handoff。

按 SKILL.md Phase 1-5 执行，跳过当前任务不需要的阶段。
