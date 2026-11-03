# 正式站接入

正式站已开启受限 Token 通道。正式 origin 为 `https://blog.inspirai.store`，不需要本机隧道。文章和媒体接口沿用精确方法／路径白名单、Token scope、来源隔离、幂等和 CAS；未知接口不开放。

先阅读 [共用配置](configuration.md)。Node.js 24 下执行：

```sh
node <skill-dir>/scripts/blog.mjs auth login --url https://blog.inspirai.store
node <skill-dir>/scripts/blog.mjs auth status
node <skill-dir>/scripts/blog.mjs article list --status all
```

首次隐藏输入 Token 并通过 HTTPS 验证后，保存到用户目录 `.blog-publish/config.json`；Windows/macOS 使用相同 JSON。后续新进程自动读取，不需要 export 或重复输入。status 只输出来源、scope、有效期等元数据；不要使用文件读取工具显示凭据。logout 只移除本机文件，不撤销服务端 Token。BLOG_CONFIG／--config 支持独立文件，临时 BLOG_TOKEN／BLOG_URL 仍可使用。只有地址覆盖与文件 origin 不同则停止，不借用该 Token。

Token 在正式后台 `/admin/tokens` 管理，首次、新浏览器或会话过期时使用原账号密码＋验证器登录，浏览器会话为 30 天滚动续期；登录后的敏感操作只确认当前密码。新 Token 可经后台身份验证重复复制；升级前旧记录需用户明确补存其持有的原文，无法从摘要还原。复制／补存不改变权限及有效期，不自动代用户读取或展示真实凭据。实际有效期以 auth status 的 expires_at 为准；不要从浏览器登录时长推算 API Token 的有效期，轮换时保持相同 source。Token 到期或撤销后停止，不从历史对话恢复凭据、不自动创建替代 Token。不使用旧密码式 CLI Token 管理命令，不保存管理员密码、动态码或恢复码。

公网内容 Token 不可访问账号安全、Token 管理、OpenAPI 下载或浏览器管理预览接口。网页固定版本预览使用 `https://blog.inspirai.store/admin/articles/<id>?revision_id=<revision>`，需管理员会话。403 MANAGEMENT_NETWORK_REQUIRED 表示路径／方法或部署边界；403 SESSION_REQUIRED 表示需浏览器会话；403 FORBIDDEN 表示 scope 不足。报告实际限制，不自行开路由或扩权。

回执绑定 origin，正式域名准备的回执使用同一地址完成审核发布；旧临时通道回执重新准备和核对，不编辑 origin 绕过校验。配置成功不代表获准生产内容写入，仍按用户对固定版本的指令保存、审核和单独发布。

权限按任务缩减：文章全链路涉及 blog:ingest、blog:ingest:read、blog:read-draft、blog:write、blog:review、blog:publish、blog:withdraw、blog:visibility、blog:trash；媒体查询／上传／引用使用 blog:media:read、blog:media:write，显式转存另需 blog:media:import。网页“CLI 全流程”预设会包含媒体权限，不能把名称当作最小授权。

生产媒体复用既有私有桶 `production/blog/` 前缀，客户端只用博客 Token，不接收 OSS 密钥。资源、凭据、权限、部署与迁移变更继续单独批准。Windows 共享配置实现已覆盖自动化，原生 Windows 验收仍待补。
