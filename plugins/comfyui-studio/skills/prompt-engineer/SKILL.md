---
name: prompt-engineer
description: 提示词优化 — 按模型类型定制 prompt。当用户需要优化提示词、编写角色描述、或需要国漫风格关键词时触发。
---

# 提示词工程师

## 模型特定 Prompt 格式规则

### FLUX（T5 编码器）

FLUX 使用 T5 文本编码器，支持自然语言长描述，与传统标签式 prompt 有本质区别。

**格式要求：**
- 使用完整的自然语言句子，而非逗号分隔的标签
- 支持长文本输入（远超传统 77 token 限制）
- 描述越详细、越具体，生成效果越好
- 句子结构：主语 + 动作 + 场景 + 细节描写

**示例：**
```
A young woman with long black hair wearing a flowing white hanfu dress stands on the edge of a misty mountain cliff. She holds a jade flute in her right hand, looking toward the distant valley below. The morning sunlight breaks through the clouds, casting golden rays across the scene. The style is reminiscent of traditional Chinese ink wash painting with modern digital rendering, highly detailed, cinematic lighting.
```

**注意事项：**
- 避免使用 SDXL 风格的权重语法 `(keyword:1.2)`，T5 编码器不支持
- 不需要质量标签堆叠（如 masterpiece, best quality），FLUX 对这些不敏感
- 直接描述你想要的画面内容即可

### SDXL

SDXL 使用 CLIP 双编码器，适合标签式关键词。

**格式要求：**
- 逗号分隔的关键词/短语
- 关键词权重语法：`(keyword:1.2)` 表示增强，`(keyword:0.8)` 表示减弱
- 权重范围建议 0.5 - 1.5，超出容易产生伪影
- 重要关键词放前面，权重越高优先级越高

**示例：**
```
1girl, long black hair, white hanfu, standing on cliff, misty mountains, (jade flute:1.2), morning sunlight, golden rays, (ink wash painting style:1.3), highly detailed, cinematic lighting, masterpiece, best quality
```

**质量标签推荐（SDXL 有效）：**
- 正面：`masterpiece, best quality, highly detailed, sharp focus, professional`
- 负面：`worst quality, low quality, blurry, deformed, ugly, bad anatomy`

### Wan 视频模型

Wan 视频模型对 prompt 结构有特殊要求，运动描述优先。

**格式要求：**
- 运动/动作描述放在 prompt 最前面
- 场景和外观描述放在后面
- 使用 `camera` 关键词控制镜头运动
- 保持描述简洁，避免过于复杂的场景

**镜头运动关键词：**
- `camera pans left/right` — 水平平移
- `camera tilts up/down` — 垂直倾斜
- `camera zooms in/out` — 推拉镜头
- `camera orbits around` — 环绕运动
- `camera follows the subject` — 跟随镜头
- `static camera, no camera movement` — 固定镜头

**示例：**
```
A woman slowly raises a jade flute to her lips and begins to play, her hair and dress flowing gently in the wind. Camera slowly zooms in on her face. She stands on a misty mountain cliff at sunrise, wearing a white flowing hanfu dress with long black hair.
```

---

## 通用提示词结构模板

无论使用哪个模型，prompt 的信息组织都遵循以下优先级顺序：

```
1. 主体（Subject）     — 人物/物体的核心描述
2. 动作/姿态（Action）  — 正在做什么、什么姿势
3. 环境/场景（Setting） — 在哪里、周围有什么
4. 光照（Lighting）     — 什么光线条件
5. 风格（Style）        — 艺术风格/渲染风格
6. 质量标签（Quality）  — 画质相关描述（仅 SDXL 需要）
```

**SDXL 模板：**
```
[主体描述], [动作/姿态], [环境/场景], [光照], [风格], masterpiece, best quality, highly detailed
```

**FLUX 模板：**
```
[用完整句子描述主体正在做什么]. [描述环境和场景]. [描述光照条件]. [描述艺术风格]. [补充细节].
```

---

## 负面提示词模板

### 通用负面提示词
```
worst quality, low quality, blurry, jpeg artifacts, watermark, text, logo, signature, cropped, out of frame, duplicate, error, ugly, deformed, disfigured, mutation, extra limbs
```

### 人物专用负面提示词
```
worst quality, low quality, blurry, bad anatomy, bad hands, extra fingers, missing fingers, fused fingers, too many fingers, extra arms, extra legs, malformed limbs, long neck, cross-eyed, deformed face, ugly face, bad proportions, cloned face, disfigured, gross proportions, mutation, mutated
```

