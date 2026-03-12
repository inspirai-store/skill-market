---
name: video-assembly
description: 视频后期组装 — FFmpeg 拼接、字幕、音频混合、格式输出。当用户要求合并视频片段、添加字幕、配音混合、或导出最终视频时触发。
---

# 视频后期组装

按以下流程完成视频后期处理任务。所有操作基于 FFmpeg 命令行工具。

---

## 前置检查

### 检测 FFmpeg

```bash
ffmpeg -version
```

**如果未安装 FFmpeg：** 提供以下安装指引：

```
FFmpeg 未检测到。请按以下方式安装：

方法 1（推荐 — Scoop）:
  scoop install ffmpeg

方法 2（Chocolatey）:
  choco install ffmpeg

方法 3（手动安装）:
  1. 访问 https://www.gyan.dev/ffmpeg/builds/
  2. 下载 "ffmpeg-release-essentials.zip"
  3. 解压到 D:/ffmpeg/
  4. 将 D:/ffmpeg/bin/ 添加到系统 PATH 环境变量
  5. 重启终端后验证：ffmpeg -version

安装完成后告诉我，我将继续处理。
```

### 检查输入文件

1. 确认所有输入视频/音频/字幕文件存在
2. 使用 `ffprobe` 获取文件信息（分辨率、帧率、编码、时长）：

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "{输入文件}"
```

---

## 视频拼接流程

### 步骤 1：准备文件列表

创建 `filelist.txt`，每行一个文件路径：

```
file 'clip_001.mp4'
file 'clip_002.mp4'
file 'clip_003.mp4'
```

**注意：** 文件路径中包含特殊字符时需要转义，或使用绝对路径。

### 步骤 2：帧率统一

先检测所有片段的帧率：

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "{输入文件}"
```

如果帧率不一致，先统一转换：

```bash
# 将视频转换为目标帧率（如 24fps）
ffmpeg -i input.mp4 -r 24 -c:v libx264 -crf 18 -c:a copy output_24fps.mp4
```

**常用帧率选择：**
- 电影感：24fps
- 通用视频：30fps
- 流畅动画：60fps（文件较大）

### 步骤 3：分辨率对齐

如果片段分辨率不一致，使用 scale + pad 策略统一：

```bash
# 缩放到目标分辨率并添加黑边填充（保持比例）
ffmpeg -i input.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -crf 18 output_aligned.mp4
```

### 步骤 4：Concat 拼接

```bash
# 使用 concat demuxer（推荐，速度快，要求编码一致）
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4

# 如果编码不一致，使用 concat filter（会重新编码）
ffmpeg -f concat -safe 0 -i filelist.txt -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k output.mp4
```

---

## 音频处理

### 配音混入

```bash
# 替换原始音频为配音
ffmpeg -i video.mp4 -i voiceover.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest output.mp4

# 保留原始音频并混入配音
ffmpeg -i video.mp4 -i voiceover.wav -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k output.mp4
```

### 音量调节

```bash
# 调整音量倍数
ffmpeg -i input.mp4 -filter:a "volume=1.5" -c:v copy -c:a aac output.mp4

# 音量减半
ffmpeg -i input.mp4 -filter:a "volume=0.5" -c:v copy -c:a aac output.mp4

# 以 dB 为单位调整
ffmpeg -i input.mp4 -filter:a "volume=3dB" -c:v copy -c:a aac output.mp4
```

### 背景音乐叠加

```bash
# 配音 + 背景音乐混合（背景音乐音量降低）
ffmpeg -i video.mp4 -i bgm.mp3 -filter_complex "[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=3[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k output.mp4
```

### 音频标准化

```bash
# 使用 loudnorm 滤镜（EBU R128 标准）
ffmpeg -i input.mp4 -filter:a "loudnorm=I=-16:TP=-1.5:LRA=11" -c:v copy -c:a aac -b:a 192k output.mp4
```

---

## 字幕添加

### SRT 格式模板

```srt
1
00:00:01,000 --> 00:00:04,000
第一句字幕文本

2
00:00:04,500 --> 00:00:08,000
第二句字幕文本

3
00:00:08,500 --> 00:00:12,000
第三句字幕文本
```

**SRT 格式规范：**
- 序号从 1 开始递增
- 时间格式：`HH:MM:SS,mmm`（注意逗号分隔毫秒）
- 每段字幕之间空一行
- 编码必须为 UTF-8（中文字幕尤其注意）

