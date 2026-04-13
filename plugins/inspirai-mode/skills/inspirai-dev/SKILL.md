---
name: inspirai-dev
description: >
  This skill should be used when the user says "按照 inspirai 模式开发", "inspirai mode",
  "用 inspirai 流程", or when starting a new feature/project that needs structured
  multi-tool workflow orchestration. Defines the development workflow splitting work
  between Claude Code (design/backend/deploy) and Gemini CLI (frontend).
---

# Inspirai Development Mode

Structured workflow orchestrating Claude Code, Gemini CLI, and Pencil for full-stack delivery.

## Prerequisites

Run environment precheck before first use (cached after passing):

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh
```

If output is `PRECHECK_FAIL`, display the missing tool install instructions and stop.
If output is `platform_unsupported`, inform: "Inspirai dev mode 目前仅支持 macOS"。
If output is `PRECHECK_OK`, proceed to workflow. Re-check with `--force` flag.

## Tool Division

| Tool | Responsibilities |
|------|-----------------|
| **Claude Code** | Design, backend dev, deployment, infra, openspec propose |
| **Gemini CLI** | Frontend implementation (receives openspec proposals) |
| **Pencil MCP** | UI/interaction design (.pen files), design review |

## Workflow

```
Precheck → Brainstorm → Design (Pencil) → Plan → Implement → Deploy
```

### Phase 1: Brainstorm & Propose

Invoke `superpowers:brainstorming` to explore requirements, then create an openspec change.

**Decision gate:** If frontend-heavy, generate a complete openspec proposal
and instruct the user to hand it to Gemini CLI for `apply`.

### Phase 2: UI Design with Pencil

For any task involving UI/interaction:

1. Open or create `.pen` file via Pencil MCP (`get_editor_state` → `open_document`)
2. Design with `batch_design` operations
3. Review with `get_screenshot` and `batch_get`
4. Iterate until approved
5. Export specs for frontend handoff

**Rule:** Always design in Pencil before frontend code. Never skip to code.

### Phase 3: Plan & Architect

Invoke `superpowers:writing-plans` to produce an implementation plan.

Split into:
- **Claude Code tasks** — backend APIs, DB migrations, deployment, infra
- **Gemini CLI tasks** — frontend components, pages, styling (via openspec)

### Phase 4: Implement

**Claude Code tasks** (backend/infra/deploy):

1. `superpowers:executing-plans` to work through the plan
2. `superpowers:test-driven-development` for backend code
3. `superpowers:verification-before-completion` before claiming done

**Gemini CLI tasks** (frontend):

1. `opsx:propose` to generate a change proposal with Pencil refs + API contracts
2. Tell user: "前端部分已生成 openspec proposal，请在 Gemini CLI 中执行 apply"

### Phase 5: Review & Deploy

1. `superpowers:requesting-code-review` or `coderabbit:review`
2. Follow CLAUDE.md container/K8s conventions for deployment
3. `superpowers:verification-before-completion` for final check

## Quick Reference

| Situation | Action |
|-----------|--------|
| New feature | `superpowers:brainstorming` → this workflow |
| UI needed | Pencil MCP first, then propose |
| Backend-only | Claude Code end-to-end |
| Frontend-only | `opsx:propose` → Gemini CLI |
| Full-stack | Split: CC backend + Pencil + propose frontend to Gemini |
| Bug fix | `superpowers:systematic-debugging` (skip this workflow) |
| Code complete | `superpowers:verification-before-completion` |

## Commands

- `/use-inspirai` — Explicit entry point, runs precheck then enters workflow
- `/use-inspirai --force` — Force re-run environment precheck

## Scripts

- `${CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh` — Environment precheck (cached)
- `${CLAUDE_PLUGIN_ROOT}/scripts/check-workflow.sh` — Project state check