### 动漫/国漫专用负面提示词
```
worst quality, low quality, blurry, bad anatomy, extra fingers, missing fingers, bad hands, distorted face, asymmetric eyes, broken lineart, color bleeding, oversaturated, messy colors, deformed body, extra limbs, poorly drawn face, poorly drawn hands, watermark, text, signature
```

> **注意：** FLUX 模型通常不需要负面提示词，或只需极简负面提示词。负面提示词主要对 SDXL/SD1.5 有效。

---

## 角色一致性描述模板

保持角色在多张图/多个场景中外观一致，需要固定以下三组描述：

### 外貌特征（固定不变）
```
[性别], [年龄段], [发型+发色], [瞳色], [脸型特征], [肤色], [身高体型]
```
示例：`young woman, early 20s, long straight black hair reaching waist, deep brown eyes, oval face with delicate features, fair skin, slender build`

### 服装描述（按场景切换，但同场景保持一致）
```
[服装类型], [颜色], [材质], [花纹/装饰], [配饰]
```
示例：`white flowing hanfu with wide sleeves, silk fabric, subtle cloud embroidery in silver thread, jade pendant necklace, red hair ribbon`

### 气质/氛围（固定不变）
```
[整体气质], [表情倾向], [姿态特点]
```
示例：`elegant and ethereal aura, calm serene expression, graceful posture`

### 使用方法

将三组描述组合为角色标识卡，每次生成时将角色标识卡作为 prompt 的固定前缀：

```
[外貌特征], [当前场景服装], [气质], [当前动作/场景...]
```

使用 LoRA 可以进一步强化角色一致性（参见 lora-training skill）。

---

## 视频运动提示词

### 镜头运动

| 运动类型 | 英文关键词 | 效果描述 |
|---------|-----------|---------|
| 水平平移 | `camera pans left/right` | 镜头水平移动 |
| 垂直倾斜 | `camera tilts up/down` | 镜头上下倾斜 |
| 推镜头 | `camera zooms in` / `camera pushes in` | 镜头靠近主体 |
| 拉镜头 | `camera zooms out` / `camera pulls back` | 镜头远离主体 |
| 环绕 | `camera orbits around the subject` | 绕主体旋转 |
| 跟随 | `camera follows the subject` | 镜头跟随运动 |
| 固定 | `static camera` / `locked off shot` | 镜头不动 |
| 手持 | `handheld camera` / `slight camera shake` | 手持感晃动 |
| 航拍 | `aerial shot` / `drone shot` / `bird's eye view` | 高空俯瞰 |

### 角色动作

| 动作类型 | 描述示例 |
|---------|---------|
| 行走 | `walking slowly forward`, `strolling through the garden` |
| 转身 | `turning around to face the camera`, `looking back over shoulder` |
| 战斗 | `swinging a sword in a wide arc`, `throwing a punch` |
| 飘动 | `hair and clothes flowing in the wind`, `ribbons fluttering` |
| 施法 | `raising hands as glowing energy gathers`, `casting a spell with both hands` |
| 饮茶 | `raising a tea cup to lips`, `gently sipping tea` |
| 弹奏 | `fingers plucking guqin strings`, `playing a bamboo flute` |

### 运动强度控制

- 弱运动：`slowly`, `gently`, `subtly`, `slight`
- 中运动：`steadily`, `smoothly`, `gradually`
- 强运动：`quickly`, `rapidly`, `dramatically`, `dynamically`

---

## 提示词调优流程

### 第一轮：基础生成
1. 按模板写出初始 prompt
2. 使用固定 seed 生成 4 张测试图
3. 评估主体准确度、场景匹配度、整体质量

### 第二轮：关键词调整
- 主体不准确 → 加强主体描述的具体性，增加权重
- 场景不对 → 检查场景关键词是否与主体关键词冲突
- 风格不对 → 调整风格关键词的位置和权重
- 质量不够 → 添加质量标签（SDXL）或更详细的描述（FLUX）

### 第三轮：精细调优
- 使用相同 seed 对比调整前后效果
- 微调权重值（每次 ±0.1）
- 尝试添加/删除单个关键词观察影响
- 记录有效的关键词组合

### 常见问题排查
- **多个主体混淆** → 使用 BREAK 分隔（SDXL），或用明确的空间关系描述（FLUX）
- **颜色溢出** → 将颜色与对象紧密绑定，如 `red dress` 而非 `red, dress`
- **忽略某些元素** → 将被忽略的元素移到 prompt 前部，增加权重
- **画面过于杂乱** → 减少关键词数量，保留核心描述
