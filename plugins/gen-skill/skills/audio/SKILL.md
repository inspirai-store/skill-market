---
name: audio
description: "AI 音频生成 - TTS 语音合成、AI 音乐、音效生成，支持多 Provider"
---

# /gen:audio - AI 音频生成

支持语音合成（TTS）、AI 音乐生成和音效生成。

## 使用方式

```
# TTS 语音合成
/gen:audio --tts "欢迎使用我们的产品"
/gen:audio --tts --voice female-cn "中文女声播报"
/gen:audio --tts --provider elevenlabs "English narration"

# AI 音乐生成
/gen:audio --music "轻快的电子背景音乐，适合产品演示"
/gen:audio --music --duration 30 "60bpm lo-fi beats"

# 音效生成
/gen:audio --sfx "按钮点击音效"
/gen:audio --sfx "成功提示音，清脆悦耳"
```

## 参数

- `--tts` — 语音合成模式
- `--music` — 音乐生成模式
- `--sfx` — 音效生成模式
- `--provider <name>` — 指定 provider
- `--voice <id>` — 语音角色（TTS 模式）
- `--duration <seconds>` — 时长
- `--format <fmt>` — 输出格式（mp3/wav/ogg）
- `--output <path>` — 输出路径

## Provider 映射

| 模式 | 可用 Provider | 默认 |
|------|--------------|------|
| TTS | 通义(sambert), ElevenLabs, OpenAI | aliyun |
| 音乐 | Suno, Udio | suno |
| 音效 | ElevenLabs SFX | elevenlabs |

## 执行步骤

### Step 1: 检查 Provider 配置

```bash
CONFIG_FILE="$HOME/.gen-providers.yaml"

# 根据模式确定 provider
case "$MODE" in
    tts) DEFAULT=$(yq '.defaults.audio_tts' "$CONFIG_FILE") ;;
    music) DEFAULT=$(yq '.defaults.audio_music' "$CONFIG_FILE") ;;
    sfx) DEFAULT=$(yq '.defaults.audio_sfx' "$CONFIG_FILE") ;;
esac

PROVIDER="${SPECIFIED_PROVIDER:-$DEFAULT}"
STATUS=$(yq ".providers.$PROVIDER.status" "$CONFIG_FILE")

if [ "$STATUS" != "active" ]; then
    echo "[WARN] 音频 provider '$PROVIDER' 未配置或已过期"
    echo "[INFO] 运行 /gen:init --provider $PROVIDER 配置"
    exit 1
fi
```

### Step 2: 生成音频

**TTS - 通义 (Sambert):**
```bash
# 阿里云语音合成 API
# 支持多种音色：zhitian_emo（情感女声）、zhiyan（标准女声）等
```

**TTS - ElevenLabs:**
```bash
curl -s "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
    -H "xi-api-key: $API_KEY" \
    -d '{"text": "$TEXT", "model_id": "eleven_multilingual_v2"}'
```

**音乐 - Suno:**
```bash
# Suno API: 提交音乐生成任务
# 支持 prompt 描述风格、节奏、乐器
```

**音效 - ElevenLabs SFX:**
```bash
curl -s "https://api.elevenlabs.io/v1/sound-generation" \
    -H "xi-api-key: $API_KEY" \
    -d '{"text": "$DESCRIPTION", "duration_seconds": $DURATION}'
```

### Step 3: 保存结果

```bash
OUTPUT_DIR="${OUTPUT:-assets/audio}"
mkdir -p "$OUTPUT_DIR"

# 根据类型分目录
case "$MODE" in
    tts) SUB_DIR="voice" ;;
    music) SUB_DIR="music" ;;
    sfx) SUB_DIR="sfx" ;;
esac

OUTPUT_PATH="$OUTPUT_DIR/$SUB_DIR/$FILENAME.$FORMAT"
```

## 输出目录

```
assets/audio/
├── voice/        # TTS 语音
├── music/        # 背景音乐
└── sfx/          # 音效
```

## 注意事项

- 未配置有效 provider 时不执行，只提示配置方法
- TTS 长文本会自动分段合成再拼接
- 音乐生成耗时较长（30s-2min），异步轮询
- Suno 有每日生成额度限制
- 音效时长建议 1-5 秒
