# Top 10 ComfyUI 常见错误

## 1. RuntimeError: CUDA out of memory

### 错误信息原文
```
RuntimeError: CUDA out of memory. Tried to allocate xxx MiB (GPU 0; xx.xx GiB total capacity; xx.xx GiB already allocated; xx.xx MiB free; xx.xx GiB reserved in total by PyTorch)
```

### 原因分析
- GPU 显存不足以完成当前操作
- 常见触发场景：加载大模型、高分辨率生成、大 batch size、视频生成帧数过多
- 可能有其他程序（浏览器、游戏等）占用显存

### 修复步骤
1. 关闭其他占用显存的程序（`nvidia-smi` 查看占用情况）
2. 按 VRAM 降级策略逐步降级（参见 SKILL.md）：
   - 添加 `--lowvram` 启动参数
   - 切换 FP8 推理或 GGUF 量化模型
   - 启用 tiled VAE decode
   - 降低生成分辨率
   - 减少 batch size / 视频帧数
3. 如果仍然 OOM，考虑使用更小的模型

---

## 2. NodeNotFound: xxx

### 错误信息原文
```
!!! Exception during processing !!!
Node class not found: xxx
```
或在加载工作流时提示：
```
When loading the graph, the following node types were not found: xxx, yyy
```

### 原因分析
- 工作流使用了未安装的自定义节点
- 自定义节点安装失败（依赖缺失）
- 自定义节点更新后类名变更

### 修复步骤
1. 打开 ComfyUI Manager → "Install Missing Custom Nodes"
2. 按提示安装缺失的节点包
3. 安装后重启 ComfyUI
4. 如果 Manager 找不到对应节点，手动搜索 GitHub 并 clone 到 `custom_nodes/` 目录
5. 安装节点依赖：`cd custom_nodes/节点名 && pip install -r requirements.txt`

---

## 3. ValueError: shape mismatch

### 错误信息原文
```
ValueError: shape mismatch: value tensor of shape [x, x, x] cannot be broadcast to indexing result of shape [y, y, y]
```
或
```
RuntimeError: The size of tensor a (x) must match the size of tensor b (y) at non-singleton dimension z
```

### 原因分析
- 输入 tensor 的维度/尺寸不匹配
- 常见场景：
  - LoRA 与底模不匹配（SD1.5 LoRA 用于 SDXL）
  - ControlNet 预处理图尺寸与生成尺寸不一致
  - 两个不同分辨率的 latent 做合并操作

### 修复步骤
1. 确认 LoRA/底模/VAE 版本匹配（SD1.5 配 SD1.5，SDXL 配 SDXL）
2. 确保 ControlNet 输入图与生成分辨率一致
3. 检查所有 latent 操作节点的输入尺寸是否一致
4. 如果使用 inpaint，确认 mask 尺寸与图像尺寸匹配

---

## 4. Connection refused（ComfyUI 未启动）

### 错误信息原文
```
ConnectionRefusedError: [WinError 10061] 由于目标计算机积极拒绝，无法连接。
```
或
```
requests.exceptions.ConnectionError: HTTPConnectionPool(host='127.0.0.1', port=8188): Max retries exceeded
```

### 原因分析
- ComfyUI 服务未启动
- 端口号不正确
- ComfyUI 启动过程中崩溃
- 防火墙阻止连接

### 修复步骤
1. 确认 ComfyUI 已启动且终端显示 `To see the GUI go to: http://127.0.0.1:8188`
2. 检查终端是否有启动错误
3. 确认使用正确的端口号
4. 尝试在浏览器中直接访问 `http://127.0.0.1:8188` 测试
5. 检查防火墙设置，添加 Python 到白名单

---

## 5. Missing model file

### 错误信息原文
```
FileNotFoundError: [Errno 2] No such file or directory: 'models/checkpoints/xxx.safetensors'
```
或节点提示：
```
Model file not found: xxx
```

### 原因分析
- 模型文件未下载或路径不正确
- 模型文件名拼写错误
- 模型放在了错误的子目录下

### 修复步骤
1. 确认模型文件已下载完成（文件大小正确，未中断）
2. 检查模型放置目录：
   - Checkpoint：`models/checkpoints/`
   - LoRA：`models/loras/`
   - VAE：`models/vae/`
   - ControlNet：`models/controlnet/`
   - CLIP：`models/clip/`
   - Upscaler：`models/upscale_models/`
3. 确认工作流中选择的模型名称与实际文件名一致
4. 如果使用符号链接或 `extra_model_paths.yaml`，确认配置正确

---

