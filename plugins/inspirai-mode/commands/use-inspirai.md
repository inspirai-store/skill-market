---
description: 启用 Inspirai 开发模式 — 预检环境后进入结构化工作流
argument-hint: [--force 强制重新检测环境]
allowed-tools: [Bash, Read, Write, Glob, Grep, Agent, Skill]
---

# /use-inspirai

启用 Inspirai 开发模式。

## 执行流程

1. **环境预检**：运行预检脚本检测工具链是否就绪。

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh {{args}}
```

- 输出 `PRECHECK_OK` → 继续步骤 2
- 输出 `PRECHECK_FAIL` → 输出缺失工具的安装指引，停止流程
- 输出 `platform_unsupported` → 告知用户当前仅支持 macOS，停止流程
- 用户传入 `--force` 参数时透传给脚本，强制重新检测

2. **预检通过后**，加载 inspirai-dev skill 进入工作流：

读取 `${CLAUDE_PLUGIN_ROOT}/skills/inspirai-dev/SKILL.md` 获取完整工作流指引。

3. 按 SKILL.md 中定义的 Phase 1-5 流程执行：
   - Phase 1: Brainstorm（superpowers:brainstorming）
   - Phase 2: UI Design（Pencil MCP）
   - Phase 3: Plan（superpowers:writing-plans）
   - Phase 4: Implement（Claude Code 后端 / opsx:propose 前端交给 Gemini CLI）
   - Phase 5: Review & Deploy

4. 如果当前任务不需要某个 Phase（如纯后端无 UI），跳过对应阶段，但不跳过预检。
