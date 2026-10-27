# 本地命令与请求格式

以下命令中的 `<skill>` 为此技能实际目录。不要把凭据原文放入任何参数。

```text
python3 <skill>/scripts/setup.py --browser
python3 <skill>/scripts/secure_input.py doctor
python3 <skill>/scripts/secure_input.py request --spec /absolute/request.json
python3 <skill>/scripts/secure_input.py status --scope my-app/provider/development
python3 <skill>/scripts/secure_input.py forget --ref si1_...
```

Windows 使用 `python` 和绝对 Windows 路径。POSIX 另提供可执行的 `scripts/secure-input`，Windows 提供 `scripts/secure-input.cmd`。启动器自动使用此技能的 `.venv`，无需激活，不修改 PATH。

## 最小请求

```json
{
  "version": 1,
  "purpose": "运行开发服务",
  "scope": "my-app/provider/development",
  "persistence": "auto",
  "refresh": false,
  "fields": [
    {"name": "api_key", "label": "API Key", "kind": "api_key", "usage": "reusable"}
  ],
  "destination": {
    "type": "process",
    "executable": "/absolute/path/to/node",
    "args": ["server.mjs"],
    "cwd": "/absolute/path/to/project",
    "bindings": {"PROVIDER_API_KEY": "api_key"},
    "timeout_seconds": 3600
  }
}
```

- `fields` 为 1–16 个字段；`name` 是非密文字段标识，`label` 是弹框标签。
- `kind` 为 `api_key`、`token`、`password`、`otp`；`usage` 为 `one_shot`、`reusable`、`unknown`。
- `persistence` 可省略，默认为 `auto`；另支持 `session`、`system`。OTP 始终仅本次。
- `refresh: true` 强制输入替换值；已保存值不会预填到输入框。`session` 不删除以前已经保存的凭据，删除需使用 `forget`。
- 所有文件、可执行程序和工作目录使用绝对路径。程序通过参数数组直接启动，不能用 shell 命令字符串代替。参数也不能包含凭据原文。
- `bindings` 的键是目标环境变量名或 JSON Pointer，值是字段 `name`，所有字段必须被绑定。
- 默认进程超时 3600 秒，允许 1–86400 秒。子进程输出仅在本地窗口显示，关闭前 AI 等待；点击停止或关闭运行中的窗口会终止进程组。

## 其他投递目标

仅替换 `destination`：

```json
{"type":"dotenv","path":"/absolute/project/.env","bindings":{"API_KEY":"api_key"}}
```

`.env` 使用 python-dotenv 兼容的单引号和反斜杠转义，按完整语句解析并保留无关内容。绑定字段重复、原文件语法无效或凭据包含 `${` 时停止，避免不同读取器的变量插值改变凭据；此时改用进程注入或 JSON。

```json
{"type":"json","path":"/absolute/project/settings.json","bindings":{"/provider/apiKey":"api_key"}}
```

JSON Pointer 支持对象路径，`~0` 为 `~`、`~1` 为 `/`；不支持数组下标。保留无关字段的语义，文件缩进统一为两格。重复 JSON 键、父路径非对象、重叠绑定会停止。

```json
{"type":"browser","url":"https://console.example.com/settings"}
```

助手打开独立 Chromium 临时会话。用户自行登录，然后按字段顺序点击所需输入框；本地弹框输入/确认后直接填写。HTTPS 精确来源绑定包含协议、主机和端口。跨域页面或 iframe 必须再经本地确认，确认只对本次有效。网站自行收到填入值，这是预期接收方。

填入后用户在浏览器提交并关闭窗口，助手返回 `filled`。不自动点击提交，不观察或推断远端保存。关闭浏览器前不返回浏览器页面、cookies、网络内容给模型。

## 返回值

JSON 返回 `request_id`、`status` 和必要的结果字段，不返回用途、路径、字段原文或子进程原始输出。

| status | 退出码 | 含义 |
|---|---:|---|
| completed | 0 | 已完成指定投递 |
| cancelled | 2 | 用户取消或中断 |
| blocked | 3 | 无桌面、缺依赖、凭据库问题、无效目标等 |
| failed | 4 | 运行失败；进程失败时可带退出码 |

`result` 为 `written`、`filled` 或 `exited`。浏览器带 `remote_saved: unverified`。`refs` 只包含已选择系统保存的非原文引用。错误仅包含固定 `code`，不回传异常内容。

初始化的 `doctor` 只检查依赖、桌面会话、系统后端和 Chromium 是否存在，不能代替真实凭据库和 GUI 验收。`status` 通过本地助手检查系统存储，不以元数据索引冒充真实存在。
