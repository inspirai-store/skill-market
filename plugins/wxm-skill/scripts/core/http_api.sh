#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/../utils/config.sh"

# 通用 HTTP API 调用
wxm_api_call() {
  local endpoint=$1
  local method=${2:-GET}
  local data=$3

  wxm_config_load

  local url="http://localhost:${WXM_HTTP_PORT}${endpoint}"

  if [[ -n "$data" ]]; then
    curl -s -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "$url"
  fi
}

# 构建 npm（微信开发者工具的编译方式）
wxm_api_compile() {
  wxm_config_load
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "🔨 构建 npm..."

  local response=$(wxm_api_call "/v2/buildnpm?project=$(urlencode "$project_path")" "GET")

  # HTTP API 返回空表示成功
  if [[ -z "$response" || "$response" == "{}" ]]; then
    echo "✅ 构建成功"
    return 0
  else
    echo "❌ 构建失败"
    echo "$response"
    return 1
  fi
}

# URL 编码函数
urlencode() {
  local string="$1"
  echo "$string" | jq -sRr @uri
}

# 打开项目（会启动/刷新模拟器）
wxm_api_open() {
  wxm_config_load
  local project_path=${1:-$WXM_PROJECT_PATH}

  echo "📱 打开项目..."

  local response=$(wxm_api_call "/v2/open?project=$(urlencode "$project_path")" "GET")

  if [[ -z "$response" || "$response" == "{}" ]]; then
    echo "✅ 项目已打开"
    return 0
  else
    echo "$response"
    return 1
  fi
}

# 重新加载（通过重新打开项目实现）
wxm_api_reload() {
  echo "🔄 重新加载项目..."
  wxm_api_open "$@"
}

# 截图
# 注意：HTTP API 不支持截图功能，需要使用 automator
# 参考：https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/miniprogram.html
# 使用 miniProgram.screenshot(options) 方法
wxm_api_screenshot() {
  local output_file=$1

  wxm_config_load
  local screenshot_dir="$WXM_SCREENSHOT_DIR"

  # 创建截图目录
  mkdir -p "$screenshot_dir"

  # 如果未指定输出文件名，使用时间戳
  if [[ -z "$output_file" ]]; then
    output_file="$screenshot_dir/screenshot-$(date +%Y%m%d-%H%M%S).png"
  else
    # 如果是相对路径，放到 screenshot_dir
    if [[ "$output_file" != /* ]]; then
      output_file="$screenshot_dir/$output_file"
    fi
  fi

  # 加载 automator 模块
  source "$(dirname "${BASH_SOURCE[0]}")/automator.sh"

  # 调用 automator 截图
  wxm_automator_screenshot "$WXM_PROJECT_PATH" "$output_file"

  if [[ $? -eq 0 ]]; then
    echo "$output_file"
    return 0
  else
    return 1
  fi
}

# 跳转页面
# 注意：HTTP API 不支持页面导航，需要使用 automator
# 参考：https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/miniprogram.html
# 使用 miniProgram.navigateTo(url) 方法
wxm_api_navigate() {
  local page_path=$1
  local method=${2:-navigateTo}

  if [[ -z "$page_path" ]]; then
    echo "❌ 请提供页面路径"
    return 1
  fi

  wxm_config_load

  # 加载 automator 模块
  source "$(dirname "${BASH_SOURCE[0]}")/automator.sh"

  # 调用 automator 导航
  wxm_automator_navigate "$WXM_PROJECT_PATH" "$page_path" "$method"

  return $?
}

# 获取项目信息
wxm_api_project_info() {
  wxm_api_call "/project/info" "GET" | jq .
}
