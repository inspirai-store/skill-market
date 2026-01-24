---
name: video
description: "AI 视频生成 - 支持 Veo 3.1、即梦、通义万相、Grok 多 Provider"
---

# /gen:video - AI 视频生成

使用 AI 生成视频素材，支持文生视频和图生视频。

## 使用方式

```
/gen:video "一只猫在草地上奔跑，阳光明媚"
/gen:video --provider jimeng "产品展示动画"
/gen:video --from-image cover.png "让封面图动起来"
/gen:video --aspect 9:16 "竖版短视频素材"
/gen:video --duration 8 --quality 4k "高质量产品广告"
```

## 参数

- `--provider <name>` — 指定 provider（veo/jimeng/aliyun/grok），默认读取配置
- `--from-image <path>` — 图生视频模式（以图片为起始帧）
- `--aspect <ratio>` — 画面比例（16:9 / 9:16 / 1:1）
- `--duration <seconds>` — 时长（默认 8 秒）
- `--quality <level>` — 质量（720p / 1080p / 4k）
- `--with-audio` — 生成配套音频（Veo 3.1 原生支持）
- `--output <path>` — 输出路径

## 执行步骤

### Step 1: 检查 Provider 配置

```bash
CONFIG_FILE="$HOME/.gen-providers.yaml"
DEFAULT_PROVIDER=$(yq '.defaults.video' "$CONFIG_FILE")
PROVIDER="${SPECIFIED_PROVIDER:-$DEFAULT_PROVIDER}"

STATUS=$(yq ".providers.$PROVIDER.status" "$CONFIG_FILE")
if [ "$STATUS" != "active" ]; then
    echo "[WARN] Provider '$PROVIDER' 未配置或已过期"
    echo "[INFO] 可用 video provider:"
    # 列出 active 的 video provider
    echo "[INFO] 运行 /gen:init 配置"
    exit 1
fi
```

### Step 2: 提交生成任务

视频生成通常是异步的，提交任务后轮询结果。

**Veo 3.1 (Gemini API):**
```bash
# 提交生成任务
curl -s "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:predictLongRunning" \
    -H "x-goog-api-key: $API_KEY" \
    -d '{
        "instances": [{"prompt": "$PROMPT"}],
        "parameters": {
            "aspectRatio": "$ASPECT",
            "durationSeconds": $DURATION,
            "resolution": "$QUALITY"
        }
    }'
```

**即梦 (Volcengine):**
```bash
# 提交任务
# Action: CVSync2AsyncSubmitTask
# 轮询: CVSync2AsyncGetResult
```

**通义万相 (Aliyun):**
```bash
# 使用阿里云 video-gen 模型
# 异步任务模式
```

**Grok (xAI):**
```bash
curl -s "https://api.x.ai/v1/videos/generations" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"prompt": "$PROMPT", "model": "grok-video"}'
```

### Step 3: 轮询等待结果

```bash
echo "[INFO] 视频生成中..."
TIMEOUT=300  # 5分钟超时
INTERVAL=10

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(check_task_status "$TASK_ID")
    case "$STATUS" in
        "completed") break ;;
        "failed") echo "[ERROR] 生成失败"; exit 1 ;;
        *) echo "[INFO] 进度: $STATUS (${ELAPSED}s)..." ;;
    esac
    sleep $INTERVAL
done
```

### Step 4: 下载并保存

```bash
OUTPUT_DIR="${OUTPUT:-assets/videos}"
mkdir -p "$OUTPUT_DIR"
# 下载视频文件
curl -o "$OUTPUT_DIR/$FILENAME" "$VIDEO_URL"
echo "[SUCCESS] 视频已保存: $OUTPUT_DIR/$FILENAME"
```

## 输出

- 视频文件保存到 `assets/videos/` 或指定路径
- 显示视频信息（时长、分辨率、文件大小）
- 如有音频轨道，一并保存

## 注意事项

- 视频生成耗时较长（通常 30s-3min），使用异步轮询
- Veo 3.1 原生支持音频生成，其他 provider 需单独处理
- 未配置有效 provider 时不执行，只提示
- 生成内容可能有内容审核限制
