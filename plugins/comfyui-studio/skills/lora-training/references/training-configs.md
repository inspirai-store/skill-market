# LoRA 训练配置文件模板

## AI-Toolkit — FLUX LoRA 配置

### 角色 LoRA（8GB 显存优化版）

```yaml
job: extension
config:
  name: "flux_character_lora"
  process:
    - type: "sd_trainer"
      # 训练参数
      training_folder: "output/flux_character"
      device: "cuda:0"
      # 底模设置
      model:
        name_or_path: "black-forest-labs/FLUX.1-dev"  # 或本地路径
        is_flux: true
        quantize: true  # FP8 量化，8GB 必须开启
      # 数据集设置
      datasets:
        - folder_path: "datasets/my_character"
          caption_ext: ".txt"
          caption_dropout_rate: 0.05  # 5%概率丢弃标注，提升泛化
          resolution: 1024
          batch_size: 1
      # 训练配置
      train:
        batch_size: 1
        steps: 2000  # 角色 LoRA 建议 1000-3000
        gradient_accumulation_steps: 4
        gradient_checkpointing: true
        lr: 1e-4  # 角色用较低学习率
        lr_scheduler: "cosine"
        optimizer: "adamw8bit"
        max_grad_norm: 1.0
        dtype: "bf16"  # 或 fp16
        # LoRA 参数
        lora:
          rank: 8  # 角色用 8
          alpha: 8
          linear: true
          linear_alpha: 8
      # 采样设置（训练中生成测试图）
      sample:
        sample_every: 200  # 每200步生成一次
        width: 1024
        height: 1024
        prompts:
          - "shs_character, portrait photo, looking at camera, neutral background"
          - "shs_character, standing in a garden, full body, sunny day"
          - "shs_character, sitting at a desk, reading a book, indoor lighting"
        seed: 42
        guidance_scale: 3.5
        sample_steps: 20
      # 保存设置
      save:
        save_every: 200
        max_step_saves_to_keep: 5
```

### 风格 LoRA（8GB 显存优化版）

```yaml
job: extension
config:
  name: "flux_style_lora"
  process:
    - type: "sd_trainer"
      training_folder: "output/flux_style"
      device: "cuda:0"
      model:
        name_or_path: "black-forest-labs/FLUX.1-dev"
        is_flux: true
        quantize: true
      datasets:
        - folder_path: "datasets/my_style"
          caption_ext: ".txt"
          caption_dropout_rate: 0.05
          resolution: 1024
          batch_size: 1
      train:
        batch_size: 1
        steps: 4000  # 风格 LoRA 需要更多步
        gradient_accumulation_steps: 4
        gradient_checkpointing: true
        lr: 5e-4  # 风格用较高学习率
        lr_scheduler: "cosine"
        optimizer: "adamw8bit"
        max_grad_norm: 1.0
        dtype: "bf16"
        lora:
          rank: 16  # 风格用 16
          alpha: 16
          linear: true
          linear_alpha: 16
      sample:
        sample_every: 500
        width: 1024
        height: 1024
        prompts:
          - "a portrait of a woman in the style of shs_style"
          - "a landscape with mountains and river in the style of shs_style"
          - "a cat sitting on a windowsill in the style of shs_style"
        seed: 42
        guidance_scale: 3.5
        sample_steps: 20
      save:
        save_every: 500
        max_step_saves_to_keep: 5
```

---

## Kohya_ss — SDXL LoRA 参数列表

### 角色 LoRA 完整参数

```bash
# Kohya_ss sd-scripts 命令行参数

accelerate launch --num_cpu_threads_per_process=2 sdxl_train_network.py \
  # === 底模设置 ===
  --pretrained_model_name_or_path="models/sd_xl_base_1.0.safetensors" \

  # === 数据集设置 ===
  --train_data_dir="datasets/my_character" \
  --resolution="1024,1024" \
  --enable_bucket \
  --min_bucket_reso=768 \
  --max_bucket_reso=1280 \
  --bucket_reso_steps=64 \

  # === 训练参数 ===
  --max_train_steps=2000 \
  --learning_rate=1e-4 \
  --lr_scheduler="cosine" \
  --lr_warmup_steps=100 \
  --train_batch_size=1 \
  --gradient_checkpointing \
  --gradient_accumulation_steps=1 \
  --mixed_precision="bf16" \
  --optimizer_type="AdamW8bit" \
  --max_grad_norm=1.0 \
  --seed=42 \

  # === LoRA 参数 ===
  --network_module=networks.lora \
  --network_dim=8 \
  --network_alpha=8 \
  --network_train_unet_only \

  # === 显存优化（8GB 必须） ===
  --cache_latents \
  --cache_latents_to_disk \
  --cache_text_encoder_outputs \
  --cache_text_encoder_outputs_to_disk \

  # === 保存设置 ===
  --output_dir="output/sdxl_character" \
  --output_name="my_character" \
  --save_model_as="safetensors" \
  --save_every_n_steps=200 \
  --save_precision="fp16" \

  # === 采样设置 ===
  --sample_every_n_steps=200 \
  --sample_prompts="sample_prompts.txt" \
  --sample_sampler="euler_a" \

  # === 其他 ===
  --caption_extension=".txt" \
  --shuffle_caption \
  --keep_tokens=1 \
  --max_token_length=225 \
  --xformers
```

