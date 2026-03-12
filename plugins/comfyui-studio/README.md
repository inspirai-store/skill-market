# ComfyUI Studio

**ComfyUI AI 创作工作室** — 一个 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 插件，将 ComfyUI 的图像/视频/语音/训练全流程能力整合到 Claude Code 对话中。

通过自然语言描述需求，即可驱动 ComfyUI 完成从文生图到视频组装的完整创作管线，无需手动拖拽节点。

## 功能特性

本插件提供 **9 个专业 Skill**，覆盖 AI 创作全流程：

| Skill | 说明 |
|-------|------|
| **环境配置** (setup) | 首次配置引导 — 检测 ComfyUI、安装 Comfy Pilot、生成 MCP 配置 |
| **图像生成** (image-gen) | 文生图/图生图，支持 FLUX、SDXL、SD 1.5 等主流模型 |
| **视频生成** (video-gen) | 图生视频/文生视频，支持 Wan 2.1/2.2、AnimateDiff、FramePack |
| **提示词工程** (prompt-engineer) | 智能提示词构建、翻译、优化、风格迁移 |
| **语音唇形同步** (voice-lipsync) | TTS 语音合成 + 唇形同步视频生成 |
| **LoRA 训练** (lora-training) | 角色/风格 LoRA 一键训练，自动数据集处理 |
| **工作流调试** (troubleshooter) | 工作流错误诊断、节点兼容性检测、显存优化建议 |
| **模型管理** (model-manager) | 模型搜索、下载、分类管理，支持 HuggingFace / CivitAI |
| **视频组装** (video-assembly) | 多片段拼接、转场、配音、字幕合成 |

## 斜杠命令

| 命令 | 说明 |
|------|------|
| `/studio-setup` | 首次配置 — 检测 ComfyUI 路径、安装 Comfy Pilot、扫描硬件环境 |
| `/studio-scan` | 扫描环境 — 更新模型/节点/硬件清单 (inventory.json) |
| `/studio-gen` | 图像生成 — 根据描述构建并执行文生图/图生图工作流 |
| `/studio-video` | 视频生成 — 根据描述构建并执行视频生成工作流 |
| `/studio-voice` | 语音合成 — TTS 生成 + 可选唇形同步 |
| `/studio-debug` | 工作流调试 — 诊断当前工作流的错误并修复 |

## 自主 Agent

| Agent | 说明 |
|-------|------|
| **comfy-scanner** | 环境扫描器 — 自动检测 GPU、模型、自定义节点，生成 inventory.json |
| **comfy-debugger** | 工作流调试器 — 分析执行错误日志，定位问题节点并提供修复方案 |

## 硬件自适应

插件根据 GPU 显存自动适配推荐方案，分为三档：

| 档位 | 显存 | 推荐方案 |
|------|------|----------|
| **low_vram** | ≤12GB | GGUF 量化模型、FramePack、AnimateDiff、tiled VAE |
| **mid_vram** | 12-20GB | FLUX FP16、Wan 2.1 量化版 |
| **high_vram** | ≥24GB | 全功能 — Wan 2.2 14B、FLUX 原生 |

硬件信息在 `/studio-scan` 时自动检测，存储在 `.comfyui-studio/inventory.json` 的 `recommended_tier` 字段中。

## 安装方法

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/comfyui-studio.git D:/comfyui-studio
```

### 2. 首次配置

在 Claude Code 中运行：

```
/studio-setup
```

该命令将自动完成：
- 检测本机 ComfyUI 安装路径
- 检查并引导安装 Comfy Pilot MCP
- 扫描 GPU 硬件和已安装模型
- 生成环境配置文件

## 前置依赖

| 依赖 | 说明 |
|------|------|
| **ComfyUI** | 需要已安装并可运行的 ComfyUI 实例（原版或秋叶整合包均可） |
| **Comfy Pilot** | ComfyUI 自定义节点，提供 MCP 通信接口。在 `/studio-setup` 中自动引导安装 |
| **Claude Code** | Anthropic 官方 CLI 工具 |

## 目录结构

```
comfyui-studio/
├── CLAUDE.md                  # 全局规则（Claude Code 自动读取）
├── README.md                  # 项目说明
├── .comfyui-studio/           # 运行时数据（自动生成）
│   └── inventory.json         # 环境清单（模型/节点/硬件）
├── skills/                    # Skill 定义
│   ├── setup/                 # 首次配置
│   ├── image-gen/             # 图像生成
│   ├── video-gen/             # 视频生成
│   ├── prompt-engineer/       # 提示词工程
│   ├── voice-lipsync/         # 语音唇形同步
│   ├── lora-training/         # LoRA 训练
│   ├── troubleshooter/        # 工作流调试
│   ├── model-manager/         # 模型管理
│   └── video-assembly/        # 视频组装
├── agents/                    # 自主 Agent 定义
│   ├── comfy-scanner.md       # 环境扫描器
│   └── comfy-debugger.md      # 工作流调试器
├── commands/                  # 斜杠命令定义
└── hooks/                     # 生命周期钩子
```

## 许可证

[MIT](LICENSE)
