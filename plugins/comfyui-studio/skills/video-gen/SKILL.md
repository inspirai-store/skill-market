---
name: video-gen
description: 视频生成工作流 — FramePack/AnimateDiff/Wan。当用户要求生成视频、动画、图片转视频、或角色动态效果时触发。
---

# 视频生成工作流

按以下流程完成视频生成任务。每步完成后向用户报告进展，遇到问题时给出明确的解决指引。

---

## 前置检查

1. 确认 `.comfyui-studio/inventory.json` 存在，不存在则提示用户运行 `/studio-scan`。
2. 读取 `inventory.json`，提取：
   - `recommended_tier`（low_vram / mid_vram / high_vram）
   - `installed_models`（已安装的视频模型列表）
   - `installed_nodes`（已安装的自定义节点列表）
3. 确认 ComfyUI 正在运行（连接 `http://127.0.0.1:8188`）。

---

## 步骤 1：引擎自动选择

根据 `recommended_tier` 和已安装节点自动选择视频生成引擎：

### low_vram（≤12GB 显存）

```
优先级 1: FramePack（6GB 起步）
  → 所需节点: FramePack（ComfyUI 内置或第三方封装）
  → 优点: 极低显存、支持长视频（60秒+）、质量高
  → 缺点: 生成速度慢
  → 推荐场景: 图生视频、长视频生成

优先级 2: AnimateDiff V3（8GB 起步）
  → 所需节点: ComfyUI-AnimateDiff-Evolved
  → 优点: 速度快、生态成熟、短片效果好
  → 缺点: 时长受限（2-4秒）、分辨率受限
  → 推荐场景: 快速迭代、短动画循环

优先级 3: LTX Video（8GB 起步）
  → 所需节点: ComfyUI-LTXVideo
  → 优点: 速度快、质量中高
  → 缺点: 生态较新
  → 推荐场景: 快速视频生成
```

### mid_vram（12-20GB 显存）

```
优先级 1: Wan 2.1 量化版（12GB 起步）
  → 所需节点: ComfyUI-WanVideoWrapper
  → 优点: 质量高、支持图生视频和文生视频
  → 缺点: 速度中等
  → 推荐场景: 高质量短视频（5秒）

优先级 2: FramePack（如需长视频）
  → 长视频场景（>10秒）时优先

优先级 3: AnimateDiff V3 + 高分辨率
  → 512x768 分辨率，快速出片
```

### high_vram（≥24GB 显存）

```
优先级 1: Wan 2.2 14B MoE
  → 所需节点: ComfyUI-WanVideoWrapper
  → 优点: 最高质量、电影级效果
  → 缺点: 速度慢、显存占用大
  → 推荐场景: 电影级视频、商业应用

优先级 2: Wan 2.1 原生 FP16
  → 更快速度，质量依然很高

优先级 3: FramePack（超长视频）
  → 60秒+ 视频场景
```

**选择逻辑：**
1. 检查 `inventory.json` 中已安装的视频模型和节点
2. 根据 tier 和用户需求（时长/质量/速度）匹配最优引擎
3. 缺失模型/节点时提示安装（使用 `download_model` 工具）

---

## 步骤 2：图生视频 vs 文生视频决策树

```
用户需求
├── 有参考图片
│   ├── 需要图片动起来 → 图生视频 (img2video)
│   │   ├── 低显存 → FramePack / AnimateDiff img2img
│   │   ├── 中显存 → Wan 2.1 img2video
│   │   └── 高显存 → Wan 2.2 img2video
│   └── 需要风格参考 → 文生视频 + 风格控制
│       └── 提取风格关键词，使用文生视频
│
└── 无参考图片
    ├── 纯文字描述 → 文生视频 (txt2video)
    │   ├── 低显存 → AnimateDiff + txt2img
    │   ├── 中显存 → Wan 2.1 txt2video
    │   └── 高显存 → Wan 2.2 txt2video
    └── 需要先生图再生视频 → 串联工作流
        └── 先调用 image-gen 生成关键帧，再 img2video
```

---

## 步骤 3：各引擎工作流构建

使用 Comfy Pilot 的 `edit_graph` 工具构建工作流。

### 3A — FramePack 工作流

**适用场景：** 图生视频，低显存长视频

**核心节点链：**

1. `LoadImage` — 加载输入图片
2. `FramePackLoader`（或等效节点）— 加载 FramePack 模型
3. `CLIPTextEncode` — 正向提示词（描述目标动作）
4. `CLIPTextEncode` — 负向提示词
5. `FramePackSampler` — 采样生成视频帧
   - `steps`: 20-30
   - `total_frames`: 帧数（24fps x 秒数）
   - `motion_strength`: 0.5-1.0（运动强度）
6. `VHS_VideoCombine`（VideoHelperSuite）— 合并为视频文件

