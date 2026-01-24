---
name: transform
description: "素材再处理 - 基于现有图片/视频进行风格迁移、编辑、格式转换等"
---

# /gen:transform - 素材再处理

基于现有素材进行 AI 编辑和转换：图片编辑、风格迁移、图生视频、格式转换等。

## 使用方式

```
# 图片编辑（通义 image-edit）
/gen:transform --edit "把背景换成蓝色" input.png
/gen:transform --edit "去掉水印" photo.jpg
/gen:transform --edit "添加圣诞帽" avatar.png

# 风格迁移
/gen:transform --style "赛博朋克" input.png
/gen:transform --style-ref reference.png target.png

# 图生视频
/gen:transform --to-video "让画面动起来" cover.png
/gen:transform --to-video --provider jimeng "平滑缩放动画" poster.jpg

# 图生图
/gen:transform --reimagine "改成水彩风格" input.png
/gen:transform --reimagine --provider grok "make it more dramatic" photo.jpg

# 格式/尺寸转换
/gen:transform --resize 512x512 input.png
/gen:transform --format webp input.png
/gen:transform --resize 64x64,128x128,256x256 logo.png  # 批量多尺寸
```

## 参数

- `--edit <instruction>` — AI 图片编辑（描述修改内容）
- `--style <name>` — 风格迁移
- `--style-ref <path>` — 以参考图片的风格进行迁移
- `--to-video <prompt>` — 图生视频
- `--reimagine <prompt>` — 图生图（重新想象）
- `--resize <WxH>` — 调整尺寸（支持逗号分隔多尺寸）
- `--format <fmt>` — 格式转换（png/jpg/webp/svg）
- `--provider <name>` — 指定 provider
- `--output <path>` — 输出路径

## Provider 映射

| 功能 | 可用 Provider | 默认 |
|------|--------------|------|
| 图片编辑 | 通义(image-edit), 即梦 | aliyun |
| 风格迁移 | 即梦, Gemini | jimeng |
| 图生视频 | Veo 3.1, 即梦, 通义, Grok | veo |
| 图生图 | 即梦, Gemini, Grok | jimeng |
| 格式/尺寸 | 本地处理（Pillow/ImageMagick） | local |

## 执行步骤

### Step 1: 检查输入文件

```bash
if [ ! -f "$INPUT_FILE" ]; then
    echo "[ERROR] 输入文件不存在: $INPUT_FILE"
    exit 1
fi

FILE_TYPE=$(file --mime-type -b "$INPUT_FILE")
echo "[INFO] 输入: $INPUT_FILE ($FILE_TYPE)"
```

### Step 2: 检查 Provider（AI 操作时）

```bash
# 格式/尺寸转换不需要 provider
if [ "$MODE" = "resize" ] || [ "$MODE" = "format" ]; then
    # 使用本地工具处理
    USE_LOCAL=true
else
    # 检查 AI provider
    CONFIG_FILE="$HOME/.gen-providers.yaml"
    PROVIDER="${SPECIFIED_PROVIDER:-$(yq '.defaults.transform' "$CONFIG_FILE")}"
    STATUS=$(yq ".providers.$PROVIDER.status" "$CONFIG_FILE")

    if [ "$STATUS" != "active" ]; then
        echo "[WARN] Transform provider '$PROVIDER' 未配置或已过期"
        echo "[INFO] 运行 /gen:init --provider $PROVIDER 配置"
        exit 1
    fi
fi
```

### Step 3: 执行转换

**图片编辑 - 通义 image-edit:**
```bash
# 阿里云 image-edit API
# 上传原图 + 编辑指令 → 返回编辑后图片
```

**风格迁移 - 即梦:**
```bash
# 火山引擎图片风格化 API
# 输入：原图 + 目标风格描述
```

**图生视频 - Veo 3.1:**
```bash
# Gemini API with image input
# instances: [{image: base64, prompt: "..."}]
```

**格式/尺寸 - 本地:**
```bash
# 使用 Pillow 或 ImageMagick
python -c "
from PIL import Image
img = Image.open('$INPUT')
img = img.resize(($WIDTH, $HEIGHT), Image.LANCZOS)
img.save('$OUTPUT')
"
```

### Step 4: 输出结果

1. 保存处理后的文件
2. 使用 Read 工具预览结果
3. 显示前后文件信息对比

## 批量多尺寸（App Icon 场景）

```
/gen:transform --resize 16x16,32x32,64x64,128x128,256x256,512x512,1024x1024 icon.png
```

输出：
```
assets/icons/
├── icon-16x16.png
├── icon-32x32.png
├── icon-64x64.png
├── ...
└── icon-1024x1024.png
```

## 注意事项

- 未配置有效 AI provider 时，只能执行本地格式/尺寸转换
- 图片编辑质量取决于指令描述的清晰度
- 图生视频耗时较长，使用异步轮询
- 本地处理需要 Pillow 或 ImageMagick
- 大文件上传可能有 API 限制（通常 10MB）
