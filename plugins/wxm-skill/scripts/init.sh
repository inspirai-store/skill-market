#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/utils/config.sh"
source "$SCRIPT_DIR/utils/validation.sh"

wxm_init() {
  echo "🚀 wxm-skill 初始化"
  echo ""

  # 检查是否已存在配置文件
  if [[ -f "$WXM_CONFIG_FILE" ]]; then
    read -p "配置文件已存在，是否覆盖？[y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "取消初始化"
      return 0
    fi
  fi

  # 生成配置文件
  local project_path="."

  # 检查当前目录是否是小程序项目
  if [[ -f "project.config.json" ]]; then
    project_path=$(pwd)
    echo "✅ 检测到小程序项目：$project_path"
  else
    read -p "请输入小程序项目路径 [.]: " project_path
    project_path=${project_path:-.}
  fi

  wxm_config_init "$project_path"

  echo ""
  echo "🔍 检查环境..."
  echo ""

  # 执行环境校验
  if wxm_validate_all; then
    echo ""
    echo "🎉 初始化完成！"
    echo ""
    echo "下一步："
    echo "  /wxm compile          # 编译项目"
    echo "  /wxm screenshot       # 截图"
    echo "  /wxm iterate \"需求\"   # UI 迭代"
  else
    echo ""
    echo "⚠️  初始化完成，但环境检查发现问题"
    echo "   请根据提示修复后再使用"
  fi
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  wxm_init
fi