**关键参数：**
- `total_frames`: 目标帧数（建议 24fps，5秒 = 120帧）
- `motion_strength`: 0.3（微动）~ 1.0（大幅运动）
- `guidance_scale`: 7.0-9.0

### 3B — AnimateDiff V3 工作流

**适用场景：** 快速短动画，循环动画

**核心节点链：**

1. `CheckpointLoaderSimple` — 加载 SD 1.5 checkpoint
2. `ADE_AnimateDiffLoaderWithContext` — 加载 AnimateDiff 运动模块
   - `motion_module`: mm_sdxl_v10_beta 或 mm_sd15_v3
   - `context_length`: 16（上下文帧数）
   - `context_overlap`: 4（重叠帧数）
3. `CLIPTextEncode` x2 — 正向/负向提示词
4. `EmptyLatentImage` — 设置分辨率和帧数
   - `width`: 512, `height`: 768
   - `batch_size`: 16（帧数）
5. `KSampler` — 采样
6. `VAEDecode` — 解码
7. `VHS_VideoCombine` — 输出视频
   - `frame_rate`: 8（AnimateDiff 推荐 8fps）
   - `format`: "video/h264-mp4"

**关键参数：**
- `batch_size`（帧数）: 16（2秒@8fps）~ 32（4秒@8fps）
- `steps`: 20-25
- `cfg`: 7.0-8.0
- `sampler`: dpmpp_2m + karras

### 3C — Wan 2.1/2.2 工作流

**适用场景：** 高质量视频，电影级效果

**核心节点链（图生视频）：**

1. `CheckpointLoaderSimple` 或 `UNETLoader` — 加载 Wan 模型
2. `CLIPLoader` — 加载文本编码器
3. `VAELoader` — 加载 Wan VAE
4. `LoadImage` — 加载输入图片
5. `CLIPTextEncode` — 正向提示词
6. `WanImageToVideo`（WanVideoWrapper）— 图生视频采样
   - `steps`: 30-50
   - `cfg`: 5.0-7.0
   - `num_frames`: 81（约5秒@16fps）
7. `VAEDecode` — 解码视频帧
8. `VHS_VideoCombine` — 输出视频

**核心节点链（文生视频）：**

1-3 同上（模型/CLIP/VAE 加载）
4. `CLIPTextEncode` — 正向提示词（详细描述场景和动作）
5. `WanTextToVideo`（WanVideoWrapper）— 文生视频采样
   - `width`: 512, `height`: 512（量化版）/ 720, 480（14B）
   - `num_frames`: 81
   - `steps`: 30-50
   - `cfg`: 5.0-7.0
6. `VAEDecode` — 解码
7. `VHS_VideoCombine` — 输出

### 3D — LTX Video 工作流

**适用场景：** 快速视频生成

**核心节点链：**

1. `LTXVideoModelLoader` — 加载 LTX Video 模型
2. `LTXVideoTextEncode` — 文本编码
3. `LTXVideoSampler` — 采样
   - `steps`: 20-30
   - `cfg`: 3.0-5.0
4. `LTXVideoDecoder` — 解码
5. `VHS_VideoCombine` — 输出视频

---

## 步骤 4：关键帧控制

### 方法 A — 首尾帧控制

适用于 Wan 和 FramePack：

1. 加载**起始帧**（第一帧图片）
2. 可选加载**结束帧**（目标姿态/场景）
3. 模型自动插值中间帧

### 方法 B — 多关键帧控制

适用于 AnimateDiff：

1. 使用 `ADE_MultivalDynamic` 节点设置多个关键帧时间点
2. 每个关键帧可指定不同的提示词权重或 ControlNet 引导
3. 实现镜头切换、动作分段等效果

### 方法 C — ControlNet 引导

适用于所有引擎：

1. 使用 OpenPose 关键帧序列控制人物动作
2. 使用 Depth 序列控制镜头运动
3. `ControlNetApply` 应用到采样过程

---

## 步骤 5：运动强度调节

### 各引擎运动参数

| 引擎 | 参数名 | 微动 | 中等 | 强烈 | 说明 |
|------|-------|------|------|------|------|
| FramePack | motion_strength | 0.2-0.4 | 0.5-0.7 | 0.8-1.0 | 全局运动强度 |
| AnimateDiff | motion_scale | 0.5-0.8 | 1.0 | 1.2-1.5 | 运动模块缩放 |
| Wan | guidance_scale | 3.0-4.0 | 5.0-7.0 | 8.0-10.0 | CFG 影响运动幅度 |
| LTX Video | motion_bucket_id | 30-60 | 80-127 | 150-200 | 运动桶 ID |

### 运动类型与参数建议

