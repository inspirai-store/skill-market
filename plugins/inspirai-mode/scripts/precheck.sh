#!/bin/bash
# precheck.sh — One-time environment precheck for inspirai dev mode (macOS only)
# Creates a cache file after passing; subsequent runs skip checks.
#
# Usage: bash precheck.sh [--force]
#   --force  Re-run checks even if cache exists

set -euo pipefail

CACHE_DIR="${HOME}/.cache/inspirai-mode"
CACHE_FILE="${CACHE_DIR}/precheck.ok"

# --- force flag ---
if [[ "${1:-}" == "--force" ]]; then
  rm -f "$CACHE_FILE"
fi

# --- cache hit → skip ---
if [[ -f "$CACHE_FILE" ]]; then
  echo "PRECHECK_OK"
  exit 0
fi

# --- macOS gate ---
if [[ "$(uname -s)" != "Darwin" ]]; then
  cat <<'MSG'
PRECHECK_FAIL
platform_unsupported
Inspirai dev mode 目前仅支持 macOS，其他平台暂不支持。
MSG
  exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MISSING=()
WARNINGS=()

# --- 1. Claude Code CLI ---
if command -v claude &>/dev/null; then
  echo -e "${GREEN}✓${NC} Claude Code CLI"
else
  MISSING+=("claude")
  echo -e "${RED}✗${NC} Claude Code CLI — install: npm i -g @anthropic-ai/claude-code"
fi

# --- 2. Gemini CLI ---
if command -v gemini &>/dev/null; then
  echo -e "${GREEN}✓${NC} Gemini CLI"
else
  MISSING+=("gemini")
  echo -e "${RED}✗${NC} Gemini CLI — install: npm i -g @anthropic-ai/gemini-cli  或参考 https://github.com/google-gemini/gemini-cli"
fi

# --- 3. Pencil MCP ---
# Pencil can be configured as: plugin MCP (.mcp.json), settings.json allowlist, or plugin cache
PENCIL_FOUND=false
# Check .mcp.json files (project, home, plugin dirs)
for f in ".mcp.json" "${HOME}/.claude/.mcp.json" "${HOME}/.claude/plugins/"*"/.mcp.json"; do
  if [[ -f "$f" ]] && grep -q "pencil" "$f" 2>/dev/null; then
    PENCIL_FOUND=true
    break
  fi
done
# Check Claude settings.json (plugin MCP tools are listed there)
if ! $PENCIL_FOUND && [[ -f "${HOME}/.claude/settings.json" ]]; then
  if grep -q "pencil" "${HOME}/.claude/settings.json" 2>/dev/null; then
    PENCIL_FOUND=true
  fi
fi
# Check plugin cache for pencil
if ! $PENCIL_FOUND; then
  if find "${HOME}/.claude/plugins/cache" -name "*.json" -exec grep -l "pencil" {} + &>/dev/null 2>&1; then
    PENCIL_FOUND=true
  fi
fi
if $PENCIL_FOUND; then
  echo -e "${GREEN}✓${NC} Pencil MCP configured"
else
  MISSING+=("pencil")
  echo -e "${RED}✗${NC} Pencil MCP — 需安装 Pencil 插件或在 .mcp.json 中配置 pencil server"
fi

# --- 4. Node.js (common dependency) ---
if command -v node &>/dev/null; then
  NODE_VER=$(node -v)
  echo -e "${GREEN}✓${NC} Node.js ${NODE_VER}"
else
  WARNINGS+=("node")
  echo -e "${YELLOW}⚠${NC} Node.js not found — some tools may need it"
fi

# --- Result ---
echo ""
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo -e "${RED}PRECHECK_FAIL${NC}"
  echo "missing: ${MISSING[*]}"
  echo ""
  echo "请安装缺失的工具后重新运行: bash ${CLAUDE_PLUGIN_ROOT:-\$CLAUDE_PLUGIN_ROOT}/scripts/precheck.sh"
  exit 1
else
  mkdir -p "$CACHE_DIR"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$CACHE_FILE"
  echo -e "${GREEN}PRECHECK_OK${NC}"
  echo "环境检查通过，结果已缓存。再次检查可用 --force 参数。"
  exit 0
fi
