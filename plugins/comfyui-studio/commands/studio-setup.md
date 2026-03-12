---
description: 首次配置 ComfyUI Studio — 检测环境、安装 Comfy Pilot、扫描硬件
argument-hint: [ComfyUI路径（可选）]
allowed-tools: [Read, Write, Bash, Glob, Grep]
---

# /studio-setup

首次配置 ComfyUI Studio 环境。

## 执行流程

1. 读取 `skills/setup/SKILL.md` 获取完整的配置流程指引。

2. 如果用户提供了 ComfyUI 路径参数（如 `/studio-setup D:/MyComfyUI`），直接使用该路径作为 `COMFYUI_PATH`，跳过自动探测步骤。

3. 如果未提供路径参数，按照 `skills/setup/SKILL.md` 中的步骤 1 自动探测 ComfyUI 安装路径。

4. 严格按照 `skills/setup/SKILL.md` 中步骤 1-7 的顺序执行配置流程：
   - 步骤 1：检测 ComfyUI 路径
   - 步骤 2：检测 Comfy Pilot
   - 步骤 3：生成 .mcp.json
   - 步骤 4：检测 ComfyUI 运行状态
   - 步骤 5：触发环境扫描（启动 comfy-scanner agent）
   - 步骤 6：检测 API Token
   - 步骤 7：输出环境报告

5. 最终输出配置完成的环境报告，告知用户可以使用 `/studio-gen` 开始创作。
