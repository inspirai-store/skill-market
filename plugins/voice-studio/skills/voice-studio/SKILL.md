---
name: voice-studio
description: 打开声音试听台，试听挑选百炼与 MiniMax 音色、保存常用声线并复用生成配音。用于中文旁白、教学视频配音、有声内容，以及已有授权克隆声线的复用；不负责音乐或音效创作。
---

# 声音试听与配音

打开本地声音试听台，比较百炼、MiniMax 音色，把选中的声线用于新文稿。运行使用内置前端构建产物，不需要安装前端依赖。

优先复用用户本地保存的常用声线；本次明确指定的音色、语速和表达方式优先。新安装没有常用配置或个人克隆声线，不把其他用户的声线选择或授权视为当前用户的默认设置。

## 打开和挑选

以下命令从本 Skill 目录运行，调用终端工具时显式使用本目录作为工作目录。

```bash
python3 scripts/voice_studio.py status
python3 scripts/voice_studio.py open
python3 scripts/voice_studio.py voices --query 许南川
python3 scripts/voice_studio.py preset
```

`open` 返回实际 URL，并在需要时启动本地服务。用 `open_in_codex` 打开该 URL；不需要展示浏览器时直接使用 CLI。服务默认是 `http://127.0.0.1:8767/`，已运行时直接复用。

需要比较声线时，沿用同一段文稿和语速，在试听台播放或切换 A/B。先复用已有样音；生成新试听只针对本次有用的候选。页面提供平台、声线筛选、搜索、收藏与音频下载。

用户点击“设为常用”，或明确说某个声音以后常用时，保存其选择：

```bash
python3 scripts/voice_studio.py select --voice 许南川 --speed 0.96 --style teacher
```

已有明确声线或常用配置时直接复用，用户本次指定的音色、语速和表达方式优先。临时换一个声音不自动覆盖常用配置。没有常用配置且用户要求直接配音时，可以按用途选择匹配声线；需要用户比较时再打开试听台。

## 生成和导出

把正文写入 UTF-8 文件，按完整语义段落合成。用实际绝对文件路径替换下例中的路径。

```bash
python3 scripts/voice_studio.py generate --text-file /absolute/narration.txt --out /absolute/narration.mp3
python3 scripts/voice_studio.py generate --voice 许南川 --style teacher --text-file /absolute/narration.txt --out /absolute/narration.wav
python3 scripts/voice_studio.py generate --voice 许南川 --style natural --text-file /absolute/narration.txt --out /absolute/narration.m4a
```

不指定 `--voice` 时使用常用声线；可用完整 ID 或唯一名称指定。`--speed` 覆盖本次语速，`--direction-file` 从 UTF-8 文件读取本次讲述指令。老师讲解与自然叙述是预设，可根据任务自定，不把所有内容都处理成讲课。

百炼支持自然语言讲述指令；当前 MiniMax 连接使用声线、语速和 `fluent` 表达设置，不传入自然语言指令。导出清单里的 `direction_applied` 标明是否应用了指令；不要声称 MiniMax 已按文字指令改变风格。

相同文稿、音色、语速和指令复用已有结果。导出支持 MP3、WAV、M4A，旁边生成 `.json` 清单，包含声线、模型、实际时长、文稿、参数和校验值，不包含密钥。输出文件已存在时换一个名字；只有明确要覆盖时使用 `--overwrite`。

完成后使用绝对路径展示音频，说明采用的声线；需要时给出音频与清单链接。数字、小数、百分比、英文缩写或单位较多时，检查关键读法，必要时给 TTS 明确的朗读文本；保留字幕或原稿的书面形式。

## 状态和边界

- 本机资源库位于 `~/.local/share/voice-studio/`：常用配置、音频缓存、自定义音色和凭据独立保存，原视频项目保留。
- API Key 只在资源库的 `credentials.env` 中读取，不放进 Skill、命令行参数、浏览器或输出清单。macOS 可用 `python3 scripts/voice_studio.py configure-keys` 打开 Swift/AppKit 安全输入弹窗；其他系统需使用本地安全输入工具写入相同格式，不能要求用户把 Key 发到对话。更改后重启本 Skill 自己的服务。
- 已注册的克隆声线按已有授权复用，不再次创建同一个音色。注册到当前账号的音色 ID 不能当作所有账号通用；新来源的声音需要有对应授权，现有授权不覆盖其他原声者。
- 端口被其他程序占用时不终止未知进程，可改用 `--port`。`stop` 只停止应用身份和数据目录匹配的本 Skill 服务。
- 此 Skill 输出配音；视频动画、剪辑和字幕时间轴按视频任务处理，不直接套用旧配音的时长。

需要接口、数据路径、维护或迁移细节时，读取 [references/runtime.md](references/runtime.md)。
