---
name: troubleshooter
description: ComfyUI 工作流调试 — 错误诊断、OOM 处理、节点冲突排查。当工作流执行失败、出现错误、或用户请求调试帮助时触发。
---

# ComfyUI 工作流调试

## 四类错误诊断流程

### 1. 连接错误

**症状：** 无法访问 ComfyUI 界面、API 调用失败、浏览器显示"连接被拒绝"

**诊断步骤：**

1. **检查 ComfyUI 是否启动**
   - 查看终端/命令行窗口是否有 ComfyUI 运行日志
   - 检查进程：`tasklist | findstr python`（Windows）
   - 如果未启动 → 启动 ComfyUI

2. **检查端口是否正确**
   - 默认端口：`8188`
   - 访问地址：`http://127.0.0.1:8188`
   - 如果端口被占用，ComfyUI 会自动使用下一个可用端口，检查启动日志中的实际端口
   - 修复：使用 `--port 指定端口` 参数启动

3. **检查防火墙/安全软件**
   - Windows 防火墙可能阻止 Python 网络访问
   - 杀毒软件可能拦截本地服务
   - 修复：添加 Python 到防火墙白名单

4. **检查监听地址**
   - 默认监听 `127.0.0.1`（仅本机）
   - 如需局域网访问：使用 `--listen 0.0.0.0` 参数
   - 如果从其他设备访问：确认 IP 地址正确

**修复命令示例：**
```bash
# 指定端口启动
python main.py --port 8188

# 允许局域网访问
python main.py --listen 0.0.0.0

# 秋叶整合包
启动器中修改端口设置
```

### 2. 节点错误

**症状：** 节点显示红色、"Node not found"、输入/输出类型不匹配、节点缺失

**诊断步骤：**

1. **节点缺失（Node not found）**
   - 原因：自定义节点未安装或安装失败
   - 检查：打开 ComfyUI Manager → 查看是否有缺失节点提示
   - 修复：通过 ComfyUI Manager 安装缺失节点，或手动 git clone 到 `custom_nodes/` 目录

2. **节点版本不兼容**
   - 原因：工作流使用的节点版本与安装版本不一致
   - 检查：查看节点报错信息中的函数名/参数名
   - 修复：更新节点到最新版本（ComfyUI Manager → Update All），或回退到工作流兼容版本

3. **输入类型不匹配**
   - 原因：节点 A 输出类型与节点 B 输入类型不兼容
   - 常见案例：
     - IMAGE 连到 LATENT 输入（需要 VAE Encode 中间节点）
     - CONDITIONING 连到 STRING 输入
     - 不同尺寸的 tensor 连接
   - 修复：检查连线两端的类型，添加转换节点

4. **节点内部错误**
   - 检查 ComfyUI 终端日志中的完整错误堆栈
   - 常见原因：依赖包缺失、Python 版本不兼容
   - 修复：在节点目录下运行 `pip install -r requirements.txt`

**快速修复流程：**
```
节点报错
├── 红色节点 "Node not found"
│   └── ComfyUI Manager → Install Missing Nodes
├── 连线报错
│   └── 检查输出/输入类型是否匹配 → 添加转换节点
├── 执行时报错
│   └── 查看终端日志 → 定位具体错误
└── 节点 UI 异常
    └── 刷新浏览器（Ctrl+Shift+R）或重启 ComfyUI
```

### 3. OOM 崩溃（显存不足）

**症状：** `CUDA out of memory`、进程被杀死、ComfyUI 无响应后崩溃

**诊断步骤：**

1. **确认是 OOM**
   - 终端日志出现 `RuntimeError: CUDA out of memory`
   - 或系统提示 Python 进程异常终止

2. **检查当前显存占用**
   - 命令：`nvidia-smi`
   - 查看 GPU 显存使用量
   - 是否有其他进程占用显存（关闭不需要的程序）

3. **分析显存需求**
   - 模型大小：FLUX（~12GB）、SDXL（~6GB）、SD1.5（~4GB）
   - 分辨率影响：1024x1024 比 512x512 多约 4 倍显存
   - 批次大小：每增加 1 倍 batch，显存翻倍
   - 视频帧数：帧数越多，显存需求越大

4. **应用 VRAM 降级策略**（见下方详细表格）

### 4. 输出质量差

**症状：** 生成图片模糊、颜色异常、构图错误、与 prompt 不符

**诊断步骤：**

1. **检查采样参数**
   - 采样步数过低（< 15 步）→ 增加到 20-30 步
   - CFG/Guidance Scale 不当 → SDXL 用 5-8，FLUX 用 2.5-4.5
   - 采样器选择 → 推荐 euler_a（快速）或 dpmpp_2m_sde（质量）

2. **检查模型适配性**
   - 使用的 checkpoint 与 LoRA 是否匹配（SD1.5 LoRA 不能用于 SDXL）
   - VAE 是否匹配（SDXL 需要 SDXL VAE）
   - CLIP 模型是否正确加载

