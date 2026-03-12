# 图像生成模型路线表

本文档列出支持的图像生成模型及其详细参数推荐。根据 `inventory.json` 中的 `recommended_tier` 选择合适的模型。

---

## FLUX.1-dev 系列

### FLUX.1-dev FP16（原生精度）

| 项目 | 值 |
|------|-----|
| 文件大小 | ~23GB |
| 显存需求 | 20-24GB |
| 推荐 Tier | high_vram |
| 推荐分辨率 | 1024x1024 / 768x1360 / 1360x768 |
| 推荐步数 | 20-30 |
| 推荐 CFG | 1.0（使用 guidance_scale 3.5） |
| 推荐采样器 | euler |
| 推荐调度器 | simple |
| 适用场景 | 最高质量文生图、文字渲染、商业级输出 |
| 备注 | 需要 DualCLIPLoader（T5XXL + CLIP-L） |

### FLUX.1-dev FP8（8bit 量化）

| 项目 | 值 |
|------|-----|
| 文件大小 | ~12GB |
| 显存需求 | 12-16GB |
| 推荐 Tier | mid_vram |
| 推荐分辨率 | 1024x1024 / 768x1360 |
| 推荐步数 | 20-28 |
| 推荐 CFG | 1.0（guidance_scale 3.5） |
| 推荐采样器 | euler |
| 推荐调度器 | simple |
| 适用场景 | 中高显存环境的高质量生成 |
| 备注 | 质量接近 FP16，速度略快 |

### FLUX.1-dev GGUF Q8_0

| 项目 | 值 |
|------|-----|
| 文件大小 | ~13GB |
| 显存需求 | 10-12GB |
| 推荐 Tier | mid_vram / low_vram（12GB） |
| 推荐分辨率 | 1024x1024 / 768x1024 |
| 推荐步数 | 20-28 |
| 推荐 CFG | 1.0（guidance_scale 3.5） |
| 推荐采样器 | euler |
| 推荐调度器 | simple |
| 适用场景 | 12GB 显存的最优选择 |
| 所需节点 | ComfyUI-GGUF |

### FLUX.1-dev GGUF Q5_K_S

| 项目 | 值 |
|------|-----|
| 文件大小 | ~8.5GB |
| 显存需求 | 7-9GB |
| 推荐 Tier | low_vram |
| 推荐分辨率 | 768x768 / 768x1024 |
| 推荐步数 | 20-25 |
| 推荐 CFG | 1.0（guidance_scale 3.5） |
| 推荐采样器 | euler |
| 推荐调度器 | simple |
| 适用场景 | 8-10GB 显存的较优选择 |
| 所需节点 | ComfyUI-GGUF |

### FLUX.1-dev GGUF Q4_K_S

| 项目 | 值 |
|------|-----|
| 文件大小 | ~6.8GB |
| 显存需求 | 5-7GB |
| 推荐 Tier | low_vram |
| 推荐分辨率 | 768x768 / 512x768 |
| 推荐步数 | 20-25 |
| 推荐 CFG | 1.0（guidance_scale 3.5） |
| 推荐采样器 | euler |
| 推荐调度器 | simple |
| 适用场景 | 6-8GB 低显存首选 |
| 所需节点 | ComfyUI-GGUF |
| 备注 | 细节有一定损失，适合快速迭代和预览 |

### FLUX.1-dev GGUF Q2_K

| 项目 | 值 |
|------|-----|
| 文件大小 | ~4.5GB |
| 显存需求 | 4-5GB |
| 推荐 Tier | low_vram（极低配） |
| 推荐分辨率 | 512x512 / 512x768 |
| 推荐步数 | 20-25 |
| 推荐 CFG | 1.0（guidance_scale 3.5） |
| 推荐采样器 | euler |
| 推荐调度器 | simple |
| 适用场景 | 仅在 ≤6GB 显存时使用 |
| 所需节点 | ComfyUI-GGUF |
| 备注 | 质量损失明显，仅用于验证构图和提示词 |

