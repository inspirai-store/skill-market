# 本地运行和维护

## 文件布局

- `scripts/voice_studio.py`：从任意任务调用的入口，命令为 `status/open/voices/preset/select/clear-preset/generate/configure-keys/stop`。
- `scripts/server.py`：仅绑定 127.0.0.1 的试听服务。
- `scripts/tts.py`：百炼和 MiniMax 连接、凭据读取、响度统一。
- `assets/web/`：已构建的前端，运行时不需要 Node.js。
- `assets/web-source/`：可编辑 React/Vite 前端；修改后在此目录安装其声明依赖并执行 `npm run build`。
- `assets/voices.json`：2026-10-27 从实际候选目录保存的 32 款系统音色快照。
- `assets/default-text.txt`：统一 KV Cache 试听文稿，不限制其他任务采用的内容。

默认数据目录 `~/.local/share/voice-studio/`，可用 `VOICE_STUDIO_DATA` 指定另一独立目录：

| 相对路径 | 内容 |
| --- | --- |
| `credentials.env` | JSON 引号编码的 `DASHSCOPE_API_KEY`、`MINIMAX_API_KEY`，权限 0600 |
| `library/audio/`、`library/takes/` | 已生成 MP3 和对应索引 |
| `cache/` | 私有 API 响应、原始音频和请求参数 |
| `custom-voices.json` | 当前账号的克隆音色注册记录 |
| `reference-voice-authorization.json` | 既有视频参考声线的授权声明 |
| `preset.json` | 用户明确保存的常用声线、语速、表达预设 |
| `server.log` | 启动和生成日志，失败信息会脱敏 |

公开发布包仅包含 32 款系统音色的元数据和控台代码，不附带个人样音、常用配置、账号绑定的声线 ID、授权记录或凭据。已有个人数据按用户要求单独迁移，账号音色的可用性以对应账号的真实 API 返回为准。

## CLI 细节

全局 `--port` 放在子命令之前，例如：

```bash
python3 scripts/voice_studio.py --port 18767 open --voice 许南川
```

`open` 返回 URL，由调用者决定在 Codex 内打开或交给浏览器。后台服务通过独立会话启动，重复调用复用同一数据目录的服务。`generate` 会等待指定音色对应的任务，默认最多 600 秒；超时后任务仍可在试听台查看，重复同一命令复用缓存或已有任务。

`status` 只显示配置是否存在，不验证账号额度或密钥有效性，也不请求付费合成。没有设置常用声线时 `generate` 必须显式指定音色。`voices --query` 支持名称、ID 和描述查询。`clear-preset` 清除常用选择，不删除音色或样音。

## HTTP 接口

- `GET /api/health`：应用身份、进程 ID、数据目录。
- `GET /api/catalog`：音色、默认文稿和常用配置。
- `GET /api/preset` / `POST /api/preset`：读取或保存常用配置；`voice_id: null` 清除选择。
- `POST /api/resolve`：`{text, speed, direction?}`，返回上下文及缓存结果。
- `POST /api/generate`：`{voice_ids, text, speed, direction?}`，只生成指定候选。
- `GET /api/jobs?context=<id>`：对应上下文的任务状态。
- `GET /audio/<take-id>.mp3`：支持 Range 的音频；不公开凭据、私有缓存或声音参考文件。

每段索引以“文稿、语速、指令”的摘要为上下文，再结合音色 ID 得到 take ID。已有同稿样音在换工作目录后仍可复用。

百炼使用 `qwen-audio-3.1-tts-plus`，48000 Hz；MiniMax 使用 `speech-2.8-hd`，32000 Hz。MiniMax 当前连接不能使用 48000 Hz。百炼音频结果若返回 OSS 的 HTTP 链接，仅对 `.aliyuncs.com` 升级为 HTTPS 下载，不把 API 鉴权头转发到音频 URL。

## 修改和迁移

维护前端时保持已有视觉样式，不加入与操作无关的说明性小字。校验构建、实际播放、常用选择在刷新后的保留，以及 CLI 能把选中的声线用于输出。音色 ID 和模型必须匹配，尤其是账号绑定的克隆音色。

复制 Skill 到另一台机器时，系统音色目录与前端可直接携带；个人样音、常用配置和账号音色在独立数据目录，按用户要求单独迁移。不要把 `credentials.env` 或原始参考音频包进 Skill 公开分发。新机器需要 Python 3.10+、FFmpeg 和 ffprobe。内置密钥弹窗使用 Swift/AppKit，仅适用于 macOS 且需要 Swift 工具链；其他系统需使用本地安全输入工具写入 JSON 引号编码的同名环境字段，不能把普通 shell dotenv 的解析规则直接套到该文件。
