---
name: generate-asset
description: "AI 素材生成器 - 使用 Gemini 生成与项目风格一致的 UI 素材。支持图标、背景、组件等，首次使用时自动发现项目风格。"
---

# AI 素材生成器

使用 Google Gemini 生成 UI 素材，自动匹配项目风格。

## 使用流程

### 1. 检查项目风格配置

首先检查当前项目是否有 `.asset-style.json` 配置文件：

```bash
ls -la .asset-style.json 2>/dev/null || echo "NO_CONFIG"
```

### 2. 首次使用 - 风格发现

如果没有配置文件，需要进行风格发现：

**检查是否有设计素材目录：**
```bash
ls -la design/ 2>/dev/null || ls -la assets/ 2>/dev/null || echo "NO_DESIGN_DIR"
```

**如果有设计目录**，读取其中的图片文件进行风格分析，然后询问用户：

```
检测到项目包含设计素材，我来分析一下风格特征...

[分析现有设计素材的视觉特征]

分析结果：
- 主色调：[分析得出的颜色]
- 风格：[分析得出的风格]
- 特点：[分析得出的特点]

这个风格描述准确吗？
```

使用 AskUserQuestion 工具让用户确认或调整。

**如果没有设计目录**，让用户选择风格：

```
这是首次在此项目使用素材生成，请选择项目风格：
```

使用 AskUserQuestion 工具提供风格选项：
- 现代简约 - 干净线条、大量留白、单色调
- 扁平设计 - 纯色块、无阴影、几何图形
- 玻璃拟态 - 毛玻璃效果、透明度、模糊
- 霓虹赛博 - 发光效果、深色背景、渐变
- 手绘风格 - 手绘质感、有机形状、温暖

### 3. 生成配置文件

根据风格发现结果，生成 `.asset-style.json` 配置文件。配置文件模板：

```json
{
  "projectName": "项目名称",
  "outputDir": "assets",
  "style": {
    "name": "风格名称",
    "description": "风格描述",
    "base_prompt": "基础 prompt",
    "colors": ["#color1", "#color2"]
  },
  "typePresets": {
    "icon": { "prompt_suffix": "...", "size": "64x64", "dir": "icons" },
    "button": { "prompt_suffix": "...", "dir": "components" },
    "background": { "prompt_suffix": "...", "size": "1920x1080", "dir": "backgrounds" },
    "decoration": { "prompt_suffix": "...", "dir": "illustrations" }
  }
}
```

### 4. 检查依赖

确保 Python 依赖已安装：
```bash
pip show google-genai pillow 2>/dev/null || pip install google-genai pillow
```

### 5. 执行素材生成

使用以下命令生成素材：

```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/generate_asset.py" --prompt "$ARGUMENTS" --config .asset-style.json
```

### 6. 输出结果

生成完成后：
1. 报告生成的文件路径
2. 使用 Read 工具预览生成的图片
3. 询问用户是否满意，是否需要调整

## 命令行参数

用户可以在调用时指定额外参数：

```
/generate-asset "蓝色齿轮设置图标"
/generate-asset --type icon "设置图标"
/generate-asset --size 512x512 "应用 Logo"
/generate-asset --batch 3 "装饰爱心"
```

支持的参数：
- `--type`: 素材类型 (icon/background/component/illustration)
- `--size`: 尺寸 (WxH)
- `--preset`: 类型预设 (icon/button/panel/decoration)
- `--batch`: 批量生成数量
- `--output`: 自定义输出路径

## 智能分类

根据描述中的关键词自动分类：
- icon, 图标 → icons/ 目录
- bg, background, 背景 → backgrounds/ 目录
- button, card, panel → components/ 目录
- illustration, 插图, 装饰 → illustrations/ 目录

## 自动触发提示

在以下情况可主动提示用户使用此 skill：
- 代码中引用了不存在的 `@/assets/...` 图片
- CSS 中 `url()` 引用的图片文件缺失
- 代码注释中包含 `TODO: need asset` 标记

## 注意事项

1. 需要配置 `GEMINI_API_KEY` 环境变量
2. 生成的图片包含 SynthID 水印（AI 生成标识）
3. API 有速率限制，批量生成时自动添加延迟
4. 复杂描述可能需要多次迭代
5. 建议生成后人工审核质量
