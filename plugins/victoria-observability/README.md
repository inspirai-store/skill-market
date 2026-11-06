# Victoria Observability · 只读观测

让 AI 查询 **VictoriaLogs 日志 + VictoriaMetrics 指标**，关联分析报错、Pod 重启、资源变化和 Kubernetes 事件，并给出带时间窗、查询和证据的结论。

适合已有 Victoria 服务的开发环境、单节点 Kubernetes、容器或主机。**安装技能不等于安装监控服务**：本插件不部署服务、不改集群、不自动修复故障，也不附带任何人的内网地址或凭据。

## 先选安装方式

| 你使用的客户端 | 安装方式 | 连接服务 |
|---|---|---|
| Codex / 兼容其本地配置的客户端 | 下方 Git 安装 | `setup.mjs` 自动保存环境、注册只读 MCP，并验证真实查询 |
| Claude Code | 从 skill-market 安装插件 | 使用后备 CLI，或自行通过 Claude 的 MCP 配置连接服务 |
| 其他能执行本地脚本的 Agent | 使用完整技能目录 | 使用 Node CLI；原生 MCP 注册由对应客户端管理 |

当前自动初始化器只管理 **Codex 配置**，不会替你改 Claude Code 或其他客户端的配置。

## 前置条件

1. 本机有 **Node.js 18+**，`node --version` 能运行。没有额外 npm 包，也不会自动安装 Node.js。
2. 已有可达的 VictoriaMetrics MCP 和 VictoriaLogs MCP，地址应是其 **Streamable HTTP `/mcp` 入口**，而不是 Victoria 原生 API 端口。
3. 若服务要求认证，先安全地为当前进程提供 Bearer Token 环境变量，命令只引用变量名。

