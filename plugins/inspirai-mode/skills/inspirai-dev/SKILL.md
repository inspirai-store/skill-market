---
name: inspirai-dev
description: >
  This skill should be used when the user says "按照 inspirai 模式开发", "inspirai mode",
  "用 inspirai 流程", "inspirai init", or when starting a new feature/project that needs
  structured multi-tool workflow orchestration. Defines the development workflow splitting
  work between Claude Code (design/backend/deploy) and Gemini CLI (frontend).
---

# Inspirai Development Mode

Structured workflow that separates **decision** (current CLI orchestrates) from
**execution** (task routed to the right CLI).

## CLI Tool

`inspirai` CLI provides project-level commands, similar to openspec:

```bash
# Install (symlink to PATH)
ln -sf ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh /usr/local/bin/inspirai

# Or use directly
bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh <command>
```

### Commands

```bash
inspirai init [--force]       # Initialize inspirai/ in current project
inspirai status               # Show environment + project state
inspirai env                  # Detect CLI environment (JSON output)
inspirai handoff <title>      # Create handoff markdown file
inspirai archive <name>       # Archive completed handoff
```

## Bootstrap Sequence

On first use in a project:

```bash
# 1. Detect CLI environment
bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh env

# 2. Precheck tools (cached after pass, macOS only)
bash ${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh

# 3. Initialize project directory
bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh init
```

Creates `inspirai/` at project root:

```
inspirai/
├── config.yaml        # Routing config (commit this)
├── state.json         # Runtime state (gitignored)
└── handoffs/          # Cross-CLI task handoffs
    └── archive/       # Completed handoffs
```

## Decision vs Execution

| Layer | Rule |
|-------|------|
| **Decision** | Whichever CLI the user is in — it orchestrates |
| **Execution: backend/design/deploy/infra** | Always Claude Code |
| **Execution: frontend** | Always Gemini CLI |
| **Execution: UI mockup** | Always Pencil MCP (before any frontend code) |

### When running in Claude Code

- Backend/design/deploy/infra → execute directly
- Frontend → `inspirai handoff <title>`, tell user to open Gemini CLI

### When running in Gemini CLI

- Frontend → execute directly (check `inspirai/handoffs/` for context)
- Backend/design/deploy → `inspirai handoff <title>`, tell user to open Claude Code

## Workflow Phases

```
inspirai init → Brainstorm → Design (Pencil) → Plan → Implement → Deploy
```

### Phase 1: Brainstorm & Propose

Invoke `superpowers:brainstorming` to explore requirements.

**Decision gate:** Check `can_execute` from `inspirai env`. If task type is in
`should_handoff`, generate a handoff file instead of executing.

### Phase 2: UI Design with Pencil

For any task involving UI/interaction:

1. Open or create `.pen` file via Pencil MCP
2. Design with `batch_design`, review with `get_screenshot`
3. Iterate until approved
4. Export specs → include in handoff if frontend work follows

**Rule:** Always design in Pencil before frontend code. Never skip to code.

### Phase 3: Plan & Architect

Invoke `superpowers:writing-plans`. Split tasks by executor:
- `[claude-code]` — backend APIs, DB migrations, deployment, infra
- `[gemini-cli]` — frontend components, pages, styling

### Phase 4: Implement

**Tasks matching `can_execute`** → execute directly:
- `superpowers:executing-plans` for the plan
- `superpowers:test-driven-development` for backend
- `superpowers:verification-before-completion` before done

**Tasks matching `should_handoff`** → generate handoff:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh handoff <title>
# Then fill in the generated markdown template
```

Tell user: "已生成交接文件 `inspirai/handoffs/<filename>.md`，请在 `<handoff_target>` 中查看并执行。"

### Phase 5: Review & Deploy

1. `superpowers:requesting-code-review` or `coderabbit:review`
2. Follow CLAUDE.md container/K8s conventions
3. `superpowers:verification-before-completion`
4. Archive completed handoffs: `inspirai archive <name>`

## Quick Reference

| Situation | In Claude Code | In Gemini CLI |
|-----------|---------------|---------------|
| New feature | brainstorm → plan → split | read handoff → execute frontend |
| UI design | Pencil MCP → export | read Pencil export from handoff |
| Backend task | execute directly | generate handoff → tell user |
| Frontend task | generate handoff → tell user | execute directly |
| Full-stack | backend + handoff frontend | frontend from handoff |
| Bug fix | `superpowers:systematic-debugging` | fix directly if frontend |

## Slash Commands

- `/use-inspirai` — Full bootstrap: detect → precheck → init → workflow
- `/use-inspirai --force` — Force re-run all checks
