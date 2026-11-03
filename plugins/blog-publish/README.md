# blog-publish · 灵感小窝发布

通过来源绑定的 API Token 管理博客：准备图片、视频与音频，保存 Markdown 草稿，核对固定版本，明确审核后单独发布；支持隐藏、撤回和回收站恢复。CLI 使用 Node.js 内置模块，Windows 与 macOS 使用相同命令，不需要安装额外 npm 依赖。

## 安装

Claude Code：

```sh
claude plugin marketplace add inspirai-store/skill-market
claude plugin install blog-publish@skill-market
```

安装后可按任务自动选用，或用 `/blog-publish:blog-publish` 调用。Codex 用户将本插件的 `skills/blog-publish` 文件夹安装到自己的 skills 目录，用 `$blog-publish` 调用。

## 配置一次，后续复用

需要 Node.js 24.14 或更高的 Node 24 版本。以下 `<技能目录>` 指实际安装后的 `skills/blog-publish` 文件夹：

```sh
node <技能目录>/scripts/blog.mjs auth login --url https://blog.inspirai.store
node <技能目录>/scripts/blog.mjs auth status
node <技能目录>/scripts/blog.mjs article list --status all
```

`auth login` 在终端隐藏输入 Token，验证成功后保存到用户目录 `.blog-publish/config.json`，后续进程自动读取，无需临时隧道或重复输入。macOS/Linux 为 `~/.blog-publish/config.json`；Windows 为 `C:\Users\<用户名>\.blog-publish\config.json`。文件含本机明文凭据，应保留在个人设备；不属于插件分发内容。

`auth status` 只显示连接、来源、权限及到期时间，不显示 Token 原文。实际授权期限由服务端返回的 `expires_at` 决定，Skill 不自行延期、扩权或创建替代 Token。`auth logout` 仅移除本机配置，不撤销服务端 Token。

## 使用流程

```sh
node <技能目录>/scripts/blog.mjs --help
node <技能目录>/scripts/blog.mjs draft push article.json --external-id stable-source-id
node <技能目录>/scripts/blog.mjs article show ARTICLE_ID
node <技能目录>/scripts/blog.mjs review ARTICLE_ID --revision REVISION_ID --out review.json
```

文章 JSON 包含 `title`、`slug`、`locale`、`tags`、`markdown`，以及可选摘要和媒体清单。也支持 Markdown 文件。`review` 只生成固定版本回执；助手先展示正文、元数据、revision、SHA256、ETag 和媒体信息，获得对应版本的明确审核与发布指令后，再分别执行：

```sh
node <技能目录>/scripts/blog.mjs review ARTICLE_ID --receipt review.json --approve
node <技能目录>/scripts/blog.mjs publish ARTICLE_ID --receipt review.json
```

配置 Token 或安装插件不代表授权发布文章。上传媒体只准备资产，保存文章只生成草稿；版本变化后需要重新核对，不自动覆盖并发更改。普通内容 Token 不管理账号、验证器或其他 Token。

- [技能入口](skills/blog-publish/SKILL.md)
- [跨平台配置](skills/blog-publish/references/configuration.md)
- [正式站接入与权限](skills/blog-publish/references/production.md)
- [媒体上传、引用和转存](skills/blog-publish/references/media.md)

本插件不分发真实 Token、账号配置、审核回执或文章内容。代码按本目录 [MIT License](LICENSE) 发布。macOS 已验证，Windows 共享实现有自动化覆盖，尚未在原生 Windows 机器上验收。
