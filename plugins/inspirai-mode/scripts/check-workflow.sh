#!/bin/bash
# check-workflow.sh — Validate inspirai development workflow readiness
# Checks tool availability and project state

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

echo "=== Inspirai Dev Mode: Workflow Check ==="
echo ""

# 1. Check Claude Code
if command -v claude &>/dev/null; then
  pass "Claude Code CLI available"
else
  fail "Claude Code CLI not found"
fi

# 2. Check Gemini CLI
if command -v gemini &>/dev/null; then
  pass "Gemini CLI available"
else
  warn "Gemini CLI not found (needed for frontend tasks)"
fi

# 3. Check for .pen files (Pencil designs)
PEN_COUNT=$(find . -name "*.pen" -maxdepth 3 2>/dev/null | wc -l | tr -d ' ')
if [ "$PEN_COUNT" -gt 0 ]; then
  pass "Found $PEN_COUNT .pen design file(s)"
else
  warn "No .pen files found — create designs with Pencil MCP before frontend work"
fi

# 4. Check for openspec directory
if [ -d ".openspec" ] || [ -d "openspec" ]; then
  pass "OpenSpec directory exists"
  # Count pending changes
  PENDING=$(find .openspec openspec -name "*.md" -path "*/changes/*" 2>/dev/null | wc -l | tr -d ' ')
  [ "$PENDING" -gt 0 ] && echo "  └─ $PENDING change(s) found"
else
  warn "No openspec directory — run 'opsx:propose' to create changes"
fi

# 5. Check CLAUDE.md
if [ -f "CLAUDE.md" ]; then
  pass "CLAUDE.md found"
else
  warn "No CLAUDE.md — consider adding project instructions"
fi

# 6. Check for Vercel project (spiritlink pattern)
if [ -f "vercel.json" ] || [ -f ".vercel/project.json" ]; then
  pass "Vercel project detected"
fi

# 7. Git status
if git rev-parse --is-inside-work-tree &>/dev/null; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  pass "Git repo on branch: $BRANCH"
  DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  [ "$DIRTY" -gt 0 ] && warn "$DIRTY uncommitted change(s)"
else
  fail "Not a git repository"
fi

echo ""
echo "=== Workflow Ready ==="
