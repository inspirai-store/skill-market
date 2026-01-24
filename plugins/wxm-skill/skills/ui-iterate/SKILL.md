---
name: ui-iterate
description: "微信小程序 UI 迭代 - 截图驱动的闭环 UI 开发，自动修改代码并验证效果"
---

# /wxm:ui-iterate - UI 迭代

截图驱动的闭环 UI 开发流程：截图 → 分析 → 修改代码 → 编译 → 截图验证。

## 使用方式

```
/wxm:ui-iterate                                    # 当前页面 UI 迭代
/wxm:ui-iterate --page <path>                      # 指定页面
/wxm:ui-iterate --requirement "把标题改成蓝色"       # 带需求描述
```

## 执行步骤

### Step 1: 加载环境

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/utils/config.sh"
source "$PLUGIN_DIR/core/http_api.sh"
source "$PLUGIN_DIR/core/screenshot.sh"
source "$PLUGIN_DIR/tasks/ui_iterate.sh"
```

### Step 2: 生成任务计划

```bash
wxm_task_ui_iterate "<page_path>" "<requirement>"
```

任务脚本自动调用 `wxm_generate_task_plan` 生成执行计划。

### Step 3: 截取初始状态

- 如果指定了 `--page`，先跳转页面
- 调用 `wxm_screenshot_take "before_iteration"` 截取初始状态
- 使用 Read 工具读取截图并展示给用户

### Step 4: 分析截图并修改代码

- 查看初始截图，分析需要修改的部分
- 根据用户需求修改项目文件（WXML、WXSS、JS）
- 使用 Read、Edit、Write 工具修改代码

### Step 5: 编译并重新加载

```bash
wxm_api_compile    # 编译项目
wxm_api_reload     # 重载模拟器
```

如果编译失败，分析错误并修复后重试。

### Step 6: 截取修改后状态

- 调用 `wxm_screenshot_take "after_iteration"` 截取修改后状态
- 使用 Read 工具展示修改后的截图

### Step 7: 对比分析

- 如果安装了 ImageMagick，生成 before/after 对比图
- 分析修改前后的截图，验证是否符合预期
- 如果不符合预期，继续迭代修改（回到 Step 4）

### Step 8: 输出结果

- 返回截图路径（before/after）
- 总结修改内容
- 如需要，给出后续优化建议

## 示例流程

```
用户：/wxm:ui-iterate --page pages/index/index --requirement "把标题颜色改成蓝色"

Claude 执行：
1. 跳转到 pages/index/index
2. 截图保存为 before_iteration.png
3. 找到标题相关的 WXSS 文件
4. 修改 color 属性为蓝色
5. 编译 → 重载模拟器
6. 截图保存为 after_iteration.png
7. 对比确认标题已变蓝
8. 向用户报告结果
```

## 依赖

- 微信开发者工具（模拟器运行中）
- Node.js >= 14（Automator）
- ImageMagick（可选，截图对比）

## 注意事项

- 每次迭代自动保存 before/after 截图
- 编译失败时会自动尝试修复
- 复杂 UI 变更可能需要多轮迭代
- 建议配合 `/wxm:screenshot` 查看中间状态
