#!/bin/bash
# inspirai — CLI entry point for inspirai dev mode
#
# Usage:
#   inspirai init [--force]       Initialize inspirai/ in current project
#   inspirai status               Show environment and project state
#   inspirai handoff <title>      Create a handoff file
#   inspirai archive <name>       Archive a completed handoff
#   inspirai env                  Detect and show current CLI environment
#
# Install:
#   ln -sf "$(pwd)/scripts/inspirai.sh" /usr/local/bin/inspirai
#   — or —
#   Add to CLAUDE.md / GEMINI.md:
#     alias inspirai="bash ${CLAUDE_PLUGIN_ROOT}/scripts/inspirai.sh"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

usage() {
  cat <<'USAGE'
inspirai — Inspirai Dev Mode CLI

Commands:
  init [--force]       Initialize inspirai/ in current project
  status               Show environment + project state
  env                  Detect current CLI environment (JSON)
  handoff <title>      Create a new handoff markdown file
  archive <name>       Move a handoff to archive/
  help                 Show this message

Examples:
  inspirai init                          # First-time project setup
  inspirai init --force                  # Re-initialize
  inspirai handoff feat-user-profile     # Create handoff file
  inspirai archive feat-user-profile     # Archive completed handoff
USAGE
}

cmd_init() {
  bash "${SCRIPT_DIR}/init-project.sh" "$@"
}

cmd_env() {
  bash "${SCRIPT_DIR}/detect-env.sh"
}

cmd_status() {
  echo -e "${CYAN}=== Inspirai Dev Mode ===${NC}"
  echo ""

  # Environment
  ENV_JSON=$(bash "${SCRIPT_DIR}/detect-env.sh")
  PLATFORM=$(echo "$ENV_JSON" | grep '"platform"' | sed 's/.*: "\(.*\)".*/\1/')
  PROJ_INIT=$(echo "$ENV_JSON" | grep '"project_initialized"' | sed 's/.*: \(.*\)/\1/' | tr -d ',')
  PRECHECK=$(echo "$ENV_JSON" | grep '"precheck_passed"' | sed 's/.*: \(.*\)/\1/' | tr -d ',}')

  echo -e "Platform:    ${GREEN}${PLATFORM}${NC}"
  echo -e "Precheck:    $([ "$PRECHECK" = "true" ] && echo -e "${GREEN}passed${NC}" || echo -e "${YELLOW}not run${NC}")"
  echo -e "Project:     $([ "$PROJ_INIT" = "true" ] && echo -e "${GREEN}initialized${NC}" || echo -e "${YELLOW}not initialized${NC}")"

  # Project details
  if [[ -d "inspirai" ]]; then
    echo ""
    HANDOFF_COUNT=$(find inspirai/handoffs -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    ARCHIVE_COUNT=$(find inspirai/handoffs/archive -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "Handoffs:    ${HANDOFF_COUNT} active, ${ARCHIVE_COUNT} archived"

    if [[ $HANDOFF_COUNT -gt 0 ]]; then
      echo ""
      echo "Active handoffs:"
      for f in inspirai/handoffs/*.md; do
        [[ -f "$f" ]] && echo "  - $(basename "$f" .md)"
      done
    fi
  fi

  echo ""
}

cmd_handoff() {
  local TITLE="${1:-}"
  if [[ -z "$TITLE" ]]; then
    echo -e "${RED}✗${NC} Usage: inspirai handoff <title>"
    exit 1
  fi

  if [[ ! -d "inspirai/handoffs" ]]; then
    echo -e "${RED}✗${NC} inspirai/ not initialized. Run: inspirai init"
    exit 1
  fi

  local DATE=$(date +%Y-%m-%d)
  local FILENAME="inspirai/handoffs/${DATE}-${TITLE}.md"

  if [[ -f "$FILENAME" ]]; then
    echo -e "${YELLOW}⚠${NC} $FILENAME already exists"
    exit 0
  fi

  # Detect current env for From field
  local PLATFORM="unknown"
  if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
    PLATFORM="claude-code"
  elif [[ -f "GEMINI.md" ]]; then
    PLATFORM="gemini-cli"
  fi

  local TARGET="gemini-cli"
  [[ "$PLATFORM" == "gemini-cli" ]] && TARGET="claude-code"

  cat > "$FILENAME" <<EOF
# Handoff: ${TITLE}

- **From:** ${PLATFORM}
- **To:** ${TARGET}
- **Date:** ${DATE}

## Context

<!-- What was done so far, decisions made -->

## Task

<!-- What needs to be implemented -->

## Design References

<!-- Pencil .pen file paths, screenshots, API contracts -->

## Acceptance Criteria

<!-- How to verify the work is correct -->
EOF

  echo -e "${GREEN}✓${NC} Created $FILENAME"
}

cmd_archive() {
  local NAME="${1:-}"
  if [[ -z "$NAME" ]]; then
    echo -e "${RED}✗${NC} Usage: inspirai archive <name>"
    exit 1
  fi

  # Find matching handoff file
  local MATCH=$(find inspirai/handoffs -maxdepth 1 -name "*${NAME}*.md" 2>/dev/null | head -1)
  if [[ -z "$MATCH" ]]; then
    echo -e "${RED}✗${NC} No handoff matching '${NAME}' found"
    exit 1
  fi

  mkdir -p inspirai/handoffs/archive
  mv "$MATCH" inspirai/handoffs/archive/
  echo -e "${GREEN}✓${NC} Archived: $(basename "$MATCH") → inspirai/handoffs/archive/"
}

# --- Main dispatch ---
COMMAND="${1:-help}"
shift 2>/dev/null || true

case "$COMMAND" in
  init)     cmd_init "$@" ;;
  env)      cmd_env ;;
  status)   cmd_status ;;
  handoff)  cmd_handoff "$@" ;;
  archive)  cmd_archive "$@" ;;
  help|-h|--help) usage ;;
  *)
    echo -e "${RED}✗${NC} Unknown command: $COMMAND"
    usage
    exit 1
    ;;
esac
