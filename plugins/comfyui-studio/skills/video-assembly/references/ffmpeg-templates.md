# FFmpeg 常用命令模板

每个模板包含完整命令和参数说明，可直接复制使用。将 `{占位符}` 替换为实际值。

---

## 1. 视频拼接

### 1.1 无损拼接（编码一致时）

```bash
# 创建文件列表
cat > filelist.txt << 'EOF'
file 'clip_001.mp4'
file 'clip_002.mp4'
file 'clip_003.mp4'
EOF

# 拼接（不重新编码，速度极快）
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

**参数说明：**
- `-f concat`：使用 concat 解复用器
- `-safe 0`：允许非安全文件名（包含特殊字符）
- `-c copy`：直接复制流，不重新编码

### 1.2 重新编码拼接（编码不一致时）

```bash
ffmpeg -f concat -safe 0 -i filelist.txt -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k output.mp4
```

---

## 2. 音频混入

### 2.1 替换音轨

```bash
ffmpeg -i {视频文件} -i {音频文件} -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest {输出文件}
```

**参数说明：**
- `-map 0:v`：取第一个输入的视频流
- `-map 1:a`：取第二个输入的音频流
- `-shortest`：以最短流的时长为准

### 2.2 配音 + 背景音乐混合

```bash
ffmpeg -i {视频文件} -i {配音文件} -i {背景音乐} \
  -filter_complex "[1:a]volume=1.0[voice];[2:a]volume=0.25[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=3[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k {输出文件}
```

**参数说明：**
- `volume=0.25`：背景音乐降至 25% 音量
- `amix`：混合多个音频流
- `duration=first`：以第一个音频流的时长为准
- `dropout_transition=3`：较短音频结束时 3 秒淡出

### 2.3 音频标准化（EBU R128）

```bash
ffmpeg -i {输入文件} -filter:a "loudnorm=I=-16:TP=-1.5:LRA=11" -c:v copy -c:a aac -b:a 192k {输出文件}
```

**参数说明：**
- `I=-16`：目标响度 -16 LUFS（流媒体标准）
- `TP=-1.5`：真峰值上限 -1.5 dBTP
- `LRA=11`：响度范围上限 11 LU

---

## 3. 字幕硬编码

### 3.1 SRT 字幕（中文）

```bash
ffmpeg -i {视频文件} \
  -vf "subtitles={字幕文件.srt}:force_style='FontName=Noto Sans CJK SC,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,BackColour=&H80000000,MarginV=30'" \
  -c:v libx264 -crf 18 -preset slow -c:a copy {输出文件}
```

### 3.2 ASS 字幕

```bash
ffmpeg -i {视频文件} -vf "ass={字幕文件.ass}" -c:v libx264 -crf 18 -preset slow -c:a copy {输出文件}
```

### 3.3 在指定位置添加文字水印

```bash
ffmpeg -i {视频文件} \
  -vf "drawtext=text='{文字内容}':fontfile='{字体文件路径}':fontsize=36:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-th-30" \
  -c:v libx264 -crf 18 -c:a copy {输出文件}
```

**参数说明：**
- `x=(w-text_w)/2`：水平居中
- `y=h-th-30`：距底部 30 像素

---

## 4. 转场效果

### 4.1 单视频淡入淡出

```bash
ffmpeg -i {输入文件} \
  -vf "fade=t=in:st=0:d={淡入秒数},fade=t=out:st={淡出开始时间}:d={淡出秒数}" \
  -c:v libx264 -crf 18 -c:a copy {输出文件}
