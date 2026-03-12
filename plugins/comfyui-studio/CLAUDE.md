# ComfyUI Studio

ComfyUI AI 创作工作室插件。通过 Comfy Pilot MCP 与 ComfyUI 通信，提供图像生成、视频制作、语音合成、LoRA 训练等全流程能力。

## 全局规则

1. 所有 ComfyUI 相关操作前，先检查 .comfyui-studio/inventory.json 是否存在。
   不存在则提示用户运行 /studio-scan。

2. 读取 inventory.json 中的 recommended_tier 字段进行硬件适配：
   - low_vram (≤12GB): 优先推荐 GGUF 量化、FramePack、AnimateDiff、tiled VAE
   - mid_vram (12-20GB): 可用 FLUX FP16、Wan 2.1 量化版
   - high_vram (≥24GB): 全功能，Wan 2.2 14B、FLUX 原生

3. 所有输出使用中文。

4. 构建工作流时，必须交叉校验 inventory.json 中的已安装模型和节点。
   缺失的模型/节点应在执行前提示用户安装。

5. 工作流 JSON 必须使用 ComfyUI API 格式（非 UI 格式）。

## Comfy Pilot MCP 工具参考

插件通过 Comfy Pilot MCP（server name: `comfy-pilot`）与 ComfyUI 通信。

工具调用格式：`mcp__comfy-pilot__<tool_name>`

### 工作流查看
- `get_workflow` — 获取完整工作流（所有节点、连接、widget 值）
- `summarize_workflow` — 获取工作流摘要（节点 ID、类型、标题、位置、连接）

### 节点信息
- `get_node_types` — 搜索可用节点类型（支持 search/category/fields 参数）
- `get_node_info` — 获取工作流中特定节点的详细信息

### 状态与执行
- `get_status` — 获取队列状态、系统信息、执行历史
- `run` — 执行工作流（action: "queue"）或中断（action: "interrupt"）

### 图形编辑
- `edit_graph` — 批量编辑节点（create/delete/move/resize/set/connect/disconnect）
- `center_on_node` — 将视口居中到指定节点

### 图片查看
- `view_image` — 查看 Preview Image / Save Image 节点的输出图片

### 自定义节点管理
- `search_custom_nodes` — 搜索 ComfyUI Manager 注册表
- `install_custom_node` — 安装自定义节点（需重启）
- `uninstall_custom_node` — 卸载自定义节点（需重启）
- `update_custom_node` — 更新自定义节点（需重启）

### 模型下载
- `download_model` — 下载模型到 ComfyUI models 目录（支持 HuggingFace、CivitAI、直接 URL）
  - model_type: checkpoint, lora, vae, controlnet, clip, clip_vision, unet, diffusion_models, text_encoders, upscale_models, embeddings, ipadapter 等

## inventory.json 标准 Schema

所有 Skill/Agent/Command 引用 inventory.json 时，必须使用以下字段路径：

```json
{
  "hardware": {
    "gpu_name": "RTX 4060",
    "gpu_vram_gb": 8,
    "gpu_vram_free_mb": 6000,
    "ram_gb": 32,
    "recommended_tier": "low_vram"
  },
  "installed_models": {
    "checkpoints": [{"name": "model.safetensors", "size_gb": 6.5}],
    "loras": [],
    "controlnet": [],
    "vae": [],
    "clip": [],
    "unet": [],
    "embeddings": [],
    "upscale_models": [],
    "ipadapter": [],
    "clip_vision": []
  },
  "installed_nodes": [
    {"name": "ComfyUI-WanVideoWrapper", "path": "custom_nodes/ComfyUI-WanVideoWrapper"},
    {"name": "ComfyUI-GGUF", "path": "custom_nodes/ComfyUI-GGUF"}
  ],
  "comfyui_path": "D:/ComfyUI-aki-v3/ComfyUI",
  "comfy_pilot_installed": true,
  "tokens": {
    "hf_token": true,
    "civitai_token": true
  },
  "scan_time": "2026-03-12T10:00:00"
}
```

- 显存档位在 `hardware.recommended_tier`
- 已安装模型在 `installed_models.*`
- 已安装节点在 `installed_nodes[].name`（检查节点是否安装时用 name 字段匹配）
- FLUX/SDXL 的 prompt 仍需使用英文（模型训练数据以英文为主），中文 prompt 可能导致质量下降
