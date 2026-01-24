---
name: image
description: "AI 图片生成 - 支持 Gemini、即梦、通义万相、Grok 多 Provider"
---

# /gen:image - AI 图片生成

使用 AI 生成图片素材，支持多 Provider 切换。

## 使用方式

```
/gen:image "蓝色齿轮设置图标"
/gen:image --provider jimeng "卡通风格头像"
/gen:image --type icon --size 64x64 "设置图标"
/gen:image --batch 3 "装饰爱心"
/gen:image --style glass "毛玻璃按钮"
```

## 参数

- `--provider <name>` — 指定 provider（gemini/jimeng/aliyun/grok），默认读取配置
- `--type <type>` — 素材类型（icon/background/component/illustration）
- `--size <WxH>` — 输出尺寸
- `--batch <n>` — 批量生成数量
- `--style <name>` — 预设风格（modern/flat/glass/neon/handdrawn）
- `--output <path>` — 自定义输出路径

## 执行步骤

### Step 1: 检查 Provider 配置

```bash
CONFIG_FILE="$HOME/.gen-providers.yaml"

# 读取默认 image provider
DEFAULT_PROVIDER=$(yq '.defaults.image' "$CONFIG_FILE")
PROVIDER="${SPECIFIED_PROVIDER:-$DEFAULT_PROVIDER}"

# 检查 provider 状态
STATUS=$(yq ".providers.$PROVIDER.status" "$CONFIG_FILE")
if [ "$STATUS" != "active" ]; then
    echo "[WARN] Provider '$PROVIDER' 状态: $STATUS"
    echo "[INFO] 请运行 /gen:init --provider $PROVIDER 配置"
    echo ""
    # 列出其他可用 provider
    echo "可用的 image provider:"
    # ... 列出 status=active 且支持 image 的 provider
    exit 1
fi
```

### Step 2: 项目风格检测（可选）

检查项目是否有 `.gen-style.json` 风格配置：

```bash
if [ -f ".gen-style.json" ]; then
    STYLE_CONFIG=".gen-style.json"
    echo "[INFO] 使用项目风格配置"
else
    echo "[INFO] 无项目风格配置，使用默认设置"
fi
```

### Step 3: 生成图片

**Gemini:**
```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/generate_asset.py" \
    --prompt "$PROMPT" \
    --config "$STYLE_CONFIG" \
    --provider gemini
```

**即梦:**
通过火山引擎 API 调用即梦图片生成。

**通义万相:**
通过阿里云 SDK 调用 wanx 模型。

**Grok (Aurora):**
```bash
curl -s "https://api.x.ai/v1/images/generations" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"prompt": "$PROMPT", "model": "grok-2-image", "n": 1}'
```

### Step 4: 输出结果

1. 保存生成的图片到项目目录
2. 使用 Read 工具预览图片
3. 询问是否满意

## 输出目录

```
assets/
├── icons/           # type=icon
├── backgrounds/     # type=background
├── components/      # type=component
└── illustrations/   # type=illustration
```

## 智能分类

根据 prompt 关键词自动分类：
- icon, 图标 → icons/
- bg, background, 背景 → backgrounds/
- button, card, panel → components/
- illustration, 插图, 装饰 → illustrations/

## 注意事项

- 未配置有效 provider 时不执行，只提示
- Gemini 生成的图片包含 SynthID 水印
- API 有速率限制，批量生成时自动添加延迟
- 建议生成后人工审核质量
