# CLI 与 Skill 共用本机配置

使用 Node.js 24.14 或更高的 Node 24 版本，Windows 与 macOS 使用相同命令及 JSON 格式。

默认文件由 os.homedir() 定位：macOS／Linux 为 `~/.blog-publish/config.json`，Windows 为 `C:\Users\<用户名>\.blog-publish\config.json`。内容只有 url 与 token。它是用户指定的本机明文凭据，不属于 Skill 分发文件。不要通过文件读取工具展示它；由脚本直接读取。

```sh
node <skill-dir>/scripts/blog.mjs auth login --url https://blog.inspirai.store
node <skill-dir>/scripts/blog.mjs auth status
node <skill-dir>/scripts/blog.mjs auth logout
```

login 在终端隐藏输入，验证 `/integrations/me` 成功后才保存；失败保留旧配置。status 仅显示域名、来源、scope 和有效期。logout 移除本机配置，不撤销服务端 Token。非交互运行可使用 --token-stdin，但不要把明文写进命令参数、聊天或日志。

默认配置使新的 CLI／Skill 进程无需继承终端的 export。BLOG_CONFIG 或 --config 可选择独立文件；本地验收应显式使用验收文件，不覆盖用户真实配置。BLOG_TOKEN 环境变量仍可用于临时任务，目标来自 BLOG_URL／--url；只有 Token 的旧式环境调用仍沿用本地 4318 默认值。

使用文件凭据时，BLOG_URL／--url 若与文件中的 origin 不同，立即停止，不借用该 Token。普通文章命令保持不变。回执仍绑定 origin；切换目标后重新准备回执。

Token 的实际有效期以 auth status 返回的 expires_at 为准，不硬编码期限。到期或撤销后停止请求；由用户明确授权管理员续期，或创建同来源替代 Token 后重新登录。Skill 不自行延长期限或扩权。普通文章 Token 不管理其他 Token、账号密码或验证器。

正式站保留受限 Token 通道并支持后台重复复制，可直接 login 到 https://blog.inspirai.store。若返回 MANAGEMENT_NETWORK_REQUIRED，核对方法／路径与开关状态，不自行扩展路由、恢复隧道或改换凭据。
