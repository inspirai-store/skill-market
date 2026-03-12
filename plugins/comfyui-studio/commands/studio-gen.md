---
description: 图像生成 — 描述需求，自动生成并执行 ComfyUI 工作流
argument-hint: [图像描述]
allowed-tools: [Read, Write, Bash, Glob]
---

# /studio-gen

根据用户描述自动构建并执行 ComfyUI 图像生成工作流。

## 执行流程

### 1. 前置检查

检查 `.comfyui-studio/inventory.json` 是否存在。如果不存在，提示用户：

```
未找到环境配置文件。请先运行 /studio-setup 完成首次配置。
```

读取 inventory.json，提取硬件信息、已安装模型和节点。

### 2. 加载知识

读取以下 skill 文档获取工作流构建知识：

- `skills/image-gen/SKILL.md` — 图像生成工作流完整指南
- `skills/prompt-engineer/SKILL.md` — 提示词优化技巧（如存在）
- `skills/model-manager/references/vram-table.md` — VRAM 估算参考

### 3. 分析用户需求

解析用户提供的图像描述，判断：

- **工作流类型：** 文生图 / 图生图 / 局部重绘 / 放大 / 风格转换
- **风格偏好：** 写实 / 动漫 / 插画 / 其他
- **是否需要身份保持：** 是否提到参考图、角色一致性
- **特殊要求：** 文字渲染、特定构图、特定分辨率

### 4. 选择模型和参数

根据 `recommended_tier` 和已安装模型，按 `skills/image-gen/SKILL.md` 步骤 2 的决策树选择：

- **Checkpoint / UNet 模型**
- **VAE**
- **采样器和调度器**
- **步数和 CFG Scale**
- **分辨率**
- **LoRA（如需要）**
- **身份保持方案（如需要）**

如果所选模型未安装，提示用户是否要下载：

```
推荐使用 {模型名}，但尚未安装。
是否要下载？（约 {大小}GB，预计 {时间}）
或者使用已安装的 {替代模型名}？
```

### 5. 优化提示词

将用户的描述优化为适合目标模型的提示词格式：

- **FLUX 模型：** 使用自然语言描述，详细描绘场景、光影、风格
- **SDXL/SD1.5 模型：** 使用标签式提示词，包含质量标签、风格标签、细节标签

同时生成负面提示词（SDXL/SD1.5 需要，FLUX 通常不需要）。

向用户展示优化后的提示词，询问是否需要调整。

### 6. 构建工作流

使用 Comfy Pilot 的 `edit_graph` 工具，按 `skills/image-gen/SKILL.md` 步骤 4 的指引构建完整的 ComfyUI API 格式工作流。

交叉校验所有节点类型是否在 `installed_nodes` 中可用。

### 7. 执行工作流

使用 Comfy Pilot 的 `run` 工具执行工作流。

### 8. 展示结果

使用 Comfy Pilot 的 `view_image` 工具查看并展示生成结果。

按 `skills/image-gen/SKILL.md` 步骤 6 的质量检查清单评估结果，向用户报告并询问：

```
图像已生成完成。

如需调整，可以告诉我：
- 修改提示词内容
- 调整风格/画面细节
- 更换种子重新生成
- 放大/增强清晰度
- 局部重绘某个区域
```
