#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

# 检查微信开发者工具是否安装
wxm_validate_devtool_installed() {
  local cli_path=$1

  if [[ ! -f "$cli_path" ]]; then
    echo "❌ 未找到微信开发者工具 CLI"
    echo "   预期路径：$cli_path"
    echo ""
    echo "请检查："
    echo "  1. 微信开发者工具是否已安装"
    echo "  2. CLI 路径是否正确"
    return 1
  fi

  echo "✅ 微信开发者工具 CLI: $cli_path"
  return 0
}

# 自动检测微信开发者工具 HTTP API 端口
wxm_detect_http_port() {
  local ide_dir="$HOME/Library/Application Support/微信开发者工具/"

  # 查找最新的 .ide 文件
  local port_file=$(find "$ide_dir" -name ".ide" 2>/dev/null | head -1)

  if [[ -f "$port_file" ]]; then
    cat "$port_file" 2>/dev/null
    return 0
  fi

  # 如果找不到端口文件，尝试扫描常见端口
  for port in 62070 8080 9090; do
    if curl -s --connect-timeout 1 "http://localhost:$port/" > /dev/null 2>&1; then
      echo "$port"
      return 0
    fi
  done

  return 1
}

# 检查 HTTP API 服务是否开启
wxm_validate_http_api() {
  local port=$1

  # 尝试自动检测端口
  if [[ -z "$port" ]] || ! curl -s --connect-timeout 1 "http://localhost:$port/" > /dev/null 2>&1; then
    echo "⚠️  配置的端口 $port 无响应，尝试自动检测..."
    port=$(wxm_detect_http_port)

    if [[ -z "$port" ]]; then
      echo "❌ HTTP API 服务未找到"
      echo ""
      echo "请确认："
      echo "  1. 微信开发者工具已启动"
      echo "  2. 设置 → 安全设置 → 已开启服务端口"
      return 1
    fi

    echo "✅ 检测到端口：$port"
    echo "   建议更新配置：yq eval \".dev_tool.http_port = $port\" -i .wxm.yaml"
  fi

  echo "✅ HTTP API 服务: http://localhost:$port"
  return 0
}

# 检查项目配置文件
wxm_validate_project() {
  local project_path=$1

  if [[ ! -f "$project_path/project.config.json" ]]; then
    echo "⚠️  当前目录不是微信小程序项目"
    echo "   未找到 project.config.json"
    echo ""
    read -p "请输入小程序项目路径: " project_path

    if [[ ! -f "$project_path/project.config.json" ]]; then
      echo "❌ 无效的项目路径"
      return 1
    fi
  fi

  echo "✅ 项目路径: $project_path"
  return 0
}

# 检查必需的工具依赖
wxm_validate_dependencies() {
  local missing=()

  for tool in jq curl yq; do
    if ! command -v $tool &> /dev/null; then
      missing+=($tool)
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "❌ 缺少必需的工具: ${missing[*]}"
    echo ""
    echo "请安装："
    echo "  brew install ${missing[*]}"
    return 1
  fi

  echo "✅ 工具依赖: jq, curl, yq"
  return 0
}

# 检查可选的工具依赖
wxm_validate_optional_dependencies() {
  local missing=()

  for tool in convert wscat; do
    if ! command -v $tool &> /dev/null; then
      missing+=($tool)
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "⚠️  缺少可选工具: ${missing[*]}"
    echo ""
    echo "建议安装（用于截图对比和日志监听）："
    echo "  brew install imagemagick"
    echo "  npm install -g wscat"
  else
    echo "✅ 可选工具: imagemagick, wscat"
  fi
}

# 完整的环境校验
wxm_validate_all() {
  echo "🔍 检查环境配置..."
  echo ""

  wxm_config_load

  local errors=0

  wxm_validate_dependencies || ((errors++))
  wxm_validate_optional_dependencies
  wxm_validate_devtool_installed "$WXM_CLI_PATH" || ((errors++))
  wxm_validate_http_api "$WXM_HTTP_PORT" || ((errors++))
  wxm_validate_project "$WXM_PROJECT_PATH" || ((errors++))

  echo ""
  if [[ $errors -eq 0 ]]; then
    echo "✅ 环境检查通过！"
    return 0
  else
    echo "❌ 发现 $errors 个问题，请修复后重试"
    return 1
  fi
}
