# Generate Asset Plugin

AI 素材生成器 - 使用 Google Gemini 生成与项目风格一致的 UI 素材。

## 功能特性

- 支持图标、背景、组件、装饰等多种素材类型
- 首次使用时自动发现项目风格
- 智能分类，自动归档到对应目录
- 批量生成变体
- 支持自定义尺寸和输出路径

## 安装

### 通过 Claude Code Plugin 系统安装（推荐）

```bash
# 添加 marketplace
claude plugin marketplace add inspirai-store/skill-market

# 安装插件
claude plugin install generate-asset@skill-market
```

或在 Claude Code 交互模式中：
```
/plugin marketplace add inspirai-store/skill-market
/plugin install generate-asset@skill-market
```

### 前置依赖

安装 Python 依赖：
```bash
pip install google-genai pillow
```

### 配置 API Key

设置 Gemini API Key（任选其一）：

**方式 1：全局环境变量**
```bash
export GEMINI_API_KEY=your_api_key_here
```

**方式 2：项目 .env 文件**
```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

**方式 3：项目 .asset-style.json**
```json
{
  "apiKey": "your_api_key_here",
  "style": { ... }
}
```

## 使用方法

### 基本使用

```
/generate-asset "蓝色齿轮设置图标"
```

### 指定类型

```
/generate-asset --type icon "设置图标"
/generate-asset --type background "渐变背景"
/generate-asset --type component "玻璃按钮"
```

### 自定义尺寸

```
/generate-asset --size 512x512 "应用 Logo"
```

### 批量生成

```
/generate-asset --batch 3 "装饰爱心"
```

## 风格配置

首次使用时，skill 会引导你配置项目风格。配置保存在项目根目录的 `.asset-style.json` 文件中。

### 内置风格模板

- `modern` - 现代简约
- `flat` - 扁平设计
- `glass` - 玻璃拟态
- `neon` - 霓虹赛博
- `handdrawn` - 手绘风格

## 输出目录

生成的素材自动分类到：

- `assets/icons/` - 图标
- `assets/components/` - 组件
- `assets/backgrounds/` - 背景
- `assets/illustrations/` - 插图

## API 模型

- `gemini-2.5-flash-image` - 快速生成（默认）
- `gemini-3-pro-image-preview` - 高质量生成

## License

MIT