客户端不需要 kubectl、Helm、Docker 或集群管理员 kubeconfig。没有部署 MCP 服务时，可参考官方 [指标 MCP](https://github.com/VictoriaMetrics/mcp-victoriametrics) 与 [日志 MCP](https://github.com/VictoriaMetrics/mcp-victorialogs)。服务安装是单独的运维工作，不会在初始化时隐式执行。

## Codex：安装并初始化

### 1. 获取技能

```text
git clone https://github.com/inspirai-store/skill-market.git
cd skill-market/plugins/victoria-observability/skills/victoria-observability
node --version
```

首次安装从这个目录执行即可。确认初始化后，脚本会把完整技能安装到用户级目录，不要求一直从仓库启动。

### 2. 填写自己的 MCP 地址

下方 `example.com` 是占位符，**先替换成你实际可达的 MCP 地址再运行**。`dev` 只是环境名称，也可以用 `staging` 等其他名称。

Windows PowerShell：

```powershell
$metricsMcpUrl = 'https://metrics.example.com/mcp'
$logsMcpUrl = 'https://logs.example.com/mcp'

# 预览安装计划，并进行只读连通性与查询检查；不写入文件
node scripts/setup.mjs init --profile dev --metrics-url $metricsMcpUrl --logs-url $logsMcpUrl

# 确认目标正确后安装技能、保存环境并注册 MCP
node scripts/setup.mjs init --profile dev --metrics-url $metricsMcpUrl --logs-url $logsMcpUrl --apply
```

macOS / Linux 的 Bash、Zsh：

```bash
METRICS_MCP_URL='https://metrics.example.com/mcp'
LOGS_MCP_URL='https://logs.example.com/mcp'

node scripts/setup.mjs init --profile dev --metrics-url "$METRICS_MCP_URL" --logs-url "$LOGS_MCP_URL"
node scripts/setup.mjs init --profile dev --metrics-url "$METRICS_MCP_URL" --logs-url "$LOGS_MCP_URL" --apply
```

默认只预览和检查；`--apply` 才写入本机文件。现有相同配置会复用，不会重复注册；遇到同名不同配置、明确禁用的连接或已修改的技能目录会停止，不强行覆盖。

### 3. 验证并使用

从上面的技能目录运行：

```text
node scripts/setup.mjs doctor --profile dev
```

首次新增 MCP 连接后，重新加载 MCP 或重启客户端。随后可以问：

```text
$victoria-observability 检查 dev 最近15分钟的异常和 Pod 重启，关联日志与内存变化，只读分析，不修复。
```

初始化器不会关闭或重启客户端，也不会替你取得服务授权。

## Claude Code：从市场安装

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install victoria-observability@skill-market
```

已经添加市场但暂时找不到新插件时，先运行 `claude plugin marketplace update skill-market`。安装后重新加载插件或启动新会话，可用 `/victoria-observability:victoria-observability` 显式调用，也可直接描述要分析的问题。

**此步骤只安装技能，不自动设置 MCP 地址。不要用 `setup.mjs` 注册 Claude 连接——它管理的是 Codex。**

可以让 Agent 使用本插件实际安装位置中的 `skills/victoria-observability/scripts/query.mjs`，直接连接已授权的端点；不要假定插件缓存目录固定。例如，从技能目录运行：

```text
node scripts/query.mjs --kind metrics --url https://metrics.example.com/mcp --list
node scripts/query.mjs --kind logs --url https://logs.example.com/mcp --tool query --args-file query.json
```

仍需替换占位地址。若希望工具直接显示在 Claude 的 MCP 工具表里，使用 [Claude 官方 MCP 配置方式](https://code.claude.com/docs/en/mcp)注册同一组地址；原生连接的授权与工具策略由 Claude 和目标服务管理。

## 配置和认证保存在哪里

Codex 初始化时默认使用：

| 内容 | 默认位置 / 行为 |
|---|---|
| 技能代码 | `~/.codex/skills/victoria-observability` |
| 本机环境 | `~/.codex/victoria-observability/environments.json`，与技能分开，更新技能不覆盖 |
| MCP 注册 | `~/.codex/config.toml`，只新增 `<环境>-victoria-metrics`、`<环境>-victoria-logs` |
| 只读工具范围 | 实际服务目录与本地只读白名单的交集，写入 `enabled_tools` |
| 已有文件的变更 | 在原目录备份，保留无关 MCP 和其他环境 |
| 认证 | 只保存环境变量名，不把 Token 写入技能、命令参数或仓库 |

设置了 `CODEX_HOME` 时，默认位置跟随它。`--codex-home DIR` 可初始化其他客户端目录；`--profiles-file FILE` 或 `VICTORIA_OBSERVABILITY_CONFIG` 可指定环境文件。

需要认证时，在初始化命令上追加：

```text
--metrics-bearer-env METRICS_MCP_TOKEN --logs-bearer-env LOGS_MCP_TOKEN
```

这两个变量必须已经存在于当前进程环境中。CLI 直接查询可用 `--bearer-env ENV_NAME`。不要把真实 Token 填进上述变量名位置；如果桌面客户端需要读取这些变量，也要通过它支持的安全方式提供。

后备查询工具的环境读取顺序是：`--profiles-file` → `VICTORIA_OBSERVABILITY_CONFIG` → 用户环境文件 → 随包示例。**公开发布包中的示例为空**，不会默认连接某台个人电脑或集群。

## 验证结果与常见问题

| 结果 / 问题 | 含义与处理 |
|---|---|
| `queries-verified` | 两个 MCP 均能执行真实查询，并看到了数据；不等于整个业务系统没有故障 |
| `connected-with-no-recent-data` | 查询成功，但默认探针没有近期日志或 `up` 指标；检查采集范围、时间窗和指标名称 |
| `initialized: true` | 本机文件已安装/注册，不代表当前会话已经热加载工具 |
| 技能存在，但 AI 看不到 MCP | 分别检查技能加载、MCP 注册、客户端重载和服务可达性，不把它们当成同一件事 |
| 同名配置冲突 | 脚本不覆盖已有地址、策略或手工修改；核对目标后人工合并，或用另一个 profile 名称 |
| 连接超时 / 401 / 404 | 核对网络、认证环境变量以及 `/mcp` 入口；初始化失败时不会先落一套无法验证的配置 |
| 只想装技能，服务还没准备好 | 可以先安装或保留技能目录；等服务可达后再初始化，不需要伪造通过结果 |

默认检查只读 `count(up)` 和最近 15 分钟最多 1 条日志，报告不输出日志原文。非 Prometheus 抓取场景可通过环境配置的 `checks.metrics_query`、`checks.logs_query` 调整检查表达式。

## 只读边界与维护

- 不重启、删除、扩缩容，不修改告警、集群配置或业务数据。
- 优先聚合再读少量日志；关联需要实际存在的服务标签、Pod 信息、trace_id/request_id，不会凭空生成链路或业务指标。
- CLI 有本地只读工具白名单；连接原生 MCP 时仍应核对所接服务的工具目录和客户端权限。
- 不覆盖已有编辑的技能。若旧版本已存在，先备份并通过你的技能管理方式审阅更新；环境文件无需放回技能目录。

修改脚本后验证：

```text
node --test scripts/query.test.mjs scripts/setup.test.mjs
```

已有 15 项自动化测试，并在 Windows 上实际验证了全新客户端安装、重复初始化、Codex 配置解析以及真实日志/指标查询。macOS/Linux 使用同一套 Node 脚本，尚未做原机验收；未把插件结构校验当作 Claude 登录会话端到端验收。

- [技能入口](skills/victoria-observability/SKILL.md)
- [初始化细节](skills/victoria-observability/references/setup.md)
- [查询配方](skills/victoria-observability/references/queries.md)
- [OpenAI MCP 配置文档](https://learn.chatgpt.com/docs/extend/mcp)
- [MIT License](LICENSE)
