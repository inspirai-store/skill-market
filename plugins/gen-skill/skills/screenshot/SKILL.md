---
name: screenshot
description: "网页截图生成素材 - 使用 Playwright 截取网页或 UI 组件作为图片资产"
---

# /gen:screenshot - 网页截图

使用 Playwright 截取网页、UI 组件或指定区域作为图片素材。

## 使用方式

```
/gen:screenshot "https://example.com"
/gen:screenshot --selector ".hero-section" "https://example.com"
/gen:screenshot --full-page "https://mysite.com/about"
/gen:screenshot --viewport 375x812 "https://mysite.com"   # 移动端
/gen:screenshot --element "#logo" --output assets/logo.png "https://mysite.com"
/gen:screenshot --local index.html                         # 本地文件
```

## 参数

- `--selector <css>` — CSS 选择器，截取特定元素
- `--element <css>` — 同 --selector
- `--full-page` — 截取完整页面（包含滚动区域）
- `--viewport <WxH>` — 设置视窗大小（默认 1280x720）
- `--device <name>` — 模拟设备（iPhone 15, Pixel 7 等）
- `--wait <seconds>` — 等待页面加载时间
- `--local <file>` — 截取本地 HTML 文件
- `--output <path>` — 输出路径
- `--format <fmt>` — 格式（png/jpeg/webp）
- `--quality <n>` — JPEG/WebP 质量（1-100）

## 执行步骤

### Step 1: 检查 Playwright 环境

```bash
# 检查 playwright 是否安装
if ! command -v npx &>/dev/null; then
    echo "[ERROR] 需要 Node.js 环境"
    exit 1
fi

# 检查浏览器是否安装
npx playwright install --check chromium 2>/dev/null || {
    echo "[INFO] 安装 Chromium..."
    npx playwright install chromium
}
```

### Step 2: 构建截图脚本

```javascript
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: 2  // Retina
    });
    const page = await context.newPage();

    // 导航
    await page.goto(URL, { waitUntil: 'networkidle' });

    // 等待额外时间（如有动画）
    if (WAIT > 0) await page.waitForTimeout(WAIT * 1000);

    // 截图
    if (SELECTOR) {
        const element = await page.$(SELECTOR);
        await element.screenshot({ path: OUTPUT });
    } else if (FULL_PAGE) {
        await page.screenshot({ path: OUTPUT, fullPage: true });
    } else {
        await page.screenshot({ path: OUTPUT });
    }

    await browser.close();
})();
```

### Step 3: 执行截图

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.js" \
    --url "$URL" \
    --output "$OUTPUT" \
    --viewport "$VIEWPORT" \
    ${SELECTOR:+--selector "$SELECTOR"} \
    ${FULL_PAGE:+--full-page}
```

### Step 4: 输出结果

1. 显示截图文件路径和大小
2. 使用 Read 工具预览截图
3. 提示后续可用 `/gen:transform` 处理

## 输出目录

```
assets/screenshots/
├── hero-section_20260124.png
├── mobile-view_20260124.png
└── ...
```

## 批量截图

支持多 URL 或多视窗批量截取：
```
/gen:screenshot --viewport 1280x720,375x812,768x1024 "https://mysite.com"
```

生成响应式设计的多尺寸截图。

## 注意事项

- 需要 Node.js 和 Playwright（首次使用自动安装 Chromium）
- 动态页面建议加 `--wait` 等待加载完成
- Retina 屏默认 2x 缩放，生成高清截图
- 本地文件使用 `file://` 协议加载
