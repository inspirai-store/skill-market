#!/bin/bash
# UI 迭代任务：截图→Claude修改→编译→对比

set -euo pipefail

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 加载依赖模块
source "$PLUGIN_ROOT/utils/config.sh"
source "$PLUGIN_ROOT/core/planning.sh"
source "$PLUGIN_ROOT/core/http_api.sh"
source "$PLUGIN_ROOT/core/screenshot.sh"

# UI 迭代主函数
# 参数：
#   $1: 页面路径（可选，如 pages/index/index）
#   $2: 需求描述（可选）
wxm_task_ui_iterate() {
    local page_path="${1:-}"
    local requirement="${2:-}"

    echo "=== UI 迭代任务 ==="
    echo ""

    # 1. 生成任务计划
    local task_description="UI 迭代任务"
    if [ -n "$requirement" ]; then
        task_description="$task_description: $requirement"
    fi

    if ! wxm_generate_task_plan "ui_iterate" "$task_description"; then
        echo "错误: 任务规划失败"
        return 1
    fi

    # 2. 展示计划并确认
    echo ""
    echo "任务计划已生成，位于: $WXM_TASK_PLAN_FILE"
    echo ""
    wxm_display_task_plan
    echo ""

    # 交互式确认（如果在交互式环境）
    if [ -t 0 ]; then
        read -p "是否执行此计划？(y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "任务已取消"
            return 0
        fi
    fi

    # 3. 初始状态截图
    echo ""
    echo "步骤 1: 截取初始状态"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local before_screenshot
    if [ -n "$page_path" ]; then
        echo "跳转到页面: $page_path"
        if ! wxm_api_navigate "$page_path"; then
            echo "警告: 页面跳转失败，继续截图当前页面"
        fi
        sleep 1  # 等待页面加载
    fi

    before_screenshot=$(wxm_screenshot_take "before_iteration")
    if [ -z "$before_screenshot" ]; then
        echo "错误: 初始截图失败"
        return 1
    fi

    echo "初始截图已保存: $before_screenshot"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 4. 提示 Claude 进行代码修改
    echo "步骤 2: 等待 Claude 修改代码"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "请 Claude 根据需求修改代码:"
    if [ -n "$requirement" ]; then
        echo "  需求: $requirement"
    fi
    echo "  初始截图: $before_screenshot"
    echo ""
    echo "修改完成后，脚本将自动编译并截图验证"
    echo ""

    # 在非交互式环境，这里会自动继续
    # 在交互式环境，等待用户确认已修改
    if [ -t 0 ]; then
        read -p "代码修改完成后按 Enter 继续..." -r
        echo ""
    fi

    # 5. 编译项目
    echo "步骤 3: 编译项目"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if ! wxm_api_compile; then
        echo "错误: 编译失败，请检查代码"
        echo ""
        echo "初始截图路径: $before_screenshot"
        return 1
    fi

    echo "编译成功，重新加载模拟器..."
    wxm_api_reload
    sleep 2  # 等待重新加载
    echo ""

    # 6. 截取修改后的状态
    echo "步骤 4: 截取修改后状态"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local after_screenshot
    after_screenshot=$(wxm_screenshot_take "after_iteration")
    if [ -z "$after_screenshot" ]; then
        echo "错误: 修改后截图失败"
        echo ""
        echo "初始截图路径: $before_screenshot"
        return 1
    fi

    echo "修改后截图已保存: $after_screenshot"
    echo ""

    # 7. 生成对比图（如果安装了 ImageMagick）
    local diff_screenshot=""
    if command -v compare &> /dev/null; then
        echo "步骤 5: 生成对比图"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        local screenshot_dir
        screenshot_dir=$(dirname "$before_screenshot")
        local timestamp
        timestamp=$(date +%Y%m%d_%H%M%S)
        diff_screenshot="$screenshot_dir/diff_${timestamp}.png"

        if compare "$before_screenshot" "$after_screenshot" "$diff_screenshot" 2>/dev/null; then
            echo "对比图已生成: $diff_screenshot"
        else
            echo "注意: 对比图生成失败（图片可能完全相同或差异过大）"
            diff_screenshot=""
        fi
        echo ""
    fi

    # 8. 输出结果摘要
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "UI 迭代任务完成"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "截图结果:"
    echo "  修改前: $before_screenshot"
    echo "  修改后: $after_screenshot"
    if [ -n "$diff_screenshot" ]; then
        echo "  对比图: $diff_screenshot"
    fi
    echo ""
    echo "请 Claude 分析截图，验证修改是否符合预期"
    echo ""

    # 更新任务计划状态（标记完成）
    if [ -f "$WXM_TASK_PLAN_FILE" ]; then
        echo "<!-- COMPLETED: $(date) -->" >> "$WXM_TASK_PLAN_FILE"
    fi

    return 0
}

# 如果直接执行此脚本
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # 加载配置
    if ! wxm_load_config; then
        echo "错误: 无法加载配置文件"
        echo "请先运行: /wxm init"
        exit 1
    fi

    # 执行任务
    wxm_task_ui_iterate "$@"
fi
