#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/../utils/config.sh"

# 监听日志（需要 wscat）
wxm_websocket_logs() {
  local filter=${1:-all}

  wxm_config_load

  if ! command -v wscat &> /dev/null; then
    echo "⚠️  wscat 未安装，使用简化版日志监听"
    echo "   安装 wscat: npm install -g wscat"
    return 1
  fi

  echo "📡 监听日志（端口 $WXM_WEBSOCKET_PORT）..."
  echo "   过滤级别: $filter"
  echo ""

  case $filter in
    error)
      wscat -c "ws://localhost:$WXM_WEBSOCKET_PORT" | \
        jq -r 'select(.type=="log" and .level=="error") | "\(.timestamp) [\(.level)] \(.message)"'
      ;;
    warn)
      wscat -c "ws://localhost:$WXM_WEBSOCKET_PORT" | \
        jq -r 'select(.type=="log" and (.level=="error" or .level=="warn")) | "\(.timestamp) [\(.level)] \(.message)"'
      ;;
    network)
      wscat -c "ws://localhost:$WXM_WEBSOCKET_PORT" | \
        jq -r 'select(.type=="network") | "\(.timestamp) [\(.method)] \(.url) - \(.status)"'
      ;;
    *)
      wscat -c "ws://localhost:$WXM_WEBSOCKET_PORT" | \
        jq -r '"\(.timestamp) [\(.type)] \(.message // .url)"'
      ;;
  esac
}

# 获取最近的日志（不实时监听）
wxm_websocket_recent_logs() {
  local count=${1:-50}

  echo "📋 最近 $count 条日志..."

  # 这里需要 HTTP API 支持获取历史日志
  # 如果不支持，可以考虑本地缓存日志
  echo "⚠️  需要 HTTP API 支持或本地日志缓存"
}
