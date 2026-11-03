# 媒体准备

媒体操作使用当前 CLI 配置或显式环境中的来源绑定 Token；目标不因素材路径变化而切换。HTTP 仅用于本机回环验收或受认证运维通道；正式站先读 [正式站接入](production.md)。OSS 资源／凭据和部署配置不是本 Skill 的工作。

## 上传本机文件

```sh
node <skill-dir>/scripts/blog.mjs media upload diagram.png --ref flow --alt "发布流程" --caption "图 1 · 发布流程" --out media.json
```

支持 JPEG／PNG／WebP／GIF ≤20MiB，MP4（H.264／AAC）≤512MiB，MP3／M4A（AAC）／WAV ≤100MiB。CLI 流式计算 SHA256，超过 64MiB 使用 8MiB 分片、最多并发 3 片。服务器验证类型、大小、摘要和编码后，才生成可用资产版本；不转码。

`--out` 在上传开始后先保存任务回执，成功后保存资产回执，权限 0600。断点只保存 ID、ETag 和摘要，不保存 Token 或签名地址。中断后保留该文件：

```sh
node <skill-dir>/scripts/blog.mjs media status TASK_ID
node <skill-dir>/scripts/blog.mjs media upload diagram.png --resume TASK_ID --if-match '"TASK_ETAG"' --out media.json
```

先确认同一任务、文件摘要和来源，使用明确 ETag 恢复。412 时保留文件和回执，展示状态差异，不能自动改用新 ETag 覆盖或完成任务。Token 被撤销后停止操作，不借用其他凭据。

## 公开引用与转存

```sh
node <skill-dir>/scripts/blog.mjs media reference https://example.org/diagram.png --kind image --name "流程图" --width 1280 --height 720 --attribution "来源署名" --out media.json
node <skill-dir>/scripts/blog.mjs media reference https://www.bilibili.com/video/BV1B7411m7LV --kind bilibili --name "B站视频" --out media.json
node <skill-dir>/scripts/blog.mjs media import https://example.org/demo.mp4 --kind video --name "演示" --authorization "用户明确允许保存该素材" --attribution "来源署名" --wait --out media.json
```

示例域名和名称是占位，不是用户的内容授权。仅登记用户指定且有相应使用授权的公网 HTTPS 地址；图片直链需要尺寸。直链固定地址和来源描述，原站字节可能变化；需要固定字节时，经明确保存授权使用 `import`。

转存必须写明实际保存授权依据，不能把“地址公开”写成“允许转载”。不下载 B站视频；其短链解析后只登记官方播放器，其他平台保持普通链接。任意 HTML、iframe、脚本与签名媒体地址不能进入文章。

转存持久任务可查询、取消和重试，变更需 If-Match：

```sh
node <skill-dir>/scripts/blog.mjs media status TASK_ID
node <skill-dir>/scripts/blog.mjs media cancel TASK_ID --if-match '"TASK_ETAG"'
node <skill-dir>/scripts/blog.mjs media retry TASK_ID --if-match '"TASK_ETAG"' --wait
```

失败时报告真实任务状态和错误码。网络结果不明时重用原请求、ETag 和幂等键；不把未完成任务描述为可用资产。

## 加入草稿、审查与发布

CLI 资产回执返回 `markdown: "::media[flow]"` 及 `media` 数组。把标记放在正文独立行，把数组加入文章 JSON；或用 `draft push article.md --media media.json`。只选同来源且已就绪的固定资产版本。

保存后核对服务器冻结的 `article.media`；其资产描述及文件 SHA256／外部地址包含在完整文章 SHA256 中。依次准备固定版本回执 → 展示含媒体内容 → 明确审核 → 单独发布。上传、录音、引用和转存都不能代替文章审核。

隐藏、撤回或替换发布版本后，旧博客网关地址的新 GET／HEAD／Range 请求失效。已经下载的字节和外部原站内容无法撤回；不要承诺可以删除第三方已获取的文件。