---

## SDXL 系列

### RealVisXL V5.0

| 项目 | 值 |
|------|-----|
| 文件大小 | ~6.5GB |
| 显存需求 | 8-10GB |
| 推荐 Tier | low_vram / mid_vram |
| 推荐分辨率 | 1024x1024 / 896x1152 / 1152x896 / 768x1344 |
| 推荐步数 | 25-35 |
| 推荐 CFG | 5.0-7.0 |
| 推荐采样器 | dpmpp_2m |
| 推荐调度器 | karras |
| 适用场景 | 写实人像、产品图、风景照 |
| 负向提示词 | 需要（推荐使用标准 SDXL 负向模板） |

### SDXL Base 1.0

| 项目 | 值 |
|------|-----|
| 文件大小 | ~6.5GB |
| 显存需求 | 8-10GB |
| 推荐 Tier | low_vram / mid_vram |
| 推荐分辨率 | 1024x1024 / 896x1152 / 1152x896 |
| 推荐步数 | 25-40 |
| 推荐 CFG | 5.0-8.0 |
| 推荐采样器 | dpmpp_2m |
| 推荐调度器 | karras |
| 适用场景 | 通用图像生成、作为微调基底 |
| 负向提示词 | 需要 |
| 备注 | 可配合 SDXL Refiner 提升质量（额外 ~6GB 显存） |

---

## SD 1.5 系列

### SD 1.5 通用

| 项目 | 值 |
|------|-----|
| 文件大小 | ~2-4GB |
| 显存需求 | 4-6GB |
| 推荐 Tier | low_vram（极低配） |
| 推荐分辨率 | 512x512 / 512x768 / 768x512 |
| 推荐步数 | 20-30 |
| 推荐 CFG | 7.0-9.0 |
| 推荐采样器 | dpmpp_2m 或 euler_a |
| 推荐调度器 | karras |
| 适用场景 | 极低显存环境、快速迭代、LoRA 生态最丰富 |
| 负向提示词 | 强烈推荐（对质量影响大） |
| 备注 | 分辨率不可超过 768，超过会出现重复图案 |

---

## 模型选择速查表

| 可用显存 | 推荐模型 | 最大分辨率 | 备注 |
|---------|---------|-----------|------|
| 4-5GB | FLUX GGUF Q2_K 或 SD 1.5 | 512x768 | 仅基础生成 |
| 6-7GB | FLUX GGUF Q4_K_S | 768x768 | 低显存首选 |
| 8-9GB | FLUX GGUF Q5_K_S 或 RealVisXL | 768x1024 / 1024x1024 | 质量/显存平衡 |
| 10-12GB | FLUX GGUF Q8_0 或 FLUX FP8 | 1024x1024 | 接近无损质量 |
| 12-16GB | FLUX FP16 | 1024x1024 | 最优质量 |
| 20-24GB | FLUX FP16 + 身份保持 | 1024x1024+ | 全功能解锁 |

---

## VAE 推荐

| 模型系列 | 推荐 VAE | 备注 |
|---------|---------|------|
| FLUX | ae.safetensors（FLUX 专用 VAE） | 必须使用 FLUX VAE |
| SDXL | sdxl_vae.safetensors 或 内置 | 多数 SDXL checkpoint 自带 |
| SD 1.5 | vae-ft-mse-840000 | 推荐外挂，减少色偏 |

## CLIP 模型推荐

| 模型系列 | 推荐 CLIP | 备注 |
|---------|----------|------|
| FLUX | clip_l.safetensors + t5xxl_fp16.safetensors | DualCLIPLoader 加载 |
| FLUX（低显存） | clip_l.safetensors + t5xxl_fp8_e4m3fn.safetensors | T5 使用 FP8 节省显存 |
| SDXL | 内置 CLIP | checkpoint 自带 |
| SD 1.5 | 内置 CLIP | checkpoint 自带 |