### 风格 LoRA 参数差异

以下参数与角色 LoRA 不同，其余相同：

```bash
  --max_train_steps=4000 \          # 风格需要更多步
  --learning_rate=5e-4 \            # 风格用更高学习率
  --network_dim=16 \                # 风格用更高 rank
  --network_alpha=16 \              # alpha 与 dim 匹配
  --save_every_n_steps=500 \        # 保存间隔调大
  --sample_every_n_steps=500 \      # 采样间隔调大
  # 去掉 --network_train_unet_only  # 风格训练建议同时训练 text encoder
```

### SD 1.5 LoRA 参数差异

以下参数与 SDXL 角色 LoRA 不同：

```bash
  # 替换命令
  accelerate launch train_network.py \   # 注意不是 sdxl_train_network.py

  --pretrained_model_name_or_path="models/v1-5-pruned-emaonly.safetensors" \
  --resolution="512,512" \               # SD1.5 用 512
  --min_bucket_reso=384 \
  --max_bucket_reso=768 \
  --max_token_length=150 \               # SD1.5 token 限制不同
  # 去掉 --cache_text_encoder_outputs 相关参数（SD1.5 不支持）
```

---

## 采样提示词文件模板

### sample_prompts.txt（角色 LoRA）

```
# 简单测试
shs_character, portrait, looking at camera, plain background --n worst quality, low quality --w 1024 --h 1024 --s 20 --d 42

# 场景测试
shs_character, standing in a flower garden, full body, natural lighting, spring --n worst quality, low quality, bad anatomy --w 1024 --h 1024 --s 20 --d 42

# 挑战测试（非训练集角度/场景）
shs_character, sitting at a cafe table, holding a coffee cup, city background, warm afternoon light --n worst quality, low quality, bad anatomy --w 1024 --h 1024 --s 20 --d 42
```

### sample_prompts.txt（风格 LoRA）

```
# 人物测试
a young woman reading a book under a tree, in the style of shs_style --n worst quality, low quality --w 1024 --h 1024 --s 20 --d 42

# 风景测试
a mountain landscape with a river flowing through valley, in the style of shs_style --n worst quality, low quality --w 1024 --h 1024 --s 20 --d 42

# 物品测试
a vintage clock on a wooden shelf, in the style of shs_style --n worst quality, low quality --w 1024 --h 1024 --s 20 --d 42
```

---

## 数据集目录结构

### 角色 LoRA 目录结构

```
datasets/my_character/
├── 10_shs_character/           # 重复次数_触发词
│   ├── image_001.png           # 正面照
│   ├── image_001.txt           # "shs_character, 1girl, long black hair, brown eyes, smiling, white shirt"
│   ├── image_002.png           # 侧面照
│   ├── image_002.txt           # "shs_character, 1girl, long black hair, side view, serious expression, blue dress"
│   ├── ...
│   └── image_025.png
│       image_025.txt
```

### 风格 LoRA 目录结构

```
datasets/my_style/
├── 5_shs_style/                # 重复次数_触发词（风格图片更多，重复次数可以少）
│   ├── style_001.png
│   ├── style_001.txt           # "a woman walking in rain, urban street, in the style of shs_style"
│   ├── style_002.png
│   ├── style_002.txt           # "mountain landscape at sunset, in the style of shs_style"
│   ├── ...
│   └── style_040.png
│       style_040.txt
```

### 目录名格式说明

目录名格式为 `[重复次数]_[触发词]`：
- **重复次数：** 每个 epoch 中该目录图片重复使用的次数
  - 角色（15-30张）：重复 8-15 次
  - 风格（30-50张）：重复 3-8 次
  - 目标是每个 epoch 约 200-300 步
- **触发词：** 自定义触发词，训练后在 prompt 中使用此词激活 LoRA
