---
name: inspirai-dev
description: >
  This skill should be used when the user says "按照 inspirai 模式开发", "inspirai mode",
  "用 inspirai 流程", or when starting a new feature/project that needs structured
  multi-tool workflow orchestration. Defines the development workflow splitting work
  between Claude Code (design/backend/deploy) and Gemini CLI (frontend).
---

# Inspirai Development Mode

Structured development workflow that orchestrates Claude Code, Gemini CLI, and Pencil
for full-stack product delivery.

## Tool Division

| Tool | Responsibilities |
|------|-----------------|
| **Claude Code** | Design, backend dev, deployment, infra, openspec propose |
| **Gemini CLI** | Frontend implementation (receives openspec proposals) |
| **Pencil MCP** | UI/interaction design (.pen files), design review |

## Workflow

```
1. Brainstorm → 2. Design (Pencil) → 3. Plan → 4. Implement → 5. Deploy
```

### Phase 1: Brainstorm & Propose

Invoke `superpowers:brainstorming` to explore requirements, then create an openspec change:

```bash
# Claude Code creates the proposal
# Use: opsx:propose or openspec-propose
```

**Decision gate:** If the task is frontend-heavy, generate a complete openspec proposal
and instruct the user to hand it to Gemini CLI for `apply`.

### Phase 2: UI Design with Pencil

For any task involving UI/interaction:

1. Open or create a `.pen` file via Pencil MCP (`get_editor_state` → `open_document`)
2. Design the interface using `batch_design` operations
3. Review with `get_screenshot` and `batch_get`
4. Iterate until design is approved
5. Export final specs for frontend handoff

**Rule:** Always design in Pencil before writing frontend code. Never skip to code.

### Phase 3: Plan & Architect

Invoke `superpowers:writing-plans` to produce an implementation plan.

Split the plan into:
- **Claude Code tasks** — backend APIs, DB migrations, deployment configs, infra
- **Gemini CLI tasks** — frontend components, pages, styling (delivered via openspec)

### Phase 4: Implement

**For Claude Code tasks** (backend/infra/deploy):

1. Invoke `superpowers:executing-plans` to work through the plan
2. Use `superpowers:test-driven-development` for backend code
3. Use `superpowers:verification-before-completion` before claiming done

**For Gemini CLI tasks** (frontend):

1. Run `opsx:propose` to generate a complete change proposal with:
   - Pencil design references
   - Component specs
   - API contracts from backend work
2. Tell the user: "前端部分已生成 openspec proposal，请在 Gemini CLI 中执行 `apply`"

### Phase 5: Review & Deploy

1. Invoke `superpowers:requesting-code-review` or `coderabbit:review`
2. For deployment, follow CLAUDE.md container/K8s conventions
3. Invoke `superpowers:verification-before-completion` for final check

## Quick Reference: Skill Routing

| Situation | Action |
|-----------|--------|
| New feature request | `superpowers:brainstorming` → this workflow |
| UI/interaction needed | Pencil MCP first, then propose |
| Backend-only task | Claude Code handles end-to-end |
| Frontend-only task | `opsx:propose` → hand to Gemini CLI |
| Full-stack task | Split: Claude Code backend + Pencil design + propose frontend to Gemini |
| Bug fix | `superpowers:systematic-debugging` (skip this workflow) |
| Code complete | `superpowers:verification-before-completion` |

## Scripts

Run the workflow check script to validate current project state:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-workflow.sh
```
