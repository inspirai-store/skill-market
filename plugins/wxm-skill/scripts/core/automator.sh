#!/bin/bash

# WeChat MiniProgram Automator Wrapper
# Bash 包装器用于调用 Node.js automator 脚本

source "$(dirname "${BASH_SOURCE[0]}")/../utils/config.sh"

# 获取 automator 脚本目录
WXM_AUTOMATOR_DIR="$(dirname "${BASH_SOURCE[0]}")/../automator"

# 检查 Node.js 是否可用
wxm_automator_check_node() {
  if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js 才能使用自动化功能"
    echo "   安装: brew install node"
    return 1
  fi

  local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ $node_version -lt 14 ]]; then
    echo "❌ Node.js 版本过低（当前: $(node -v)，需要: >= 14）"
    echo "   更新: brew upgrade node"
    return 1
  fi

  return 0
}

# 检查 automator 依赖是否已安装
wxm_automator_check_deps() {
  if [[ ! -d "$WXM_AUTOMATOR_DIR/node_modules" ]]; then
    echo "⚠️  automator 依赖未安装"
    echo "   正在安装..."
    (cd "$WXM_AUTOMATOR_DIR" && npm install --silent)

    if [[ $? -ne 0 ]]; then
      echo "❌ 依赖安装失败"
      return 1
    fi

    echo "✅ 依赖安装完成"
  fi

  return 0
}

# 启用自动化模式
wxm_automator_enable() {
  wxm_config_load
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "🔧 启用自动化模式..."

  # 调用 HTTP API 启用自动化
  local response=$(curl -s "http://localhost:$WXM_HTTP_PORT/v2/auto?project=$(echo "$project_path" | jq -sRr @uri)")

  # 检查响应
  if echo "$response" | grep -q '"code"'; then
    # 有错误
    echo "❌ 启用失败："
    echo "$response" | jq -r '.message' 2>/dev/null || echo "$response"
    return 1
  fi

  echo "✅ 自动化模式已启用"
  return 0
}

# 截图
wxm_automator_screenshot() {
  wxm_config_load
  local project_path=${1:-$WXM_PROJECT_PATH}
  local output_file=$2

  # 检查环境
  wxm_automator_check_node || return 1
  wxm_automator_check_deps || return 1

  echo "📸 使用 automator 截图..."

  # 构建参数
  local args=("$project_path")
  if [[ -n "$output_file" ]]; then
    args+=("$output_file")
  else
    args+=("--base64")
  fi

  # 调用 Node.js 脚本
  node "$WXM_AUTOMATOR_DIR/screenshot.js" "${args[@]}"

  return $?
}

# 页面导航
wxm_automator_navigate() {
  wxm_config_load
  local project_path=${1:-$WXM_PROJECT_PATH}
  local page_url=$2
  local method=${3:-navigateTo}

  if [[ -z "$page_url" ]]; then
    echo "❌ 请提供页面路径"
    return 1
  fi

  # 检查环境
  wxm_automator_check_node || return 1
  wxm_automator_check_deps || return 1

  echo "🔀 使用 automator 导航..."

  # 调用 Node.js 脚本
  node "$WXM_AUTOMATOR_DIR/navigate.js" "$project_path" "$page_url" "$method"

  return $?
}

# 显示帮助信息
wxm_automator_help() {
  cat <<EOF
微信小程序自动化工具

用法:
  wxm automator enable [project-path]              启用自动化模式
  wxm automator screenshot [project-path] [file]   截图
  wxm automator navigate <page-url> [method]       页面导航

截图:
  不指定文件名则输出 base64 数据
  指定文件名则保存到文件

导航方法:
  navigateTo   - 保留当前页面，跳转（默认）
  redirectTo   - 关闭当前页面，跳转
  reLaunch     - 关闭所有页面，跳转
  switchTab    - 跳转到 tabBar 页面
  navigateBack - 返回上一页

示例:
  wxm automator enable
  wxm automator screenshot . screenshot.png
  wxm automator navigate pages/index/index
  wxm automator navigate pages/home/home switchTab

要求:
  - Node.js >= 14
  - 微信开发者工具已启动
  - 项目已在工具中打开
EOF
}
