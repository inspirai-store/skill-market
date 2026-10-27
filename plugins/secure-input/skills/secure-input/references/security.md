# 保护边界与平台要求

## 系统保存

直接选择 `keyring` 内置的 macOS Keychain、Windows WinVaultKeyring 或 Linux SecretService 后端；不使用自动后端发现、第三方后端、明文 fallback 或自制加密文件。

- macOS：Keychain 加密由系统管理。使用同一 Python 可执行文件的其他程序可能访问相同凭据，此工具不是同用户程序之间的隔离边界。
- Windows：Credential Manager 提供用户凭据存储，访问和加密由系统管理。
- Linux：需要图形桌面、D-Bus 会话及受保护的 Secret Service 提供方，例如已配置密码的 GNOME Keyring。接口规范不保证所有服务都采用相同的存储算法，助手不能证明服务未被配置成无密码或不安全存储。

凭据值和获准的目标指纹保存在系统凭据库同一记录中。应用数据目录仅存作用域摘要、引用、后端和更新时间，不保存密钥或密钥片段。持久化引用按作用域和字段标识生成，与密钥原文无关。

## 运行时

密钥在桌面助手和预期接收方内存中以明文使用。密码框只负责遮罩。Python/Qt/浏览器可能产生内存副本，无法承诺零拷贝或彻底擦除，也不能防止拥有同用户权限的恶意程序、系统级抓取或外部崩溃转储。

请求期间关闭助手 stdout/stderr，最后只恢复并返回固定状态结构；包括本地依赖和 Playwright 驱动诊断。子进程使用独立环境字典、参数数组和输出管道，不通过 shell，也不修改助手或父进程的环境。运行输出仅显示在本地窗口，不保存文件。

明文配置按必要兼容功能提供。写入前在同目录建立受限临时文件，再原子替换；POSIX 权限 0600，Windows 设置用户和 LocalSystem 专用 DACL。权限无法设置时不写入。拒绝最终目标符号链接，不创建明文备份。此工具无法防止后续 AI 或其他程序读取这些文件。

浏览器使用无持久化用户目录的独立会话，禁止下载，不开启截图、追踪、网络内容记录或登录状态导出；只向用户选择并确认的 HTTPS 来源填写。页面脚本可能在填入时直接发送数据，用户点击网站保存只是界面提交步骤，不能被当作“填入前网站拿不到密钥”的保证。

## 支持要求

- Python 3.11–3.14；独立环境中的依赖版本见 `requirements.txt`，含 Linux/Windows 条件依赖。
- PySide6 Essentials 提供本地 QtWidgets，不依赖 tkinter。
- Playwright 的 Chromium 由 `setup.py --browser` 安装。Linux 可能另需发行版提供的 GUI/Chromium 系统库；不自动运行 sudo 或变更系统包。
- 无桌面的 SSH、容器、WSL 非图形会话不提供弹框；不回退为聊天索取密钥。

## 来源

- [Codex Skills 自动发现和调用](https://learn.chatgpt.com/docs/build-skills)
- [Apple Keychain](https://developer.apple.com/documentation/security/adding-a-password-to-the-keychain)
- [Windows 凭据处理](https://learn.microsoft.com/en-us/windows/win32/secbp/handling-passwords)
- [Secret Service 规范](https://specifications.freedesktop.org/secret-service/latest-single/)
- [keyring 安全说明](https://keyring.readthedocs.io/en/stable/#security-considerations)
