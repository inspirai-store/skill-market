#!/bin/bash

# 配置文件路径
WXM_CONFIG_FILE=".wxm.yaml"
WXM_GLOBAL_CONFIG="$HOME/.wxm/config.yaml"

# 读取配置值
# 用法: wxm_config_get "dev_tool.http_port"
wxm_config_get() {
  local key=$1
  local config_file=${2:-$WXM_CONFIG_FILE}

  if [[ ! -f "$config_file" ]]; then
    echo ""
    return 1
  fi

  yq eval ".$key" "$config_file" 2>/dev/null || echo ""
}

# 设置配置值
# 用法: wxm_config_set "dev_tool.http_port" "8080"
wxm_config_set() {
  local key=$1
  local value=$2
  local config_file=${3:-$WXM_CONFIG_FILE}

  yq eval ".$key = \"$value\"" -i "$config_file"
}

# 生成默认配置文件
wxm_config_init() {
  local project_path=${1:-.}

  cat > "$WXM_CONFIG_FILE" <<EOF
version: 1.0

dev_tool:
  cli_path: /Applications/wechatwebdevtools.app/Contents/MacOS/cli
  http_port: 62070
  websocket_port: 9420

project:
  path: $project_path
  appid: ""

screenshot:
  output_dir: .wxm/screenshots
  format: png

permissions:
  read_only: auto
  code_modify: confirm
  file_delete: deny

safety:
  auto_backup: true
  max_iterations: 5
  require_git: false
EOF

  echo "✅ 配置文件已生成：$WXM_CONFIG_FILE"
}

# 加载配置到环境变量
wxm_config_load() {
  export WXM_CLI_PATH=$(wxm_config_get "dev_tool.cli_path")
  export WXM_HTTP_PORT=$(wxm_config_get "dev_tool.http_port")
  export WXM_WEBSOCKET_PORT=$(wxm_config_get "dev_tool.websocket_port")
  export WXM_PROJECT_PATH=$(wxm_config_get "project.path")
  export WXM_SCREENSHOT_DIR=$(wxm_config_get "screenshot.output_dir")
}
