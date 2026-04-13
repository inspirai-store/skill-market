#!/bin/bash
# check-workflow.sh — Check current project state for inspirai workflow
# Unlike precheck.sh (tool availability), this checks project-level readiness.

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

echo "=== Inspirai Dev Mode: Project Check ==="
echo ""

# 1. .pen files
PEN_COUNT=$(find . -name "*.pen" -maxdepth 3 2>/dev/null | wc -l | tr -d ' ')
if [ "$PEN_COUNT" -gt 0 ]; then
  pass "Found $PEN_COUNT .pen design file(s)"
else
  warn "No .pen files — create designs with Pencil MCP before frontend work"
fi

# 2. openspec directory
if [ -d ".openspec" ] || [ -d "openspec" ]; then
  pass "OpenSpec directory exists"
  PENDING=$(find .openspec openspec -name "*.md" -path "*/changes/*" 2>/dev/null | wc -l | tr -d ' ')
  [ "$PENDING" -gt 0 ] && echo "  └─ $PENDING change(s) found"
else
  warn "No openspec directory — run 'opsx:propose' to create changes"
fi

# 3. CLAUDE.md
if [ -f "CLAUDE.md" ]; then
  pass "CLAUDE.md found"
else
  warn "No CLAUDE.md — consider adding project instructions"
fi

# 4. Vercel project
if [ -f "vercel.json" ] || [ -f ".vercel/project.json" ]; then
  pass "Vercel project detected"
fi

# 5. Git status
if git rev-parse --is-inside-work-tree &>/dev/null; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  pass "Git repo on branch: $BRANCH"
  DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  [ "$DIRTY" -gt 0 ] && warn "$DIRTY uncommitted change(s)"
else
  fail "Not a git repository"
fi

echo ""
echo "=== Project Check Done ==="
