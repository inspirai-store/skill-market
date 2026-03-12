# VRAM 估算表

模型显存占用估算，用于判断用户硬件是否满足需求。数值为推荐的最低可用显存（包含模型加载 + 推理余量），实际占用可能因分辨率、批量大小等因素波动。

---

## Checkpoint / UNet 模型

| 模型 | 类型 | FP16 | FP8 | GGUF Q8 | GGUF Q4 | 推荐显存 |
|------|------|------|-----|---------|---------|---------|
| FLUX.1-dev | Transformer UNet | 16GB | 10GB | 10GB | 6GB | 12GB+ (FP8/GGUF Q8) |
| FLUX.1-schnell | Transformer UNet | 16GB | 10GB | 10GB | 6GB | 12GB+ (FP8/GGUF Q8) |
| SDXL base 1.0 | UNet | 8GB | 6GB | — | — | 8GB+ |
| SD 1.5 | UNet | 4GB | — | — | — | 6GB+ |
| RealVisXL V5.0 | SDXL Checkpoint | 8GB | 6GB | — | — | 8GB+ |
| Animagine XL 3.1 | SDXL Checkpoint | 8GB | 6GB | — | — | 8GB+ |

## 视频生成模型

| 模型 | 类型 | FP16 | FP8 | GGUF Q8 | GGUF Q4 | 推荐显存 |
|------|------|------|-----|---------|---------|---------|
| Wan 2.2 14B（T2V/I2V） | 视频 DiT | 28GB+ | 18GB | 16GB | 10GB | 24GB+ (FP16) / 12GB+ (GGUF Q8) |
| Wan 2.1 1.3B（T2V/I2V） | 视频 DiT | 6GB | 5GB | — | — | 8GB+ |
| FramePack (Wan 2.1 I2V) | 帧打包视频 | 6GB | — | — | — | 6GB+ |
| AnimateDiff V3 | 运动模块 | +2GB | — | — | — | 10GB+（叠加在 SDXL 上） |
| LTX Video 0.9 | 视频 DiT | 12GB | 8GB | — | — | 12GB+ |
| HunyuanVideo | 视频 DiT | 24GB+ | 16GB | 14GB | 10GB | 16GB+ (FP8) |

## ControlNet 模型

| 模型 | 适配基模 | FP16 | 推荐显存（叠加） |
|------|---------|------|-----------------|
| ControlNet SDXL（Canny/Depth/OpenPose） | SDXL | +2.5GB | 叠加在基模之上 |
| ControlNet SD1.5（Canny/Depth/OpenPose） | SD 1.5 | +1.5GB | 叠加在基模之上 |
| ControlNet FLUX（Union/Canny/Depth） | FLUX | +3.5GB | 叠加在基模之上 |
| ControlNet FLUX Lite | FLUX | +1GB | 叠加在基模之上 |

## 身份保持与适配器模型

| 模型 | 适配基模 | FP16 | 推荐显存（叠加） |
|------|---------|------|-----------------|
| IP-Adapter SDXL | SDXL | +1.5GB | 叠加在基模之上 |
| IP-Adapter FaceID SDXL | SDXL | +2GB | 叠加在基模之上 |
| IP-Adapter FLUX | FLUX | +2GB | 叠加在基模之上 |
| InstantID | SDXL | +2.5GB | 叠加在基模之上 |
| PuLID FLUX | FLUX | +3GB | 叠加在基模之上 |
| InfiniteYou FLUX | FLUX | +3GB | 叠加在基模之上 |

## LoRA 模型

| 类型 | 适配基模 | 典型大小 | 推荐显存（叠加） |
|------|---------|---------|-----------------|
| LoRA（rank 16-32） | 任意 | 20-100MB | +0.1-0.3GB |
| LoRA（rank 64-128） | 任意 | 100-400MB | +0.3-0.8GB |
| In-Context LoRA | FLUX | ~200MB | +0.3GB |

## 其他模型

| 模型 | 类型 | 显存占用 | 说明 |
|------|------|---------|------|
| CLIP-L | 文本编码器 | ~0.5GB | SDXL/FLUX 必需 |
| CLIP-G (OpenCLIP ViT-bigG) | 文本编码器 | ~1.5GB | SDXL 必需 |
| T5-XXL FP16 | 文本编码器 | ~10GB | FLUX 必需 |
| T5-XXL FP8 | 文本编码器 | ~5GB | FLUX 文本编码器量化版 |
| T5-XXL GGUF Q4 | 文本编码器 | ~3GB | FLUX 文本编码器极限量化 |
| SDXL VAE | VAE | ~0.2GB | |
| FLUX VAE | VAE | ~0.2GB | |
| CLIP Vision (ViT-H) | 视觉编码器 | ~1GB | IP-Adapter 必需 |
| InsightFace (antelopev2) | 人脸分析 | ~0.5GB | InstantID/PuLID 必需 |
| 4x-UltraSharp | 超分模型 | ~0.1GB | |
| RealESRGAN x4plus | 超分模型 | ~0.1GB | |

---

## 显存档位速查

### low_vram（≤12GB）推荐模型组合

```
文生图：FLUX.1-dev GGUF Q4（6GB）+ T5-XXL GGUF Q4（3GB）+ CLIP-L（0.5GB）≈ 10GB
文生图：SDXL + VAE ≈ 8.5GB
视频：FramePack ≈ 6GB（需先卸载图像模型）
视频：Wan 2.1 1.3B ≈ 8GB
```

### mid_vram（12-20GB）推荐模型组合

```
文生图：FLUX.1-dev FP8（10GB）+ T5-XXL FP8（5GB）+ CLIP-L（0.5GB）≈ 16GB
文生图：FLUX.1-dev GGUF Q8 + T5-XXL FP8 ≈ 16GB
文生图 + 身份保持：SDXL（8GB）+ InstantID（2.5GB）≈ 11GB
视频：Wan 2.2 14B GGUF Q8 ≈ 16GB
```

### high_vram（≥24GB）推荐模型组合

```
文生图：FLUX.1-dev FP16（16GB）+ T5-XXL FP16（10GB）≈ 全功能
文生图 + 身份保持：FLUX FP16 + PuLID（3GB）≈ 全功能
视频：Wan 2.2 14B FP16 ≈ 28GB（需 32GB 显存或开启 offload）
视频：Wan 2.2 14B FP8 ≈ 18GB
```

---

## 注意事项

1. 以上数值为近似估算，实际显存占用受以下因素影响：
   - 生成分辨率（分辨率越高显存越大）
   - 批量大小（batch_size > 1 会显著增加显存）
   - 是否启用 Tiled VAE（可大幅降低 VAE 解码显存）
   - 操作系统保留显存（Windows 通常保留 0.5-1GB）

2. **显存不足时的降级策略：**
   - 启用 `--lowvram` 或 `--novram` 模式（模型部分卸载到内存）
   - 使用 Tiled VAE 替代标准 VAE 解码
   - 降低生成分辨率
   - 使用量化版本（FP8 / GGUF Q8 / GGUF Q4）
   - 换用更小的模型

3. **GGUF 量化质量参考：**
   - Q8_0：几乎无损，推荐首选量化格式
   - Q5_K_S：轻微质量损失，日常使用足够
   - Q4_K_S：明显质量损失，适合显存极度紧张的情况
   - Q3_K_S：较大质量损失，仅推荐用于测试
