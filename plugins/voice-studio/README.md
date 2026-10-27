# voice-studio · 声音试听与配音

本地配音选择控台：比较百炼和 MiniMax 音色，切换 A/B、收藏、保存常用声线，按文稿和参数复用生成结果，并导出 MP3、WAV、M4A 及配音清单。

## 安装

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install voice-studio@skill-market
```

也可将本插件的 `skills/voice-studio` 安装到其他工具支持的用户级 skills 目录；Codex 可显式调用 `$voice-studio`。

运行需要 Python 3.10+、FFmpeg 和 ffprobe。内置前端已构建，日常使用不需要 Node.js。内置密钥弹窗使用 Swift/AppKit，当前仅支持具备 Swift 工具链的 macOS；其他系统需通过本地安全输入工具配置凭据，尚未原机验收。

## 使用

从实际安装目录下的 `skills/voice-studio` 运行：

```text
python3 scripts/voice_studio.py status
python3 scripts/voice_studio.py open
python3 scripts/voice_studio.py voices --query 许南川
python3 scripts/voice_studio.py select --voice 许南川 --speed 0.96 --style teacher
python3 scripts/voice_studio.py generate --text-file /absolute/narration.txt --out /absolute/narration.mp3
```

`open` 返回本地 URL，默认 `http://127.0.0.1:8767/`。服务可重复打开；更换端口时将 `--port` 放在子命令之前。用户在控台点击“设为常用”后，后续 CLI 可复用该声线和语速。本次显式参数优先，临时换音色不会自动覆盖常用设置。

`status` 只检查本地配置和工具是否存在；打开控台不会自动请求付费合成。生成选中的新试听或新文稿会使用用户自己的供应商账号与额度。相同文稿、声线、语速和指令优先复用已有结果。

macOS 可运行以下命令，在本地遮罩弹窗中配置百炼和 MiniMax Key：

```text
python3 scripts/voice_studio.py configure-keys
```

凭据保存在独立用户数据目录的 `credentials.env`，权限 0600，文件本身是明文，不属于系统钥匙串。Key 不通过浏览器、命令行参数或输出清单传递。修改凭据后需重启该 skill 自己的服务。

## 数据与分发边界

默认资源库位于 `~/.local/share/voice-studio/`，可用 `VOICE_STUDIO_DATA` 指定其他目录。用户文稿、样音、收藏、常用声线、账号绑定的自定义音色和凭据属于本地用户数据。公开包仅附带系统音色元数据、默认试听文稿、前端、脚本和文档。

首次安装没有个人克隆声线或常用配置。已有授权的克隆声线可从各自本地目录复用，授权和声线 ID 不随公开包转移到其他账号。

百炼连接支持讲述指令；当前 MiniMax 连接使用声线、语速和 `fluent` 设置，不应用自然语言讲述指令。导出清单通过 `direction_applied` 区分。模型与音色目录是发布时快照，实际可用性取决于供应商接口和用户账号。

发布时已完成 14 项隔离数据目录下的离线测试，覆盖常用选择、缓存、静态控台、音频 Range 和三种导出格式；测试音频为本地合成的测试信号，不代表供应商真实声线效果。

- [技能入口](skills/voice-studio/SKILL.md)
- [接口、数据目录与维护](skills/voice-studio/references/runtime.md)
- [离线验收方法](skills/voice-studio/tests/README.md)

前端源码在 `skills/voice-studio/assets/web-source/`，可在该目录运行 `npm ci` 和 `npm run build` 重建到 `assets/web/`。代码采用 [MIT License](LICENSE)，依赖使用各自许可证。
