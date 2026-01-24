#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/http_api.sh"

# 截图并保存
wxm_screenshot_take() {
  local output_file=$1
  wxm_api_screenshot "$output_file"
}

# 跳转到指定页面后截图
wxm_screenshot_page() {
  local page_path=$1
  local output_file=$2

  wxm_api_navigate "$page_path"
  sleep 1
  wxm_screenshot_take "$output_file"
}

# 对比两张截图
# 参数:
#   $1: image1 - 第一张图片路径
#   $2: image2 - 第二张图片路径
#   $3: diff_output - 差异图输出路径（可选，默认 diff.png）
#   $4: verbose - 是否显示详细信息（可选，true/false，默认 false）
# 返回: 相似度百分比（纯数值，通过 stdout）
# 调试信息通过 stderr 输出
wxm_screenshot_compare() {
  local image1=$1
  local image2=$2
  local diff_output=${3:-diff.png}
  local verbose=${4:-false}

  if ! command -v compare &> /dev/null; then
    echo "ERROR: ImageMagick compare 工具未找到" >&2
    echo "INFO: 安装命令: brew install imagemagick" >&2
    return 1
  fi

  # 调试信息输出到 stderr
  [[ "$verbose" == "true" ]] && echo "🔍 对比截图..." >&2

  # 使用 RMSE 指标计算差异
  local diff_value=$(compare -metric RMSE "$image1" "$image2" "$diff_output" 2>&1 | awk '{print $1}')

  [[ "$verbose" == "true" ]] && echo "差异值: $diff_value" >&2
  [[ "$verbose" == "true" ]] && echo "差异图: $diff_output" >&2

  # 计算相似度百分比（简化算法）
  local similarity=$(echo "scale=2; 100 - ($diff_value / 100)" | bc)

  [[ "$verbose" == "true" ]] && echo "相似度: ${similarity}%" >&2

  # 只输出纯数值到 stdout（便于脚本解析）
  echo "$similarity"
}

# 截图历史管理
wxm_screenshot_history() {
  wxm_config_load
  local screenshot_dir="$WXM_SCREENSHOT_DIR"

  echo "📸 截图历史："
  ls -lht "$screenshot_dir" | head -20
}

# 清理旧截图
wxm_screenshot_cleanup() {
  wxm_config_load
  local screenshot_dir="$WXM_SCREENSHOT_DIR"
  local days=${1:-7}

  echo "🧹 清理 $days 天前的截图..."
  find "$screenshot_dir" -name "*.png" -mtime +$days -delete
  echo "✅ 清理完成"
}
