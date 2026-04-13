#!/bin/bash
# detect-env.sh — Detect current AI CLI environment and output routing JSON
# Used by inspirai-mode to separate decision (current CLI) from execution (target CLI)
#
# Output: JSON to stdout
# Exit: 0 always (detection result in JSON, even if unknown)

set -euo pipefail

# --- Detect platform ---
PLATFORM="unknown"

if [[ -n "${CURSOR_PLUGIN_ROOT:-}" ]]; then
  PLATFORM="cursor"
elif [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]] && [[ -z "${COPILOT_CLI:-}" ]]; then
  PLATFORM="claude-code"
elif [[ -n "${COPILOT_CLI:-}" ]]; then
  PLATFORM="copilot-cli"
else
  # No Claude/Copilot vars → likely Gemini CLI or Codex
  # Check for gemini-specific signals
  if [[ -f "GEMINI.md" ]] || [[ -n "${GEMINI_API_KEY:-}" ]]; then
    PLATFORM="gemini-cli"
  fi
fi

# --- Check inspirai/ project state ---
PROJECT_INIT="false"
if [[ -d "inspirai" ]]; then
  PROJECT_INIT="true"
fi

# --- Check precheck cache ---
PRECHECK_OK="false"
if [[ -f "${HOME}/.cache/inspirai-mode/precheck.ok" ]]; then
  PRECHECK_OK="true"
fi

# --- Routing rules ---
# Claude Code: can execute backend, design, deploy, infra
# Gemini CLI: can execute frontend
# Others: decision only, handoff everything

case "$PLATFORM" in
  claude-code|cursor)
    CAN_EXECUTE='["backend","design","deploy","infra"]'
    SHOULD_HANDOFF='["frontend"]'
    HANDOFF_TARGET="gemini-cli"
    ;;
  gemini-cli)
    CAN_EXECUTE='["frontend"]'
    SHOULD_HANDOFF='["backend","design","deploy","infra"]'
    HANDOFF_TARGET="claude-code"
    ;;
  copilot-cli)
    CAN_EXECUTE='[]'
    SHOULD_HANDOFF='["backend","design","deploy","infra","frontend"]'
    HANDOFF_TARGET="claude-code"
    ;;
  *)
    CAN_EXECUTE='[]'
    SHOULD_HANDOFF='["backend","design","deploy","infra","frontend"]'
    HANDOFF_TARGET="claude-code"
    ;;
esac

# --- Output JSON ---
cat <<EOF
{
  "platform": "${PLATFORM}",
  "role": "decision",
  "can_execute": ${CAN_EXECUTE},
  "should_handoff": ${SHOULD_HANDOFF},
  "handoff_target": "${HANDOFF_TARGET}",
  "project_initialized": ${PROJECT_INIT},
  "precheck_passed": ${PRECHECK_OK}
}
EOF
