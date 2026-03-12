---
description: 视频生成 — 描述需求，自动选择引擎并执行
argument-hint: [视频描述或源图片路径]
allowed-tools: [Read, Write, Bash, Glob]
---

# /studio-video

根据用户需求自动选择视频生成引擎，构建并执行 ComfyUI 视频工作流。

## 执行流程

### 1. 前置检查

检查 `.comfyui-studio/inventory.json` 是否存在。如果不存在，提示用户：

```
未找到环境配置文件。请先运行 /studio-setup 完成首次配置。
```

读取 inventory.json，提取 `hardware.recommended_tier`、`installed_models`、`installed_nodes`。

### 2. 加载知识

读取以下 skill 文档：

- `skills/video-gen/SKILL.md` — 视频生成引擎选择和工作流构建指南
- `skills/video-gen/references/engine-matrix.md` — 引擎详细对比
- `skills/prompt-engineer/SKILL.md` — 提示词优化

**严格遵循 Skill 中定义的引擎选择逻辑和参数推荐**，不要使用 Skill 之外的方案。

### 3. 分析用户需求

解析用户输入，判断：

- **输入类型：**
  - 纯文字描述 → 文生视频（T2V）
  - 提供了图片路径 → 图生视频（I2V）
  - 提供了视频路径 → 视频转视频（V2V）

- **视频风格：** 写实 / 动漫 / 抽象艺术
- **时长偏好：** 短片段（2-5秒） / 中等片段（5-10秒） / 长片段（10秒+）
- **运动强度：** 静态微动 / 中等运动 / 剧烈运动

### 4. 选择视频引擎

按照 `video-gen/SKILL.md` 中的引擎自动选择逻辑，根据 `hardware.recommended_tier` 和已安装节点选择引擎。

参考 `video-gen/references/engine-matrix.md` 获取各引擎的详细参数推荐。

### 5. 图生视频流程

如果用户提供了源图片：

1. 确认图片文件存在且可读取
2. 检查图片分辨率，必要时调整到目标引擎支持的分辨率
3. 按 Skill 指导构建 I2V 工作流
4. 参考 `skills/video-gen/examples/img2video.json` 模板

### 6. 文生视频流程

如果用户仅提供文字描述：

1. 读取 `skills/prompt-engineer/SKILL.md` 优化视频提示词
2. 视频提示词需包含运动描述
3. 按 Skill 指导构建 T2V 工作流

### 7. 构建并执行工作流

1. 使用 Comfy Pilot 的 `edit_graph` 构建工作流
2. 交叉校验所有节点和模型是否在 `installed_models` 和 `installed_nodes` 中
3. 如果缺失必要模型/节点，提示用户安装
4. 使用 Comfy Pilot 的 `run` 执行工作流
5. 查看输出结果

### 8. 输出和后续

向用户展示生成结果，并提供后续操作建议：

```
视频已生成完成。

后续操作：
- 调整运动幅度/方向后重新生成
- 使用 /studio-voice 添加配音和唇形同步
- 生成更多片段后使用视频组装功能拼接
- 放大视频分辨率（如支持）
```
