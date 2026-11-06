# 客户端初始化与安装

范围仅限本机技能、环境文件、MCP 客户端注册和连通性验证。当前自动配置针对 Codex 兼容客户端，不修改 Claude Code 配置。不部署 Victoria 服务，不变更远端集群。需要 Node.js 18+；没有额外 npm 包，也不会自动下载安装 Node.js。

## 首次接入已有服务

从拿到的技能目录运行，Windows、macOS、Linux 使用同一脚本。先将 example.com 占位地址替换为实际 MCP 地址；`dev` 仅是环境名称，公开包不带个人环境配置：

```text
node scripts/setup.mjs init --profile dev --metrics-url https://metrics.example.com/mcp --logs-url https://logs.example.com/mcp
node scripts/setup.mjs init --profile dev --metrics-url https://metrics.example.com/mcp --logs-url https://logs.example.com/mcp --apply
node scripts/setup.mjs doctor --profile dev
```

没有 `--apply` 时只读取本机配置并做远端只读检查，不创建文件。`--apply` 才安装/写入：

- 技能默认安装到 `~/.codex/skills/victoria-observability`；若设置了 `CODEX_HOME` 则使用该目录。
- 环境配置放在 `~/.codex/victoria-observability/environments.json`，与可更新的技能目录分开。
- 只向 `~/.codex/config.toml` 添加缺少的 `<profile>-victoria-metrics`、`<profile>-victoria-logs` 段，工具白名单来自实际目录与本地只读白名单的交集。
- 现有相同连接和安装内容不重复写入。不同地址、不同工具策略、明确禁用的连接或已编辑的技能不会被强行覆盖；先报告冲突，再由用户决定如何调整。
- 变更已有配置前，在原目录创建独立备份，保留其他 MCP 和其他环境。认证只存环境变量名，不复制令牌。

首次添加 MCP 连接后，需要客户端重新加载连接才能在会话工具表中出现。脚本不关闭或重启客户端；`doctor` 的查询验证不能证明当前聊天已经热加载工具。

## 接入其他环境

```text
node scripts/setup.mjs init --profile staging --metrics-url https://metrics.example/mcp --logs-url https://logs.example/mcp
node scripts/setup.mjs init --profile staging --metrics-url https://metrics.example/mcp --logs-url https://logs.example/mcp --apply
```

带认证时增加 `--metrics-bearer-env METRICS_MCP_TOKEN` 和/或 `--logs-bearer-env LOGS_MCP_TOKEN`。变量必须已经安全提供给当前进程，不在命令行或配置里填令牌原文。若需要用户提供新的密钥，使用宿主支持的安全输入方式。

`--codex-home DIR` 可指定另一个客户端目录；`--profiles-file FILE` 可指定环境文件。使用自定义环境文件时，查询工具也用同一参数，或通过 `VICTORIA_OBSERVABILITY_CONFIG` 指向它。不要把不同机器的本地路径或认证复制到技能包。

## 验证结果怎么解释

`doctor` 检查技能文件、用户环境配置、MCP 配置、实际工具目录以及真实日志/指标查询：

- `queries-verified`：两个查询成功，且看到采集数据。
- `connected-with-no-recent-data`：查询可以执行，但默认检查没有看到近期日志或 up 指标；不能据此说采集已正常。
- `initialized` 只表示本机文件安装/注册状态，不表示当前聊天已加载工具。

默认探针是指标 `count(up)` 和最近 15 分钟最多 1 条日志。输出只报告是否有数据，不输出日志原文。非 Prometheus 抓取环境可能没有 up；可在相应环境配置添加 `checks.metrics_query`。`checks.logs_query` 可限定日志范围。这些检查表达式只用于初始化/doctor，不会隐式改变普通查询的过滤器。

连接、认证或查询失败时不会先写入一套无法验证的客户端配置。服务未部署或地址不可达时，报告缺少的前提，不借初始化之名自动安装服务或修改集群。

脚本修改后运行 `node --test scripts/query.test.mjs scripts/setup.test.mjs`。发布或转移到其他电脑时复制整个技能目录，不带用户目录中的环境文件、MCP 凭据或备份文件。

MCP 配置字段参考：[OpenAI 官方 MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)。
