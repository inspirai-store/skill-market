---
name: init
description: "配置素材生成 Provider - 管理 API Keys、默认偏好和 Provider 状态"
---

# /gen:init - Provider 配置管理

管理素材生成所需的 Provider 配置，包括 API Key、默认偏好和状态检测。

## 使用方式

```
/gen:init                        # 交互式配置引导
/gen:init --check                # 检查所有 provider 状态
/gen:init --provider gemini      # 配置指定 provider
/gen:init --reset                # 重置配置
```

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

## 执行步骤

### Step 1: 加载或创建配置文件

```bash
CONFIG_FILE="$HOME/.gen-providers.yaml"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "[INFO] 首次使用，创建配置文件..."
fi
```

### Step 2: 交互式配置

使用 AskUserQuestion 引导用户配置：

1. **选择要配置的 Provider** — 列出所有可用 provider
2. **输入 API Key** — 根据 provider 类型收集凭证
3. **设置默认偏好** — 每种素材类型的默认 provider

### Step 3: 验证凭证

配置后立即验证 API Key 有效性：

```bash
# Gemini 验证
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$API_KEY" | jq '.models[0].name' 2>/dev/null

# DeepSeek 验证
curl -s "https://api.deepseek.com/models" -H "Authorization: Bearer $API_KEY" | jq '.data[0].id' 2>/dev/null

# Grok 验证
curl -s "https://api.x.ai/v1/models" -H "Authorization: Bearer $API_KEY" | jq '.data[0].id' 2>/dev/null
```

验证结果：
- 成功 → status: active
- 失败 → status: expired，提示重新配置

### Step 4: 生成配置文件

```yaml
# ~/.gen-providers.yaml
providers:
  gemini:
    api_key: "xxx"
    models:
      image: gemini-2.5-flash-image
      video: veo-3.1
      text: gemini-2.5-pro
    status: active
    verified_at: "2026-01-24T10:00:00Z"

  jimeng:
    access_key: "xxx"
    secret_key: "xxx"
    region: cn-north-1
    status: active
    verified_at: "2026-01-24T10:00:00Z"

  aliyun:
    access_key: "xxx"
    access_secret: "xxx"
    models:
      image: wanx-v1
      video: video-gen
      image_edit: image-edit-v1
      tts: sambert-v1
    status: active

  deepseek:
    api_key: "xxx"
    base_url: "https://api.deepseek.com"
    model: deepseek-chat
    status: active

  grok:
    api_key: "xxx"
    base_url: "https://api.x.ai/v1"
    models:
      image: grok-2-image
      video: grok-video
      text: grok-3
    status: unconfigured

  suno:
    api_key: "xxx"
    status: unconfigured

  elevenlabs:
    api_key: "xxx"
    status: unconfigured

defaults:
  image: gemini
  video: veo
  audio_tts: aliyun
  audio_music: suno
  audio_sfx: elevenlabs
  text: deepseek
  transform: aliyun
```

## --check 检查模式

```
Provider 状态检查:

  ✓ gemini      active    (verified: 2h ago)
  ✓ deepseek    active    (verified: 1d ago)
  ✓ aliyun      active    (verified: 3h ago)
  ✗ jimeng      expired   (key invalid since 2026-01-20)
  - grok        未配置
  - suno        未配置
  - elevenlabs  未配置

可用能力:
  图片: gemini, aliyun
  视频: veo (gemini)
  音频: aliyun (TTS)
  文字: deepseek, gemini
  编辑: aliyun

建议: 运行 /gen:init --provider jimeng 重新配置即梦
```

## 安全规则

- API Key 仅存储在 `~/.gen-providers.yaml`，不进入项目目录
- 配置文件权限设置为 600（仅用户可读）
- 验证失败不暴露完整 key，只显示前4位
