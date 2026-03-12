---
name: model-manager
description: 模型管理 — 搜索、下载、VRAM 估算。当用户要求搜索模型、下载模型、查看显存需求、或管理已安装模型时触发。
---

# 模型管理

按以下流程完成模型搜索、下载和管理任务。优先使用已安装模型，缺失时协助用户查找和下载。

---

## 前置检查

1. 确认 `.comfyui-studio/inventory.json` 存在，不存在则提示用户运行 `/studio-scan`。
2. 读取 `inventory.json`，提取：
   - `comfyui_path`（ComfyUI 安装路径）
   - `recommended_tier`（显存档位）
   - `installed_models`（已安装模型列表）
   - `tokens`（已配置的 API Token 状态）

---

## 模型搜索方式

按以下优先级搜索模型：

### 方式 1：Comfy Pilot download_model 工具（首选）

直接调用 Comfy Pilot MCP 的 `download_model` 工具，支持从 HuggingFace 和 CivitAI 搜索并下载模型。这是最简便的方式，无需手动处理路径和认证。

### 方式 2：HuggingFace 搜索

使用 `huggingface-cli` 或 curl 调用 HuggingFace API：

```bash
# CLI 搜索
huggingface-cli search {关键词} --type model

# API 搜索（不需要 Token）
curl -s "https://huggingface.co/api/models?search={关键词}&sort=downloads&direction=-1&limit=10"

# 查看模型文件列表
curl -s "https://huggingface.co/api/models/{repo_id}" | python -m json.tool
```

搜索结果应展示：模型名称、下载量、最近更新时间、文件大小。

### 方式 3：CivitAI 搜索

使用 curl 调用 CivitAI API：

```bash
# 搜索模型（不需要 Token）
curl -s "https://civitai.com/api/v1/models?query={关键词}&sort=Most%20Downloaded&limit=10"

# 获取模型详情（含下载链接）
curl -s "https://civitai.com/api/v1/models/{model_id}"

# 获取特定版本详情
curl -s "https://civitai.com/api/v1/model-versions/{version_id}"
```

搜索结果应展示：模型名称、类型（Checkpoint/LoRA/等）、基础模型（SD1.5/SDXL/FLUX）、下载量、评分。

---

## 下载命令生成

根据模型来源生成对应的下载命令：

### HuggingFace 下载

```bash
# 使用 huggingface-cli（推荐，支持断点续传）
huggingface-cli download {repo_id} {filename} --local-dir {目标路径}

# 示例：下载 FLUX.1-dev GGUF
huggingface-cli download city96/FLUX.1-dev-gguf flux1-dev-Q4_K_S.gguf --local-dir {COMFYUI_PATH}/models/unet/
```

**注意事项：**
- 需要 `HF_TOKEN` 环境变量才能下载受限模型（如 FLUX.1-dev 原版）
- 如果 `HF_TOKEN` 未配置，提示用户参考 `/studio-setup` 配置
- 大文件下载建议使用 `--resume-download` 参数

### CivitAI 下载

```bash
# 使用 curl 下载（注意 -k 绕过 SSL 验证）
curl -L -H "Authorization: Bearer $CIVITAI_TOKEN" -k -o {目标路径}/{文件名} "{下载URL}"

# 示例：下载模型
curl -L -H "Authorization: Bearer $CIVITAI_TOKEN" -k -o {COMFYUI_PATH}/models/checkpoints/realvisxl_v50.safetensors "https://civitai.com/api/download/models/{version_id}"
```

**注意事项：**
- `-k` 参数用于绕过 SSL 证书验证，某些网络环境下 CivitAI 证书校验可能失败
- `-L` 参数用于跟随重定向
- 部分模型需要 `CIVITAI_TOKEN` 才能下载
- 下载前确认目标路径存在，不存在则先创建

---

## 模型存放路径规范（秋叶整合包结构）

所有模型必须放置在 `{COMFYUI_PATH}/models/` 下对应的子目录中：

| 模型类型 | 存放路径 | 常见后缀 |
|---------|---------|---------|
| Checkpoint（大模型） | `models/checkpoints/` | `.safetensors`, `.ckpt` |
| LoRA | `models/loras/` | `.safetensors` |
| ControlNet | `models/controlnet/` | `.safetensors`, `.pth` |
| VAE | `models/vae/` | `.safetensors`, `.pt` |
| CLIP 文本编码器 | `models/clip/` | `.safetensors` |
| UNet（独立 UNet） | `models/unet/` | `.safetensors`, `.gguf` |
| Embeddings/Textual Inversion | `models/embeddings/` | `.safetensors`, `.pt` |
| Upscale 模型 | `models/upscale_models/` | `.pth`, `.safetensors` |
| IP-Adapter 模型 | `models/ipadapter/` | `.safetensors`, `.bin` |
| CLIP Vision | `models/clip_vision/` | `.safetensors` |
| InsightFace（人脸分析） | `models/insightface/` | `.onnx` |

**GGUF 量化模型说明：**
- GGUF 格式的 UNet 放在 `models/unet/` 目录下
- 需要安装 `ComfyUI-GGUF` 节点才能加载
- 命名通常包含量化级别，如 `Q4_K_S`、`Q8_0` 等

---

## VRAM 估算

下载模型前，参考 `references/vram-table.md` 评估用户显存是否足够。

**快速判断规则：**
- 查看 `inventory.json` 中的 `gpu_vram_gb`
- 对比 `vram-table.md` 中目标模型的推荐显存
- 如果可用显存不足，推荐量化版本或替代方案

**向用户呈现估算结果：**

```
模型：FLUX.1-dev FP16
推荐显存：16GB+
你的显存：12GB (RTX 4070)
评估结果：显存不足

建议方案：
  方案 1: 使用 FLUX.1-dev GGUF Q8（~10GB 显存）
  方案 2: 使用 FLUX.1-dev FP8（~10GB 显存）
  方案 3: 使用 FLUX.1-dev GGUF Q4（~6GB 显存，质量有损）
```

---

## Inventory 更新

下载新模型后，提示用户运行 `/studio-scan` 更新模型清单：

```
模型下载完成！建议运行 /studio-scan 更新模型清单，
以便后续工作流自动使用新模型。
```

---

## 模型管理操作

### 查看已安装模型

从 `inventory.json` 读取并格式化展示已安装的所有模型，按类型分组显示。

### 删除模型

1. 确认用户要删除的模型文件
2. 显示文件完整路径和大小
3. 等待用户确认后执行删除
4. 提示运行 `/studio-scan` 更新清单

### 模型推荐

根据用户的使用场景和硬件配置，推荐合适的模型组合：

- **文生图入门：** FLUX.1-dev（或 GGUF 量化版）+ VAE
- **写实人像：** RealVisXL V5.0 + FaceDetailer
- **动漫风格：** Animagine XL 或 Counterfeit + 风格 LoRA
- **视频生成：** Wan 2.1/2.2 + AnimateDiff/FramePack
- **角色一致性：** 对应 checkpoint + IP-Adapter/InstantID/PuLID
