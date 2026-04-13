---
name: inspirai-dev
description: >
  This skill should be used when the user says "按照 inspirai 模式开发", "inspirai mode",
  "用 inspirai 流程", or when starting a new feature/project that needs structured
  multi-tool workflow orchestration. Defines the development workflow splitting work
  between Claude Code (design/backend/deploy) and Gemini CLI (frontend).
---

# Inspirai Development Mode

Structured workflow that separates **decision** (current CLI orchestrates) from
**execution** (task routed to the right CLI).

## Bootstrap Sequence

Run these scripts in order on first use. Each is cached/idempotent after first pass.

```bash
# 1. Detect current CLI environment
ENV_JSON=$(bash ${CLAUDE_PLUGIN_ROOT}/scripts/detect-env.sh)

# 2. Environment precheck (cached after pass, macOS only)
bash ${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh

# 3. Initialize project (creates .inspirai/ if missing)
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init-project.sh
```

Parse `ENV_JSON` to determine routing. Key fields:
- `platform` — current CLI (`claude-code`, `gemini-cli`, `cursor`, `copilot-cli`)
- `can_execute` — task types this CLI handles directly
- `should_handoff` — task types to delegate via handoff file
- `handoff_target` — which CLI receives the handoff

## Decision vs Execution

| Layer | Rule |
|-------|------|
| **Decision** | Whichever CLI the user is in right now — it orchestrates |
| **Execution: backend/design/deploy/infra** | Always Claude Code |
| **Execution: frontend** | Always Gemini CLI |
| **Execution: UI mockup** | Always Pencil MCP (before any frontend code) |

### When running in Claude Code

- Backend/design/deploy/infra tasks → execute directly
- Frontend tasks → generate handoff to `.inspirai/handoffs/`, tell user to open Gemini CLI

### When running in Gemini CLI

- Frontend tasks → execute directly (read handoff from `.inspirai/handoffs/` if available)
- Backend/design/deploy tasks → generate handoff, tell user to open Claude Code

## Workflow Phases

```
Precheck → Brainstorm → Design (Pencil) → Plan → Implement → Deploy
```

### Phase 1: Brainstorm & Propose

Invoke `superpowers:brainstorming` to explore requirements.

**Decision gate:** Check `can_execute` from detect-env. If task type is in
`should_handoff`, generate a handoff file instead of executing.

### Phase 2: UI Design with Pencil

For any task involving UI/interaction:

1. Open or create `.pen` file via Pencil MCP
2. Design with `batch_design`, review with `get_screenshot`
3. Iterate until approved
4. Export specs → include in handoff if frontend work follows

**Rule:** Always design in Pencil before frontend code. Never skip to code.

### Phase 3: Plan & Architect

Invoke `superpowers:writing-plans` to produce an implementation plan.

Split into tasks tagged by executor:
- `[claude-code]` — backend APIs, DB migrations, deployment, infra
- `[gemini-cli]` — frontend components, pages, styling

### Phase 4: Implement

**Tasks matching `can_execute`** → execute directly:
- `superpowers:executing-plans` for the plan
- `superpowers:test-driven-development` for backend
- `superpowers:verification-before-completion` before done

**Tasks matching `should_handoff`** → generate handoff markdown:

```bash
# Handoff file goes to .inspirai/handoffs/
# Format: YYYY-MM-DD-<brief-topic>.md
```

Handoff file template:

```markdown
# Handoff: <title>
- **From:** <current platform>
- **To:** <handoff_target>
- **Date:** <ISO date>

## Context
<what was done so far, decisions made>

## Task
<what needs to be implemented>

## Design References
<Pencil .pen file paths, screenshots, API contracts>

## Acceptance Criteria
<how to verify the work is correct>
```

Tell user: "已生成交接文件 `.inspirai/handoffs/<filename>.md`，请在 `<handoff_target>` 中查看并执行。"

### Phase 5: Review & Deploy

1. `superpowers:requesting-code-review` or `coderabbit:review`
2. Follow CLAUDE.md container/K8s conventions
3. `superpowers:verification-before-completion`

## Quick Reference

| Situation | In Claude Code | In Gemini CLI |
|-----------|---------------|---------------|
| New feature | brainstorm → plan → split | read handoff → execute frontend |
| UI design | Pencil MCP → export | read Pencil export from handoff |
| Backend task | execute directly | generate handoff → tell user |
| Frontend task | generate handoff → tell user | execute directly |
| Full-stack | execute backend + handoff frontend | execute frontend from handoff |
| Bug fix | `superpowers:systematic-debugging` | fix directly if frontend |

## Commands

- `/use-inspirai` — Detect env → precheck → init → enter workflow
- `/use-inspirai --force` — Force re-run all checks

## Scripts

| Script | Purpose |
|--------|---------|
| `detect-env.sh` | Detect CLI platform, output routing JSON |
| `precheck.sh` | Tool chain check (cached) |
| `init-project.sh` | Create `.inspirai/` in project root |
| `check-workflow.sh` | Project state check |