## 6. Input type mismatch

### 错误信息原文
```
Failed to validate prompt for output xxx:
  - Required input is missing: xxx
  - xxx output type (IMAGE) does not match input type (LATENT)
```

### 原因分析
- 节点之间连线的输出/输入类型不匹配
- 缺少必要的中间转换节点
- 必填输入未连接

### 修复步骤
1. 检查报错节点的所有必填输入是否已连接
2. 检查连线两端的类型是否匹配：
   - IMAGE → LATENT：需要添加 "VAE Encode" 节点
   - LATENT → IMAGE：需要添加 "VAE Decode" 节点
   - STRING → CONDITIONING：需要添加 "CLIP Text Encode" 节点
3. 悬停在接口上查看期望类型
4. 删除错误连线，重新正确连接

---

## 7. Prompt outputs failed validation

### 错误信息原文
```
Prompt outputs failed validation
PromptServer: invalid prompt
```

### 原因分析
- 工作流中存在未连接的必要输入
- 工作流形成了环路（循环连接）
- 输出节点未正确配置
- 工作流中有孤立的节点链（未连接到输出）

### 修复步骤
1. 检查所有节点的必填输入（通常标为红色/橙色）是否已连接
2. 确保工作流有至少一个输出节点（Save Image / Preview Image 等）
3. 检查是否存在环路连接，删除造成环路的连线
4. 确保从输入到输出的完整路径没有断开
5. 尝试在 ComfyUI 中右键 → "Bypass" 可疑节点，逐步定位问题节点

---

## 8. CLIP model loading failed

### 错误信息原文
```
RuntimeError: Error(s) in loading state_dict for CLIPTextModel
```
或
```
Error loading CLIP model: xxx
size mismatch for xxx
```

### 原因分析
- CLIP 模型文件损坏或下载不完整
- CLIP 模型版本与底模不匹配
- FLUX 模型需要 T5 编码器但加载了 CLIP

### 修复步骤
1. 确认 CLIP 模型完整性（重新下载）
2. 确认模型匹配关系：
   - SD1.5 → clip-vit-large-patch14
   - SDXL → clip-vit-large-patch14 + clip-vit-bigG-14-laion2B（双 CLIP）
   - FLUX → clip-vit-large-patch14 + t5-v1_1-xxl（CLIP + T5）
3. 确认模型文件放在正确目录：`models/clip/`
4. FLUX 用户注意：T5 编码器文件较大（~10GB），确认完整下载

---

## 9. VAE decode failed (NaN values)

### 错误信息原文
```
RuntimeError: a]Tensor (device='cuda:0') contains NaN values
```
或生成全黑/全灰/噪点图像

### 原因分析
- VAE 模型损坏或不匹配
- 训练/推理过程中出现数值溢出
- CFG Scale 设置过高导致数值爆炸
- 混合精度推理时的精度问题

### 修复步骤
1. 降低 CFG Scale（SDXL 建议 5-8，FLUX 建议 2.5-4.5）
2. 确认 VAE 与底模匹配：
   - 使用模型自带的 VAE（不额外加载）
   - SDXL 推荐 sdxl_vae.safetensors
3. 切换为 FP32 VAE 解码（在 VAE Decode 节点中设置）
4. 使用 tiled VAE decode 可能帮助稳定数值
5. 重新下载 VAE 模型文件（可能文件损坏）
6. 检查 LoRA 权重是否设置过高（建议 0.7-1.0）

---

## 10. Custom node import error

### 错误信息原文
```
Cannot import custom_nodes/xxx
ImportError: No module named 'xxx'
```
或
```
ModuleNotFoundError: No module named 'xxx'
```

### 原因分析
- 自定义节点的 Python 依赖未安装
- Python 环境错误（使用了系统 Python 而非虚拟环境）
- 节点代码有 bug 或与当前 Python/PyTorch 版本不兼容

### 修复步骤
1. 进入节点目录安装依赖：
   ```bash
   cd custom_nodes/节点名
   pip install -r requirements.txt
   ```
2. 确认使用正确的 Python 环境：
   - 秋叶整合包：使用整合包自带的 Python
   - 虚拟环境：激活对应 venv/conda 环境
3. 检查节点 GitHub 页面的 Issues，是否有人报告相同问题
4. 尝试更新节点到最新版本：
   ```bash
   cd custom_nodes/节点名
   git pull
   pip install -r requirements.txt
   ```
5. 如果仍然失败，尝试删除并重新安装该节点
6. 确认 PyTorch 版本兼容性（部分节点需要特定 PyTorch 版本）
