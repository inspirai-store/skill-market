---
name: image-gen
description: 图像生成工作流 — FLUX/SDXL + 身份保持。当用户要求生成图像、角色立绘、场景图、或进行图像编辑（放大/重绘/风格转换）时触发。
---

# 图像生成工作流

按以下流程完成图像生成任务。每步完成后向用户报告进展，遇到问题时给出明确的解决指引。

---

## 前置检查

1. 确认 `.comfyui-studio/inventory.json` 存在，不存在则提示用户运行 `/studio-scan`。
2. 读取 `inventory.json`，提取：
   - `recommended_tier`（low_vram / mid_vram / high_vram）
   - `installed_models`（已安装的 checkpoint / LoRA / VAE 列表）
   - `installed_nodes`（已安装的自定义节点列表）
3. 确认 ComfyUI 正在运行（连接 `http://127.0.0.1:8188`）。

---

## 步骤 1：工作流选择

根据用户需求和 `recommended_tier` 选择工作流类型：

| 用户需求 | 工作流类型 | 说明 |
|---------|-----------|------|
| 文字描述生成图片 | txt2img | 最基础的文生图 |
| 基于参考图生成 | img2img | 图生图，保留构图 |
| 局部重绘 | inpaint | 遮罩区域重绘 |
| 放大/增强清晰度 | upscale | 超分辨率放大 |
| 角色一致性多图 | txt2img + 身份保持 | 需要 IP-Adapter 或 InstantID 等 |
| 风格转换 | img2img + 风格 LoRA | 或 IP-Adapter 风格迁移 |

---

## 步骤 2：模型选择决策树

根据 `recommended_tier` 和已安装模型自动选择：

### low_vram（≤12GB 显存）

```
优先级 1: FLUX.1-dev GGUF Q4_K_S（~6GB 显存）
  → 需要节点: ComfyUI-GGUF
  → 优点: 高质量文本理解、低显存占用
  → 缺点: 生成速度较慢

优先级 2: RealVisXL V5.0（SDXL，~8GB 显存）
  → 优点: 写实风格出色、生态成熟
  → 缺点: 文本理解弱于 FLUX

优先级 3: SD 1.5 系列（~4GB 显存）
  → 仅在显存极低（<8GB）时使用
  → 配合 --lowvram 模式
```

### mid_vram（12-20GB 显存）

```
优先级 1: FLUX.1-dev FP16（~12GB 显存）
  → 最佳质量/显存平衡
  → 可配合 IP-Adapter FLUX

优先级 2: FLUX.1-dev FP8（~10GB 显存）
  → 质量略低于 FP16，速度更快

优先级 3: RealVisXL V5.0 + Refiner
  → SDXL 全流程，写实最优
```

### high_vram（≥24GB 显存）

```
优先级 1: FLUX.1-dev 原生 FP16 + 高级身份保持
  → PuLID FLUX / InfiniteYou
  → 最高质量角色一致性

优先级 2: FLUX.1-dev + In-Context LoRA
  → 多角色/多场景一致性

优先级 3: SDXL + InstantID + IP-Adapter
  → 组合方案，灵活度最高
```

**选择逻辑：**
1. 检查 `inventory.json` 中已安装的 checkpoint，优先使用已有模型
2. 如果没有合适模型，根据 tier 推荐下载（使用 `download_model` 工具）
3. 同时检查所需自定义节点是否已安装，缺失则提示安装

---

## 步骤 3：身份保持方案选择

当用户需要角色一致性（多张图保持同一角色外观）时，按以下决策树选择：

### 方案 A — IP-Adapter（通用方案）

- **显存需求：** 8GB+
- **适用模型：** SDXL / FLUX
- **适用场景：** 风格参考、角色参考（面部+服装）、构图参考
- **所需节点：** ComfyUI_IPAdapter_plus
- **参考强度推荐：** 0.6-0.8（面部）、0.4-0.6（风格）
- **优点：** 通用性强，显存占用适中，支持多参考图
- **缺点：** 面部相似度不如专用方案

### 方案 B — InstantID（面部身份）

- **显存需求：** 10GB+
- **适用模型：** 仅 SDXL
- **适用场景：** 严格面部身份保持（如真人照片风格）
- **所需节点：** ComfyUI_InstantID
- **参考强度推荐：** 0.7-0.9
- **优点：** 面部身份保持度最高（SDXL 生态内）
- **缺点：** 仅支持 SDXL、姿态自由度受限

### 方案 C — In-Context LoRA（FLUX 专用）

- **显存需求：** 12GB+
- **适用模型：** 仅 FLUX
- **适用场景：** 角色一致性多场景生成、漫画/插画分镜
- **所需节点：** 无特殊节点需求（标准 LoRA 加载）
- **使用方式：** 将参考图拼接在生成区域旁边，模型自动学习一致性
- **优点：** 无需额外模型、角色+服装+风格全面一致
- **缺点：** 需要 FLUX、占用较多显存

### 方案 D — PuLID / InfiniteYou（最高质量）