| 运动类型 | 建议强度 | 提示词关键词 |
|---------|---------|------------|
| 微风吹拂、头发飘动 | 低 | "gentle breeze, subtle movement" |
| 行走、转头 | 中 | "walking, turning head" |
| 奔跑、跳跃 | 高 | "running, jumping, dynamic motion" |
| 镜头推拉 | 中 | "camera zoom in/out" |
| 镜头平移 | 中 | "camera panning left/right" |
| 静态场景微动 | 极低 | "slight movement, living photo" |

---

## 步骤 6：与已安装节点对接

### 必需节点检查清单

| 引擎 | 必需节点 | 功能 |
|------|---------|------|
| 所有 | VideoHelperSuite | 视频合并输出（`VHS_VideoCombine`） |
| FramePack | FramePack 节点包 | FramePack 模型加载和采样 |
| AnimateDiff | ComfyUI-AnimateDiff-Evolved | 运动模块加载和上下文控制 |
| Wan | ComfyUI-WanVideoWrapper | Wan 模型封装和采样节点 |
| LTX Video | ComfyUI-LTXVideo | LTX Video 专用节点 |
| 帧插值 | Frame-Interpolation | RIFE/FILM 帧插值提升帧率 |

### 可选增强节点

| 节点 | 功能 | 适用场景 |
|------|------|---------|
| Frame-Interpolation | 帧插值（RIFE） | 将 8fps 提升到 24fps |
| VideoHelperSuite | 视频加载/分割/合并 | 视频预处理和后处理 |
| ComfyUI-KJNodes | 批量图像处理 | 关键帧批处理 |
| ControlNet 系列 | 运动控制 | OpenPose/Depth 引导 |

### 节点缺失处理

检查 `inventory.json` 中 `installed_nodes`，如果缺少必需节点：

```
提示用户安装缺失节点：
  方法 1: comfy node install {节点名}
  方法 2: 在 ComfyUI Manager 中搜索安装
  方法 3: cd {COMFYUI_PATH}/custom_nodes && git clone {节点仓库}

安装后需重启 ComfyUI。
```

---

## 步骤 7：8GB 显存最佳实践

在 ≤8GB 显存环境下生成视频，遵循以下原则：

### 引擎选择

1. **首选 FramePack** — 6GB 即可运行，支持长视频
2. **备选 AnimateDiff** — 8GB 可用，短动画效率高
3. **避免 Wan** — 量化版至少需要 12GB

### 显存优化技巧

1. **降低分辨率**
   - FramePack: 512x512 起步
   - AnimateDiff: 512x512，避免超过 512x768

2. **减少帧数**
   - AnimateDiff: 16 帧为上限
   - FramePack: 分段生成，每段 24-48 帧

3. **启用 Tiled VAE**
   - 使用 `VAEDecodeTiled` 替代 `VAEDecode`
   - 显著降低 VAE 解码的显存峰值

4. **使用 FP16 或更低精度**
   - AnimateDiff: 使用 FP16 运动模块
   - 文本编码器: 使用 FP8 T5

5. **关闭不必要的预览**
   - ComfyUI 设置中关闭实时预览
   - 减少采样过程中的显存占用

6. **分段生成长视频**
   - 将长视频分为多段（每段 2-4 秒）
   - 使用帧插值填充过渡
   - 最后用 VideoHelperSuite 拼接

### 推荐 8GB 工作流配置

```
引擎: FramePack
分辨率: 512x512
帧数: 48（2秒@24fps）
步数: 20
motion_strength: 0.5
VAE: Tiled 模式
```

---

## 步骤 8：执行与后处理

### 8.1 执行工作流

```
调用 run 工具执行工作流
```

> **注意：** 视频生成耗时较长（几分钟到几十分钟），提前告知用户预计等待时间。

### 8.2 后处理选项

1. **帧插值** — 使用 RIFE 将低帧率提升到 24/30fps
2. **超分辨率** — 逐帧放大后重新合并
3. **循环处理** — 首尾帧融合实现无缝循环
4. **音频合成** — 配合 voice-lipsync skill 添加语音

### 8.3 输出格式

| 格式 | 用途 | VHS_VideoCombine 设置 |
|------|------|---------------------|
| MP4 (H.264) | 通用播放 | format: "video/h264-mp4" |
| GIF | 短循环动画 | format: "image/gif" |
| WebM | 网页嵌入 | format: "video/webm" |
| 帧序列 PNG | 后期编辑 | 使用 SaveImage 逐帧保存 |

### 8.4 质量检查

- [ ] 运动是否流畅（无明显卡顿/跳帧）
- [ ] 主体是否稳定（无抖动/变形）
- [ ] 面部是否一致（无闪烁/突变）
- [ ] 背景是否稳定（无不合理变化）
- [ ] 帧率是否足够（≥16fps 观感流畅）
- [ ] 视频时长是否达到预期
- [ ] 运动幅度是否合适

向用户展示结果并询问是否需要调整。
