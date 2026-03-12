---
name: setup
description: 首次配置 ComfyUI Studio — 检测 ComfyUI 路径、安装 Comfy Pilot、扫描硬件环境。当用户首次使用插件、环境有问题、或请求配置时触发。
---

# ComfyUI Studio 首次配置

按以下步骤完成 ComfyUI Studio 的环境初始化。每个步骤完成后向用户报告结果，遇到问题时给出明确的解决指引。

---

## 步骤 1：检测 ComfyUI 路径

按优先级依次探测以下常见安装路径：

1. `D:/ComfyUI-aki-v3/ComfyUI`（秋叶整合包）
2. `D:/ComfyUI/`
3. `C:/ComfyUI/`
4. `~/ComfyUI/`

**验证方式：** 检查候选路径下是否存在 `main.py` 或 `comfy/cli_args.py`，任一存在即视为有效 ComfyUI 安装。

**如果全部未找到：** 提示用户手动输入 ComfyUI 安装路径，例如：

> 未在常见位置找到 ComfyUI。请告诉我你的 ComfyUI 安装路径，例如：`E:/my-comfyui/ComfyUI`

将确认后的路径记录为 `COMFYUI_PATH`，后续步骤均基于此路径。

---

## 步骤 2：检测 Comfy Pilot

检查 `{COMFYUI_PATH}/custom_nodes/comfy-pilot/` 目录是否存在。

**如果已安装：** 报告版本信息（如有），继续下一步。

**如果未安装：** 向用户提供以下三种安装方式，让用户选择：

```
方法 1（推荐）: cd {COMFYUI_PATH}/custom_nodes && git clone https://github.com/ConstantineB6/comfy-pilot.git
方法 2（Manager）: 在 ComfyUI Manager 中搜索 "comfy-pilot" 安装
方法 3（comfy-cli）: pip install comfy-cli && comfy node install comfy-pilot（需先安装 comfy-cli）
```

安装完成后提醒用户：**需要重启 ComfyUI 才能生效。**

等待用户确认安装完成后再继续。

---

## 步骤 3：生成 .mcp.json

根据检测到的 `COMFYUI_PATH`，在插件根目录下生成 `.mcp.json` 文件，内容如下：

```json
{
  "mcpServers": {
    "comfy-pilot": {
      "command": "python",
      "args": ["{COMFYUI_PATH}/custom_nodes/comfy-pilot/mcp_server.py"],
      "env": {
        "COMFYUI_HOST": "127.0.0.1",
        "COMFYUI_PORT": "8188"
      }
    }
  }
}
```

将 `{COMFYUI_PATH}` 替换为步骤 1 检测到的实际路径（如 `D:/ComfyUI-aki-v3/ComfyUI`）。

如果文件已存在，询问用户是否覆盖。

---

## 步骤 4：检测 ComfyUI 运行状态

尝试连接 `http://127.0.0.1:8188`，判断 ComfyUI 是否正在运行。

**如果已运行：** 报告连接成功，继续下一步。

**如果未运行：** 提示用户启动 ComfyUI：

> ComfyUI 当前未运行。请先启动 ComfyUI，启动方式取决于你的安装类型：
>
> - **秋叶整合包：** 双击运行 `启动器.exe` 或 `run_nvidia_gpu.bat`
> - **原版安装：** 在 ComfyUI 目录下运行 `python main.py`
> - **comfy CLI：** 运行 `comfy launch`
>
> 启动后告诉我，我将继续配置。

等待用户确认 ComfyUI 已启动后再继续。

---

## 步骤 5：触发环境扫描

调用 **comfy-scanner** agent 执行完整的环境扫描，生成 `.comfyui-studio/inventory.json`。

扫描内容包括：
- GPU 型号和显存大小
- 已安装的 checkpoint / LoRA / VAE / ControlNet 等模型
- 已安装的自定义节点列表
- 根据显存大小计算 `recommended_tier`（low_vram / mid_vram / high_vram）

如果 `.comfyui-studio/` 目录不存在，先创建该目录。

---

## 步骤 6：检测 API Token

检查以下 API Token 是否已配置：

**HuggingFace Token (HF_TOKEN)：**
- 检查环境变量 `HF_TOKEN`
- 检查 `{COMFYUI_PATH}/.env` 文件中是否包含 `HF_TOKEN=`
- 检查 `D:/ComfyUI-aki-v3/.env` 文件（秋叶整合包）

**CivitAI Token (CIVITAI_TOKEN)：**
- 检查环境变量 `CIVITAI_TOKEN`
- 检查上述 `.env` 文件中是否包含 `CIVITAI_TOKEN=`

**如果缺失：** 说明获取方式：

> **HuggingFace Token：**
> 1. 访问 https://huggingface.co/settings/tokens
> 2. 创建一个 Read 权限的 Access Token
> 3. 设置环境变量 `HF_TOKEN=hf_xxx` 或写入 `.env` 文件
>
> **CivitAI Token：**
> 1. 访问 https://civitai.com/user/account（需登录）
> 2. 在 API Keys 部分创建一个 Key
> 3. 设置环境变量 `CIVITAI_TOKEN=xxx` 或写入 `.env` 文件
>
> Token 非必需，但下载 HuggingFace 受限模型或 CivitAI 模型时需要。可以稍后再配置。

---

## 步骤 7：输出环境报告

汇总以上所有检测结果，以表格形式输出最终的环境报告：

```
========================================
  ComfyUI Studio 环境配置报告
========================================

ComfyUI 路径：     {COMFYUI_PATH}
Comfy Pilot：      已安装 / 未安装
ComfyUI 状态：     运行中 (http://127.0.0.1:8188)
GPU：              {GPU 型号}
显存：             {显存大小} GB
推荐档位：         {recommended_tier}

已安装模型：       {数量} 个
  - Checkpoint:    {数量}
  - LoRA:          {数量}
  - VAE:           {数量}
  - ControlNet:    {数量}

已安装自定义节点： {数量} 个
HF Token：         已配置 / 未配置
CivitAI Token：    已配置 / 未配置

推荐可用工作流类型：
  ✓ 文生图 (FLUX / SDXL / SD1.5)
  ✓ 图生视频 (Wan 2.1 / AnimateDiff)
  ✗ 语音合成 (缺少 xxx 节点)
  ...

========================================
  配置完成！使用 /studio-gen 开始创作。
========================================
```

根据 `recommended_tier` 和已安装的模型/节点，动态判断哪些工作流类型当前可用。