### ASS 格式模板（支持样式）

```ass
[Script Info]
Title: 视频字幕
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans CJK SC,56,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2.5,1,2,30,30,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,第一句字幕文本
Dialogue: 0,0:00:04.50,0:00:08.00,Default,,0,0,0,,第二句字幕文本
```

**ASS 格式优势：** 支持字体、颜色、描边、阴影、位置等精细控制。

### 硬编码字幕命令

```bash
# SRT 字幕硬编码（中文需指定字体）
ffmpeg -i video.mp4 -vf "subtitles=sub.srt:force_style='FontName=Noto Sans CJK SC,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2'" -c:v libx264 -crf 18 -c:a copy output.mp4

# ASS 字幕硬编码
ffmpeg -i video.mp4 -vf "ass=sub.ass" -c:v libx264 -crf 18 -c:a copy output.mp4
```

### 推荐中文字体

| 字体 | 说明 | 获取方式 |
|------|------|---------|
| Noto Sans CJK SC（思源黑体） | Google 开源，覆盖全 CJK | 系统自带或从 Google Fonts 下载 |
| Alibaba PuHuiTi（阿里巴巴普惠体） | 免费商用，现代风格 | https://fonts.alibabagroup.com/ |
| Source Han Sans（思源黑体 Adobe 版） | 同 Noto Sans CJK，Adobe 发布 | Adobe Fonts |
| Microsoft YaHei（微软雅黑） | Windows 自带 | 系统内置 |
| SimHei（黑体） | Windows 自带，兼容性好 | 系统内置 |

---

## 转场效果

### 淡入淡出

```bash
# 视频开头淡入（前 1 秒）
ffmpeg -i input.mp4 -vf "fade=t=in:st=0:d=1" -c:v libx264 -crf 18 -c:a copy output.mp4

# 视频结尾淡出（最后 1 秒，假设视频总长 10 秒）
ffmpeg -i input.mp4 -vf "fade=t=out:st=9:d=1" -c:v libx264 -crf 18 -c:a copy output.mp4

# 同时淡入淡出
ffmpeg -i input.mp4 -vf "fade=t=in:st=0:d=1,fade=t=out:st=9:d=1" -c:v libx264 -crf 18 -c:a copy output.mp4
```

### 交叉溶解（xfade）

```bash
# 两个视频之间交叉溶解转场（1 秒过渡）
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=4[v];[0:a][1:a]acrossfade=d=1[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 18 output.mp4
```

**xfade 支持的转场类型：**
- `fade` — 淡入淡出（最常用）
- `dissolve` — 溶解
- `wipeleft` / `wiperight` / `wipeup` / `wipedown` — 擦除
- `slideleft` / `slideright` — 滑动
- `circleopen` / `circleclose` — 圆形展开/收缩
- `smoothleft` / `smoothright` — 平滑滑动

---

## 输出格式推荐

### 通用高质量输出

```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k -movflags +faststart output.mp4
```

参数说明：
- `-crf 18`：高质量（范围 0-51，越低质量越高，18 为视觉无损）
- `-preset slow`：编码速度慢但压缩率好
- `-movflags +faststart`：将元数据移到文件头，支持网络流式播放

### B站 / YouTube 横屏（16:9）

```bash
ffmpeg -i input.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -crf 18 -preset slow -profile:v high -level:v 4.1 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart output_16x9.mp4
```

### 短视频竖屏（9:16）

```bash
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart output_9x16.mp4
```

### 快速预览

```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset ultrafast -c:a aac -b:a 128k output_preview.mp4
```

参数说明：
- `-crf 28`：较低质量，文件更小
- `-preset ultrafast`：最快编码速度

### GIF 导出

```bash
# 高质量 GIF（先生成调色板）
ffmpeg -i input.mp4 -vf "fps=15,scale=480:-1:flags=lanczos,palettegen" palette.png
ffmpeg -i input.mp4 -i palette.png -filter_complex "fps=15,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif
```

---

## 完整工作流示例

以下是一个典型的漫剧视频组装流程：

```
1. 检测所有片段的帧率和分辨率
2. 统一帧率为 24fps
3. 统一分辨率为 1920x1080
4. 添加片段间转场（交叉溶解 0.5 秒）
5. 混入配音音轨
6. 叠加背景音乐（音量 30%）
7. 硬编码 ASS 字幕
8. 音频标准化
9. 导出 B站 16:9 格式
```
