# secure-input · 安全输入

在已授权任务需要 API Key、Token、密码或验证码时，由本地桌面弹框接收，助手直接投递到目标程序、配置文件或网站，AI 只接收状态。

## 安装

Claude Code：

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install secure-input@skill-market
```

安装后可按任务自动选用，也可用 `/secure-input:secure-input` 显式调用。自动选用取决于模型匹配，不是所有工具请求的强制拦截器。

Codex 或其他支持本地 skills 的工具，可将本插件中的 `skills/secure-input` 文件夹安装到该工具的用户级 skills 目录。Codex 可用 `$secure-input` 显式调用。

## 初始化与调用

以实际安装位置的 `skills/secure-input` 为技能根目录，首次运行：

```text
python3 <技能根目录>/scripts/setup.py --browser
python3 <技能根目录>/scripts/secure_input.py doctor
```

Windows 使用 `python`。依赖安装到技能自己的 `.venv`，不修改全局 Python。需要 Python 3.11–3.14 和图形桌面；Linux 还需要可用的 Secret Service 及 Chromium 系统依赖。

```text
python3 <技能根目录>/scripts/secure_input.py request --spec <请求JSON的绝对路径>
python3 <技能根目录>/scripts/secure_input.py status --scope <项目/服务/环境作用域>
python3 <技能根目录>/scripts/secure_input.py forget --ref <凭据引用>
```

请求文件只包含用途、字段名、保存方式和目标等非密文参数。密钥在弹框中输入；没有输出原文的查询或导出命令。

## 投递与保存

| 目标 | 行为 |
|---|---|
| 进程 | 只为指定进程注入环境变量，输出仅在本地窗口显示 |
| `.env` / JSON | 必要时直接写入指定字段，保留无关内容并限制文件权限 |
| 网页及云平台设置页 | 在独立 Chromium 中选框和填写，由用户提交；仅返回“已填写” |

验证码、一次性凭据及用途不明确的输入默认仅本次；明确需要复用的凭据默认保存在系统凭据库，用户可在弹框中修改。macOS 使用 Keychain，Windows 使用 Credential Manager，Linux 使用 Secret Service；系统保存不可用时只能选择仅本次或取消。

密钥的保存期限与投递方式独立：长期 Key 可以用于临时进程环境；写入的配置文件仍按文件自身的生命周期保留。首版支持单行凭据，私钥和证书文件需另行适配。

## 保护边界与验收

密码框遮罩不是加密。助手及接收方在使用阶段接触明文，必要时生成的配置文件也仍是明文。此工具避免正常流程将原文送入模型和聊天记录，不隔离同一系统用户下的任意程序。网站脚本可能在填入时读取输入值，因此填写前绑定并核对接收来源，跨域目标必须经本地确认。

macOS 上已通过 35 项核心、原生 GUI 和受控浏览器测试，并完成真实 Keychain 的假凭据保存、替换、存在状态和删除验收。Windows、Linux 提供适配和条件依赖，尚未原机验收。浏览器测试没有登录或保存任何真实云平台账号。

- [技能入口](skills/secure-input/SKILL.md)
- [请求格式和完整示例](skills/secure-input/references/contract.md)
- [保护边界和平台要求](skills/secure-input/references/security.md)
- [测试复现和模型路由用例](skills/secure-input/references/validation.md)

代码按本目录的 [MIT License](LICENSE) 发布；依赖仍适用各自许可证。
