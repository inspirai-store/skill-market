---
name: blog-publish
description: 使用灵感小窝博客 API 和 CLI 准备图片、视频和音频，保存文章草稿、核对固定版本、审核发布，以及按明确指令隐藏、撤回或恢复文章。不用于博客部署、账号初始化或其他平台发布。
---

# 灵感小窝发布

使用随 Skill 提供的 `scripts/blog.mjs`。先运行 `node <skill-dir>/scripts/blog.mjs --help` 查看完整命令；所有接口共享来源隔离、版本和幂等合同。

## 目标和凭据

- 先阅读 [共用配置](references/configuration.md)。CLI 自动读取用户目录 `.blog-publish/config.json` 的 url／token；按用户要求跨 Windows／macOS 持久保存。BLOG_TOKEN 仍支持临时环境配置。用 auth status 核对来源、权限及有效期，不读取或展示凭据文件内容，不要求聊天明文，不写入 Skill 正文、shell rc 或项目文件。
- 从用户目标、auth status 或已有环境确认实际 origin。正式站任务另读 [正式站接入](references/production.md)：正式站保留通用配置和受限公网通道，不需要隧道；遇到 403 核对具体接口和权限并报告阻塞。不要把本地内容自动同步到 dev 或生产。
- HTTP 仅支持本机回环，包括本地验收及经明确确认的受认证运维通道；其他目标必须为 HTTPS。不要关闭 TLS 校验、跟随认证重定向或把 Bearer 放进 URL。
- 普通发布 Token 不管理 Token 或管理员。缺少权限时报告具体接口和权限，不借用 collector 的 owner、worker、reader 或其他凭据。

## 草稿和固定版本审查

文章需要媒体时先阅读 [媒体准备](references/media.md)：上传、外链引用和显式转存都只准备资产。需要管理员显式授予 `blog:media:read`、`blog:media:write`，转存另需 `blog:media:import`；旧 Token 不会自动获得新权限。

准备媒体后，将 CLI 返回的 `markdown` 标记和 `media` 清单加入正文与文章 JSON，或用 Markdown 文件配合 `--media media.json` 保存。正文使用独立行 `::media[引用名]`，不使用任意 HTML、iframe 或远程图片语法加载媒体。

文章可使用 JSON（`title, slug, locale, excerpt, tags, markdown`）或 Markdown 文件；Markdown 元数据用 CLI 参数或 JSON frontmatter。

```sh
node <skill-dir>/scripts/blog.mjs draft push article.json --external-id stable-source-id
node <skill-dir>/scripts/blog.mjs article show article-id
node <skill-dir>/scripts/blog.mjs review article-id --revision revision-id --out review.json
```

记录返回的真实文章 ID、revision ID、完整 SHA256、ETag、来源及语言。展示冻结正文、元数据及与当前发布版本的差异；有媒体时逐项展示固定资产版本 ID、类型、文件 SHA256 或外部地址、来源署名、替代文字和图注，并附认证管理入口 `/admin/articles/<id>`。`review` 此时只生成审查回执，不会写入审核通过或发布。

更新现有文章先读取并确认当前内容，再用明确的 `--id` 和 `--if-match` 保存；不要在 409 时改成 blind upsert。翻译分别创建、审核和发布，不能借用另一语言的批准。

## 明确审核后发布

“写文章”“保存草稿”或“运行 Skill”本身不等于公开发布。若用户尚未批准具体版本，停在冻结预览和回执，说明待批准的目标、内容版本和公开影响。

如果已有用户对该站点、来源、语言和冻结版本的明确审核／发布指令，按该授权继续，不重复询问同一批准：

```sh
node <skill-dir>/scripts/blog.mjs review article-id --receipt review.json --approve
node <skill-dir>/scripts/blog.mjs publish article-id --receipt review.json
```

`--approve` 只用于已获得明确审核指令的回执。发布从回执读取审核 ID、revision、SHA 和 ETag；不能替换为“最新版本”。保存回执不包含 Token，文件权限 0600。

发生 412 时保留原文和回执，读取差异并重新展示；不得自动获取新 ETag 重试覆盖、重新审核或发布。新内容需要相应新批准。网络结果不确定时仅使用原请求和原并发条件重试；可使用相同 `--idempotency-key`。不得把 HTTP 成功但未发布的草稿写成已公开。

## 内容生命周期

按用户明确指令使用 `hide`、`unhide`、`withdraw`、`trash`、`restore`。执行前读取目标和状态，给出可审核的影响；已有具体操作授权时直接执行，不再次询问。使用明确 `--if-match` 或当前操作回执。

- 隐藏：列表、搜索、标签、详情均不可见；保留已批准发布快照。
- 取消隐藏：恢复同一已批准快照的公开可见性，不会发布更新的草稿；属于改变公开可见性，需要对应明确指令。
- 撤回：取消发布指针，公开访问失效。重新上线需重新审核和发布。
- 删除：`trash` 移入可恢复回收站；仍有发布快照时先按已授权范围撤回，不擅自扩大“删除草稿”为“撤回线上”。
- 回收站恢复：`restore` 恢复为草稿，不自动公开。`draft restore` 将历史版本恢复为新的草稿。

最后报告实际目标、版本、公开状态、操作结果和可复现检查。只有发布／取消隐藏成功且只读查询确认可见时，才提供公开阅读链接。不要顺带部署、创建账号、发放长期 Token、迁移数据或将候选项目素材当成已批准内容。

旧正文中的远程图片语法仍只保留替代文字，不因升级自动加载。媒体文件、公开地址、来源署名或图注变化时，重新准备相应资产／文章版本、展示差异并取得该固定版本的审核；不能沿用旧回执公开新媒体。OSS 资源／凭据变更及 dev／生产部署不属于发布任务，继续按对应阶段单独批准。