- **显存需求：** 24GB+
- **适用模型：** FLUX（PuLID-FLUX）/ SDXL（PuLID）
- **适用场景：** 要求最高面部保真度的商业级应用
- **所需节点：** ComfyUI-PuLID-FLUX / ComfyUI-InfiniteYou
- **优点：** 面部质量最高、编辑自由度大
- **缺点：** 显存需求大、生成速度慢

**快速选择表：**

| 显存 | 模型 | 推荐方案 |
|------|------|---------|
| 8GB | SDXL | IP-Adapter |
| 8GB | FLUX GGUF | IP-Adapter FLUX（如可用） |
| 10-12GB | SDXL | InstantID |
| 12-16GB | FLUX | In-Context LoRA |
| 24GB+ | FLUX | PuLID / InfiniteYou |

---

## 步骤 4：构建工作流

使用 Comfy Pilot 的 `edit_graph` 工具构建工作流，按以下步骤操作：

### 4.1 清空画布

```
调用 edit_graph，删除所有现有节点（或新建空工作流）
```

### 4.2 创建核心节点

**FLUX txt2img 基础节点链：**

1. **模型加载器**
   - GGUF: `UNETLoader`（class_type: "UNETLoader"）
   - FP16/FP8: `CheckpointLoaderSimple`
2. **文本编码器** — `DualCLIPLoader` → `CLIPTextEncode`（正向提示词）
3. **空潜空间** — `EmptyLatentImage`（设置分辨率）
4. **采样器** — `KSampler`（设置步数、CFG、采样器、调度器）
5. **VAE 解码** — `VAEDecode`
6. **保存图片** — `SaveImage`

**SDXL txt2img 基础节点链：**

1. `CheckpointLoaderSimple` → checkpoint
2. `CLIPTextEncode` x2 → 正向/负向提示词
3. `EmptyLatentImage` → 分辨率
4. `KSampler` → 采样
5. `VAEDecode` → 解码
6. `SaveImage` → 保存

### 4.3 添加身份保持节点（如需要）

根据步骤 3 选择的方案，追加对应的控制节点：
- IP-Adapter: `IPAdapterApply` + `IPAdapterModelLoader` + `CLIPVisionLoader`
- InstantID: `InstantIDApply` + `InstantIDModelLoader` + `FaceAnalysis`
- PuLID: `ApplyPulidFlux` + `PulidFluxModelLoader`

### 4.4 添加增强节点（可选）

- **LoRA:** `LoraLoader` 插入在 checkpoint 和 CLIP 编码之间
- **ControlNet:** `ControlNetApply` + `ControlNetLoader`
- **超分放大:** `UpscaleModelLoader` + `ImageUpscaleWithModel`
- **Tiled VAE（低显存）：** 替换标准 `VAEDecode` 为 `VAEDecodeTiled`

### 4.5 连接节点

按照数据流方向连接所有节点的输入/输出端口。确保：
- MODEL 输出连接到 KSampler 的 model 输入
- CONDITIONING 正确连接到 positive/negative
- LATENT 从 EmptyLatentImage 流向 KSampler 再流向 VAEDecode
- IMAGE 从 VAEDecode 流向 SaveImage

---

## 步骤 5：参数填充

参考 `references/param-guide.md` 和 `references/model-matrix.md`，根据选定模型和 tier 填充参数：

1. **分辨率** — 根据模型和显存选择（详见 param-guide.md）
2. **步数** — 质量/速度权衡（详见 param-guide.md）
3. **CFG Scale** — 根据模型类型设置（FLUX 通常 1.0-3.5，SDXL 通常 5-8）
4. **采样器/调度器** — 根据模型推荐选择
5. **提示词** — 协助用户优化提示词（FLUX 使用自然语言，SDXL 使用标签式）
6. **种子** — 随机或用户指定

---

## 步骤 6：执行与检查

### 6.1 执行工作流

```
调用 run 工具执行工作流
```

### 6.2 查看输出

```
调用 view_image 查看生成结果
```

### 6.3 质量检查清单

逐项检查生成图像质量：

- [ ] **面部质量** — 是否存在变形、不对称、模糊
- [ ] **手部质量** — 手指数量是否正确、是否有融合/缺失
- [ ] **身体比例** — 四肢比例是否自然、是否有断裂
- [ ] **文本渲染** — 如果包含文字，是否拼写正确（FLUX 擅长此项）
- [ ] **风格一致性** — 是否符合目标风格
- [ ] **构图与光影** — 是否自然、是否有明显瑕疵
- [ ] **身份保持** — 如使用参考图，面部/服装是否一致
- [ ] **分辨率** — 输出分辨率是否符合预期

### 6.4 迭代优化

如果质量不达标：
1. **面部/手部问题** → 增加步数、使用 ADetailer/FaceDetailer 节点修复
2. **风格偏差** → 调整提示词权重、LoRA 强度、IP-Adapter 强度
3. **构图问题** → 使用 ControlNet（OpenPose/Depth）引导
4. **清晰度不足** → 使用 upscale 工作流放大
5. **身份不一致** → 提高参考强度、切换身份保持方案

向用户展示结果并询问是否需要调整。
