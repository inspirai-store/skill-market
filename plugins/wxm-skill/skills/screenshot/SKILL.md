---
name: screenshot
description: "微信小程序截图与 UI 检查 - 截取模拟器页面、对比分析"
---

# /wxm:screenshot - 截图与 UI 检查

截取微信小程序模拟器当前页面，支持页面跳转后截图和截图历史管理。

## 使用方式

```
/wxm:screenshot                         # 截取当前页面
/wxm:screenshot --page <path>           # 跳转后截图
/wxm:screenshot --output <filename>     # 指定输出文件名
/wxm:screenshot history                 # 查看截图历史
```

## 执行步骤

### Step 1: 加载环境

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/utils/config.sh"
source "$PLUGIN_DIR/core/http_api.sh"
source "$PLUGIN_DIR/core/screenshot.sh"
```

### Step 2: 页面跳转（如指定）

```bash
if [[ -n "$PAGE_PATH" ]]; then
    wxm_api_navigate "$PAGE_PATH"
    sleep 1  # 等待页面加载
fi
```

### Step 3: 截图

```bash
wxm_screenshot_take "${OUTPUT_NAME:-screenshot}"
```

- 通过 Automator 层截取完整页面截图
- 截图保存到 `.wxm-screenshots/` 目录
- 返回截图文件路径

### Step 4: 展示结果

- 使用 Read 工具读取并展示截图给用户
- 可用于 UI 对比分析

## 截图对比

如果安装了 ImageMagick，支持截图对比：
```bash
# 自动生成 before/after 对比图
compare before.png after.png diff.png
```

## 截图存储

```
.wxm-screenshots/
├── screenshot_20260124_143534.png
├── before_iteration.png
├── after_iteration.png
└── ...
```

## 依赖

- 微信开发者工具（模拟器运行中）
- Node.js >= 14（Automator 截图）
- ImageMagick（可选，用于截图对比）

## 注意事项

- 截图前确保模拟器已打开并加载页面
- Automator 方式支持完整页面截图（包含滚动区域）
- 截图文件默认以时间戳命名
