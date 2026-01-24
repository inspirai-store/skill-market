# Gen Plugin

通用素材生成工具 - AI 图片/视频/音频/文本生成与素材处理，支持多 Provider 配置。

## 安全规则

- **无有效 Provider 配置不执行** — 未配置或已过期时只提示，不尝试调用
- **API Key 验证前置** — 每次调用前检查 key 有效性

## 功能特性

- **gen:init** - 配置 Provider（API Keys、默认偏好）
- **gen:image** - AI 图片生成
- **gen:video** - AI 视频生成（文生视频、图生视频）
- **gen:audio** - AI 音频生成（TTS、音乐、音效）
- **gen:text** - AI 文本/文案生成
- **gen:screenshot** - 网页截图生成素材
- **gen:transform** - 素材再处理（编辑、风格迁移、格式转换）

## 支持的 Provider

| Provider | 图片 | 视频 | 音频 | 文字 | 编辑 |
|----------|------|------|------|------|------|
| Gemini (Google) | ✓ | ✓(Veo 3.1) | - | ✓ | - |
| 即梦 (Volcengine) | ✓ | ✓ | - | - | ✓ |
| 通义 (Aliyun) | ✓ | ✓ | ✓(TTS) | - | ✓ |
| DeepSeek | - | - | - | ✓ | - |
| Grok (xAI) | ✓ | ✓ | - | ✓ | - |
| Suno | - | - | ✓(音乐) | - | - |
| ElevenLabs | - | - | ✓(TTS/SFX) | - | - |

## 安装

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install gen@skill-market
```

或在 Claude Code 交互模式中：
```
/plugin marketplace add inspirai-store/skill-market
/plugin install gen@skill-market
```

### 前置依赖

```bash
# 图片生成（Python）
pip install google-genai pillow

# 截图（Node.js）
npx playwright install chromium

# 音频（可选）
pip install elevenlabs
```

## 使用方法

### 首次配置

```
/gen:init
```

### 生成图片

```
/gen:image "蓝色齿轮设置图标"
/gen:image --provider grok --type icon "设置图标"
```

### 生成视频

```
/gen:video "产品展示动画，简约风格"
/gen:video --from-image cover.png "让封面动起来"
```

### 生成音频

```
/gen:audio --tts "欢迎使用我们的产品"
/gen:audio --music "轻快的背景音乐"
/gen:audio --sfx "按钮点击音效"
```

### 生成文案

```
/gen:text "为 SaaS 产品写一段标语"
/gen:text --type slogan --batch 5 "健身 App 广告语"
```

### 网页截图

```
/gen:screenshot "https://example.com"
/gen:screenshot --selector ".hero" --viewport 375x812 "https://mysite.com"
```

### 素材再处理

```
/gen:transform --edit "把背景换成蓝色" input.png
/gen:transform --to-video "让图片动起来" cover.png
/gen:transform --resize 64x64,128x128,256x256 logo.png
```

## 配置文件

`~/.gen-providers.yaml` — 存储 Provider 凭证和默认偏好。

运行 `/gen:init --check` 查看当前配置状态。

## 输出目录

```
assets/
├── icons/          # 图标
├── backgrounds/    # 背景
├── components/     # 组件
├── illustrations/  # 插图
├── videos/         # 视频
├── audio/
│   ├── voice/      # TTS
│   ├── music/      # 音乐
│   └── sfx/        # 音效
├── screenshots/    # 截图
└── text/           # 文案
```

## License

MIT
