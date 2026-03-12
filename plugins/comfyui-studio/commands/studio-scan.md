---
description: 重新扫描 ComfyUI 环境，更新模型和节点清单
allowed-tools: [Read, Write, Bash, Glob, Grep]
---

# /studio-scan

重新扫描 ComfyUI 环境，更新 `.comfyui-studio/inventory.json`。

## 执行流程

1. 检查 `.comfyui-studio/inventory.json` 是否已存在。

2. **如果已存在：**
   - 读取当前 inventory 作为旧版本，保存在内存中用于对比
   - 从中获取 `comfyui_path`

3. **如果不存在：**
   - 提示用户先运行 `/studio-setup` 进行首次配置
   - 或者尝试自动探测 ComfyUI 路径（按 `skills/setup/SKILL.md` 步骤 1 的逻辑）

4. 启动 **comfy-scanner** agent 执行完整环境扫描，生成新的 `inventory.json`。

5. 对比新旧 inventory，生成变更摘要：

```
========================================
  ComfyUI Studio 环境更新报告
========================================

扫描时间：{scan_time}

变更摘要：
  新增模型：
    + {模型名1}（{类型}，{大小}）
    + {模型名2}（{类型}，{大小}）

  删除模型：
    - {模型名}（{类型}）

  新增节点：
    + {节点名1}
    + {节点名2}

  删除节点：
    - {节点名}

  硬件变更：
    GPU 显存：{旧值} → {新值}（如有变化）

模型总计：{总数} 个
节点总计：{总数} 个
========================================
```

6. 如果没有任何变更，输出：

```
扫描完成，未检测到环境变更。
当前共 {模型数} 个模型，{节点数} 个自定义节点。
```
