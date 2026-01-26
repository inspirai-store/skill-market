#!/bin/bash
# Native Messaging Host wrapper script

DIR="$(cd "$(dirname "$0")" && pwd)"

# 尝试不同的 node 路径
if command -v node &> /dev/null; then
  NODE_BIN=$(command -v node)
elif [ -x "/usr/local/bin/node" ]; then
  NODE_BIN="/usr/local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
  NODE_BIN="/opt/homebrew/bin/node"
else
  # fnm 默认路径
  export PATH="$HOME/.local/share/fnm:$PATH"
  eval "$(fnm env 2>/dev/null || true)"
  NODE_BIN=$(command -v node)
fi

exec "$NODE_BIN" "$DIR/src/index.js" "$@"