```

### 4.2 两段视频交叉溶解

```bash
ffmpeg -i {视频1} -i {视频2} \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration={过渡秒数}:offset={视频1时长减去过渡秒数}[v];[0:a][1:a]acrossfade=d={过渡秒数}[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 {输出文件}
```

### 4.3 多段视频链式转场

```bash
# 三段视频，每段之间 0.5 秒交叉溶解
# 假设 clip1 时长 5 秒，clip2 时长 4 秒
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
  -filter_complex "\
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];\
    [v01][2:v]xfade=transition=fade:duration=0.5:offset=8.5[v];\
    [0:a][1:a]acrossfade=d=0.5[a01];\
    [a01][2:a]acrossfade=d=0.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 output.mp4
```

**offset 计算：** `offset = 上一段累计时长 - 过渡时长`

---

## 5. 帧率转换

```bash
# 转换为 24fps
ffmpeg -i {输入文件} -r 24 -c:v libx264 -crf 18 -c:a copy {输出文件}

# 使用运动插值（更平滑，但速度慢）
ffmpeg -i {输入文件} -vf "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1" -c:v libx264 -crf 18 -c:a copy {输出文件}
```

---

## 6. 分辨率缩放

### 6.1 缩放并保持比例（黑边填充）

```bash
ffmpeg -i {输入文件} \
  -vf "scale={宽}:{高}:force_original_aspect_ratio=decrease,pad={宽}:{高}:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -crf 18 -c:a copy {输出文件}
```

### 6.2 缩放并裁切（填满画面）

```bash
ffmpeg -i {输入文件} \
  -vf "scale={宽}:{高}:force_original_aspect_ratio=increase,crop={宽}:{高}" \
  -c:v libx264 -crf 18 -c:a copy {输出文件}
```

### 6.3 竖屏转横屏（模糊背景填充）

```bash
ffmpeg -i {竖屏视频} \
  -filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20:20[bg];[0:v]scale=-1:1080[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -c:a copy {输出文件}
```

---

## 7. GIF 导出

### 7.1 高质量 GIF（调色板方式）

```bash
# 步骤 1：生成调色板
ffmpeg -i {输入文件} -vf "fps={帧率},scale={宽}:-1:flags=lanczos,palettegen=max_colors=256" palette.png

# 步骤 2：使用调色板生成 GIF
ffmpeg -i {输入文件} -i palette.png \
  -filter_complex "fps={帧率},scale={宽}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" \
  {输出文件.gif}
```

### 7.2 快速 GIF（质量较低）

```bash
ffmpeg -i {输入文件} -vf "fps=10,scale=320:-1" -gifflags +transdiff {输出文件.gif}
```

---

## 8. 裁剪片段

### 8.1 按时间裁剪

```bash
# 从第 10 秒开始，截取 5 秒（无损裁剪）
ffmpeg -ss 10 -i {输入文件} -t 5 -c copy {输出文件}

# 指定起止时间
ffmpeg -ss 00:01:30 -to 00:02:45 -i {输入文件} -c copy {输出文件}
```

**注意：** `-ss` 放在 `-i` 前面为快速定位（关键帧对齐），放在后面为精确定位（但较慢）。

### 8.2 按画面区域裁剪

```bash
# 裁剪画面区域：从 (x, y) 开始，宽 w 高 h
ffmpeg -i {输入文件} -vf "crop={w}:{h}:{x}:{y}" -c:v libx264 -crf 18 -c:a copy {输出文件}

# 示例：裁剪中心 1080x1080 区域（从 1920x1080 视频）
ffmpeg -i input.mp4 -vf "crop=1080:1080:420:0" -c:v libx264 -crf 18 -c:a copy output_square.mp4
```

---

## 9. 速度调节

### 9.1 视频加速/减速

```bash
# 2 倍速
ffmpeg -i {输入文件} -vf "setpts=0.5*PTS" -af "atempo=2.0" -c:v libx264 -crf 18 {输出文件}

# 0.5 倍速（慢放）
ffmpeg -i {输入文件} -vf "setpts=2.0*PTS" -af "atempo=0.5" -c:v libx264 -crf 18 {输出文件}
```

**注意：** `atempo` 范围为 0.5-100.0。超过 2.0 需要链式使用：`atempo=2.0,atempo=2.0`（= 4 倍速）

---

## 10. 图片序列转视频

```bash
# 将图片序列（frame_0001.png, frame_0002.png, ...）转为视频
ffmpeg -framerate 24 -i "frame_%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p {输出文件}

# 指定起始编号
ffmpeg -framerate 24 -start_number 0 -i "frame_%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p {输出文件}
```

---

## 11. 视频转图片序列

```bash
# 导出所有帧
ffmpeg -i {输入文件} "frames/frame_%04d.png"

# 每秒导出 1 帧
ffmpeg -i {输入文件} -vf "fps=1" "frames/frame_%04d.png"
```

---

## 12. 添加图片水印/叠加

```bash
# 右下角添加半透明 Logo
ffmpeg -i {视频文件} -i {logo图片} \
  -filter_complex "[1:v]scale=120:-1,format=rgba,colorchannelmixer=aa=0.7[logo];[0:v][logo]overlay=W-w-20:H-h-20[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -c:a copy {输出文件}
```

**位置参数：**
- 左上角：`overlay=20:20`
- 右上角：`overlay=W-w-20:20`
- 左下角：`overlay=20:H-h-20`
- 右下角：`overlay=W-w-20:H-h-20`
- 居中：`overlay=(W-w)/2:(H-h)/2`
