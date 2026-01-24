---
name: text
description: "AI 文本生成 - 文案、文档、代码注释等，支持 DeepSeek、Gemini、Grok"
---

# /gen:text - AI 文本生成

使用 AI 生成文案、文档内容、营销文字等文本素材。

## 使用方式

```
/gen:text "为我的 SaaS 产品写一段 landing page 标语"
/gen:text --provider grok "技术博客开头段落，关于微服务架构"
/gen:text --type slogan --batch 5 "健身 App 的广告语"
/gen:text --type description "这张产品截图的描述文案" --from-image screenshot.png
/gen:text --lang en "Translate: 用户注册成功"
```

## 参数

- `--provider <name>` — 指定 provider（deepseek/gemini/grok）
- `--type <type>` — 文本类型（slogan/description/article/comment/alt-text）
- `--batch <n>` — 生成多个变体
- `--lang <code>` — 目标语言
- `--tone <style>` — 语调（formal/casual/playful/professional）
- `--from-image <path>` — 基于图片生成描述
- `--max-length <n>` — 最大字数
- `--output <path>` — 保存到文件

## 执行步骤

### Step 1: 检查 Provider 配置

```bash
CONFIG_FILE="$HOME/.gen-providers.yaml"
DEFAULT_PROVIDER=$(yq '.defaults.text' "$CONFIG_FILE")
PROVIDER="${SPECIFIED_PROVIDER:-$DEFAULT_PROVIDER}"

STATUS=$(yq ".providers.$PROVIDER.status" "$CONFIG_FILE")
if [ "$STATUS" != "active" ]; then
    echo "[WARN] Text provider '$PROVIDER' 未配置或已过期"
    echo "[INFO] 可用 text provider:"
    # 列出 active 的 text provider
    exit 1
fi
```

### Step 2: 构建 Prompt

根据类型构建系统 prompt：

```
type=slogan → "你是一个创意文案专家，生成简洁有力的广告标语"
type=description → "根据产品特点生成吸引用户的描述文案"
type=article → "生成高质量的技术/营销文章段落"
type=alt-text → "为图片生成准确的 alt text 描述"
```

### Step 3: 调用 API

**DeepSeek:**
```bash
curl -s "https://api.deepseek.com/chat/completions" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "$SYSTEM_PROMPT"},
            {"role": "user", "content": "$USER_PROMPT"}
        ]
    }'
```

**Gemini:**
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent" \
    -H "x-goog-api-key: $API_KEY" \
    -d '{"contents": [{"parts": [{"text": "$PROMPT"}]}]}'
```

**Grok:**
```bash
curl -s "https://api.x.ai/v1/chat/completions" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "grok-3",
        "messages": [{"role": "user", "content": "$PROMPT"}]
    }'
```

### Step 4: 输出结果

- 直接展示生成的文本
- 如指定 `--output`，保存到文件
- 如指定 `--batch`，编号展示多个变体

## 输出格式

```
生成结果 (provider: deepseek):

1. "让健身不再孤单，让汗水变成勋章"
2. "每一次突破，都是更好的自己"
3. "你的私人教练，随时在线"

保存到: assets/text/slogan_20260124.txt
```

## 注意事项

- 未配置有效 provider 时不执行，只提示
- 图片描述模式需要 provider 支持多模态（Gemini、Grok）
- 批量生成使用 temperature 变化增加多样性
- 长文本生成可能需要多次 API 调用拼接