3. **检查分辨率**
   - SD1.5：512x512 或 512x768
   - SDXL：1024x1024 或 1024x768
   - FLUX：1024x1024
   - 使用非原生分辨率会导致质量下降或构图异常

4. **检查 prompt 质量**
   - 参考 prompt-engineer skill 优化提示词
   - 确认正面/负面提示词设置正确
   - 关键词权重是否合理

---

## VRAM 降级策略表

当显存不足时，按以下顺序逐步降级，每步都尝试运行，直到不再 OOM：

| 优先级 | 策略 | 操作方法 | 显存节省 | 质量影响 |
|--------|------|---------|---------|---------|
| 第一步 | 启用 `--lowvram` 参数 | 启动 ComfyUI 时添加 `--lowvram` | 节省 2-4GB | 速度变慢，质量无影响 |
| 第二步 | 切换 FP8 推理 | 加载模型时选择 FP8 精度，或使用 GGUF 量化版模型 | 节省 30-50% | 极轻微质量下降 |
| 第三步 | 启用 tiled VAE decode | 使用 "VAE Decode (Tiled)" 节点替代普通 "VAE Decode" | 节省 1-3GB | 可能有轻微接缝（通常不可见） |
| 第四步 | 降低分辨率 | 生成分辨率降低一档（如 1024→768→512） | 节省 30-75% | 图片更小，可后期放大 |
| 第五步 | 减少批次大小/帧数 | batch size 设为 1，视频帧数减半 | 节省 50%+ | 无质量影响，但需多次运行 |
| 第六步 | 换用更小的模型 | 使用 GGUF 量化模型（Q4/Q5/Q8） | 节省 40-70% | 量化级别越低质量越差 |

### 各模型显存估算

| 模型 | FP16 显存 | FP8 显存 | GGUF Q8 | GGUF Q5 | GGUF Q4 |
|------|----------|----------|---------|---------|---------|
| FLUX.1-dev | ~24GB | ~12GB | ~12GB | ~8GB | ~6GB |
| SDXL | ~7GB | ~4GB | — | — | — |
| SD 1.5 | ~4GB | ~2.5GB | — | — | — |
| Wan 2.1 (14B) | ~28GB | ~14GB | ~14GB | ~10GB | ~8GB |

> 以上为模型本身显存占用，实际推理还需额外 2-6GB 用于中间计算。

### --lowvram 与 --highvram 说明

| 参数 | 效果 | 适用场景 |
|------|------|---------|
| `--highvram` | 所有模型常驻显存，切换最快 | 24GB+ 显存 |
| （默认） | 智能卸载，按需加载 | 12-16GB 显存 |
| `--lowvram` | 激进卸载，尽量释放显存 | 8GB 显存 |
| `--novram` | 极端模式，全部走 CPU | 4GB 以下/紧急情况 |
| `--cpu` | 完全不使用 GPU | 无独立显卡 |

---

## ComfyUI 日志路径和关键字段解读

### 日志位置

- **终端输出：** ComfyUI 主要日志直接输出到启动终端
- **秋叶整合包：** 查看启动器窗口或日志文件
- **系统日志：** Windows 事件查看器（严重崩溃时）

### 关键日志字段

| 日志内容 | 含义 | 处理建议 |
|---------|------|---------|
| `Loading model from: xxx` | 正在加载模型 | 确认路径正确 |
| `Model loaded in xxxs` | 模型加载完成 | 时间过长可能是磁盘慢 |
| `CUDA out of memory` | 显存不足 | 应用 VRAM 降级策略 |
| `!!! Exception during processing !!!` | 节点执行异常 | 查看下方详细堆栈 |
| `Prompt outputs failed validation` | 工作流验证失败 | 检查节点连接完整性 |
| `Cannot import xxx` | 依赖缺失 | 安装对应 Python 包 |
| `Node class not found: xxx` | 节点类未注册 | 安装/重新安装对应自定义节点 |
| `Expected xxx but got yyy` | 类型不匹配 | 检查节点输入输出连线 |
| `Using pytorch cross attention` | 注意力机制 | 正常信息 |
| `xformers enabled` | xformers 已启用 | 正常信息，有助于节省显存 |
| `Total VRAM xxxMB` | GPU 显存总量 | 参考显存规划 |
| `pytorch version: x.x.x` | PyTorch 版本 | 确认版本兼容性 |

### 错误堆栈阅读方法

当出现错误时，终端会打印 Python 堆栈跟踪（Traceback）：

1. **从最后一行开始看** — 最后一行是实际错误类型和信息
2. **向上找第一个自定义节点路径** — 定位是哪个节点出错
3. **关注 `File "custom_nodes/xxx/..."` 行** — 这是自定义节点代码位置
4. **搜索错误信息** — 在节点的 GitHub Issues 中搜索

### 常用调试命令

```bash
# 查看 GPU 状态
nvidia-smi

# 查看 CUDA 版本
nvcc --version

# 查看 Python 版本
python --version

# 查看 PyTorch 和 CUDA 版本
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.version.cuda)"

# 查看已安装的自定义节点
ls custom_nodes/

# 检查特定节点的依赖
pip list | grep 某个包名
```
