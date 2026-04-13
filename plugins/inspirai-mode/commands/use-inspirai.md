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
ENV_JSON=$(bash ${CLAUDE_PLUGIN_ROOT}/scripts/detect-env.sh)
```

解析输出 JSON，记录 `platform`、`can_execute`、`should_handoff`、`handoff_target`。

- 如果 `platform` 为 `unknown`，提示用户当前 CLI 环境不在支持列表中，仅支持 Claude Code 和 Gemini CLI。

### Step 2: 环境预检

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh {{args}}
```

- `PRECHECK_OK` → 继续
- `PRECHECK_FAIL` → 输出缺失工具安装指引，停止
- `platform_unsupported` → 告知仅支持 macOS，停止
- `--force` 参数透传给脚本

### Step 3: 初始化项目

如果 `project_initialized` 为 `false`：

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init-project.sh
```

创建 `.inspirai/` 目录结构（config.yaml + state.json + handoffs/）。

### Step 4: 进入工作流

读取 `${CLAUDE_PLUGIN_ROOT}/skills/inspirai-dev/SKILL.md` 获取完整工作流。

根据 Step 1 检测到的 `platform` 和 `can_execute` 路由：

- **在 Claude Code 中**：直接处理后端/设计/部署任务。前端任务生成 `.inspirai/handoffs/` 交接文件，提示用户切换到 Gemini CLI。
- **在 Gemini CLI 中**：直接处理前端任务。检查 `.inspirai/handoffs/` 是否有待处理的交接文件。后端任务生成交接文件，提示用户切换到 Claude Code。
- **在其他 CLI 中**：仅做决策和规划，所有执行任务生成交接文件。

### Step 5: 按 Phase 执行

按 SKILL.md 中 Phase 1-5 流程执行，跳过当前任务不需要的阶段。
