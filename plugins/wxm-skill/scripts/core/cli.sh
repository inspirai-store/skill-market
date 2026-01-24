#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/../utils/config.sh"

# 通用 CLI 调用
wxm_cli_call() {
  wxm_config_load

  if [[ ! -f "$WXM_CLI_PATH" ]]; then
    echo "❌ CLI 工具未找到：$WXM_CLI_PATH"
    return 1
  fi

  "$WXM_CLI_PATH" "$@"
}

# 打开项目
wxm_cli_open() {
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "📂 打开项目：$project_path"
  wxm_cli_call --open "$project_path"
}

# 构建 npm
wxm_cli_build_npm() {
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "📦 构建 npm..."
  wxm_cli_call --build-npm "$project_path"
}

# 预览
wxm_cli_preview() {
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "👀 生成预览..."
  wxm_cli_call --preview "$project_path" --preview-qr-format=terminal
}

# 上传代码
wxm_cli_upload() {
  local project_path=${1:-$WXM_PROJECT_PATH}
  local version=$2
  local desc=$3

  if [[ -z "$version" ]]; then
    echo "❌ 请提供版本号"
    return 1
  fi

  echo "📤 上传代码 v$version..."
  wxm_cli_call --upload "$project_path@$version" --upload-desc "$desc"
}

# 自动化测试
wxm_cli_test() {
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "🧪 运行自动化测试..."
  wxm_cli_call --auto-test "$project_path"
}
