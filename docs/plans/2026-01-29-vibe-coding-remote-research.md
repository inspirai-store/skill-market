# Vibe-Coding-Remote 远程控制方案研究

> 项目名称：vibe-coding-remote（灵创）
> 日期：2026-01-29
> 状态：研究阶段

## 1. 需求概述

### 核心痛点
1. **等待焦虑** - Claude Code 运行任务时需要干等，想随时随地通过手机查看进度
2. **多窗口管理** - 同时开多个 Claude Code 窗口，想要统一管理和区分
3. **远程控制** - 不在电脑前时也能给 Claude Code 发指令、回答问题
4. **状态同步** - 想把 Claude 的开发上下文同步到其他地方（如手机）

### 功能需求
- 会话管理：每个窗口有唯一 ID 和可修改别名
- 状态收集：自动收集 Claude 状态和开发细节
- 通知推送：等待输入、任务变化、定时心跳
- 远程控制：回答问题、发指令、中断、查状态

### 技术约束
- 通知渠道：Telegram（优先）+ Web 页面（备用）
- 中转服务：Redis + HTTP API
- 扩展性：支持 Claude Code / Gemini CLI / 其他 AI CLI

---

## 2. Claude-Code-Remote 分析

> 项目地址：https://github.com/JessyTsui/Claude-Code-Remote
> Stars: 979

### 2.1 架构图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│   Stop Hook     │────▶│  Telegram Bot   │
│  (任意窗口)     │     │  (全局触发)     │     │  (发送通知)     │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                        ┌────────▼────────┐              │
                        │  Session 文件   │              │
                        │  (token+tmux)   │              │
                        └────────┬────────┘              │
                                 │                       │
┌─────────────────┐     ┌────────▼────────┐     ┌───────▼─────────┐
│  tmux session   │◀────│  tmux send-keys │◀────│  Webhook 服务   │
│  (Claude Code)  │     │  (命令注入)     │     │  (接收回复)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2.2 关键技术

| 组件 | 技术 | 作用 |
|------|------|------|
| **通知触发** | Claude Code Stop Hook | Claude 完成响应时触发 |
| **消息推送** | Telegram Bot API | 发送通知到手机 |
| **会话管理** | Session 文件 + 8位 Token | 关联通知与 tmux session |
| **命令接收** | Telegram Webhook + ngrok | 接收用户回复 |
| **命令注入** | `tmux send-keys` | 直接往终端写入字符 |

### 2.3 数据流

**通知流程**：
1. Claude 完成响应 → Stop Hook 触发
2. Hook 调用 `claude-hook-notify.js`
3. 生成 8 位 Token，保存 Session 文件到 `src/data/sessions/`
4. 发送 Telegram 消息（含 Token 和使用说明）

**控制流程**：
1. 用户发送 `/cmd TOKEN 指令`
2. ngrok 转发到本地 Webhook 服务（端口 3001）
3. Webhook 根据 Token 查找 Session 文件
4. 用 `tmux send-keys -t session "指令" C-m` 注入命令

### 2.4 核心代码

**Hook 配置** (`~/.claude/settings.json`):
```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node /path/to/claude-hook-notify.js completed",
        "timeout": 5
      }]
    }]
  }
}
```

**tmux 注入** (`src/relay/tmux-injector.js`):
```javascript
async injectCommand(command) {
  // 1. 清空输入
  exec(`tmux send-keys -t ${this.sessionName} C-u`);
  // 2. 发送命令
  exec(`tmux send-keys -t ${this.sessionName} '${command}'`);
  // 3. 按回车
  exec(`tmux send-keys -t ${this.sessionName} C-m`);
}
```

### 2.5 优点

- 多渠道支持：Email / Telegram / Discord / LINE
- 社区活跃，持续更新
- 功能完整，支持会话管理、命令历史等

### 2.6 局限性

| 问题 | 原因 | 影响 |
|------|------|------|
| Hooks 全局触发 | Claude Code 不支持 session 级 hook | 所有窗口都会发通知 |
| 依赖 ngrok | Telegram Webhook 需要公网 URL | ngrok URL 会变，需重新配置 |
| Token 频繁变化 | 每次 Stop 都生成新 Token | 用户需要用最新 Token |
| 配置复杂 | 需要 ngrok + webhook + hooks | 启动步骤多 |

---

## 3. ccremote 分析

> 项目地址：https://github.com/generativereality/ccremote
> Stars: 40
> 技术栈：TypeScript / npm 包

### 3.1 核心特点

ccremote 专注于 **配额管理** 和 **Discord 通知**，而非完整的远程控制。

**主要功能**：
1. **Discord 远程审批** - 在 Discord 中批准权限请求
2. **配额自动续期** - 检测到配额用完后，等待重置自动继续
3. **配额窗口对齐** - 安排早起任务对齐工作日
4. **任务完成通知** - Claude 完成时 Discord 通知
5. **远程查看输出** - `/output` 命令查看当前 session

### 3.2 架构

```
┌─────────────────┐
│  ccremote CLI   │──── 替代 claude 命令启动
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  tmux session   │◀───▶│  监控进程       │
│  (Claude Code)  │     │  (轮询 2s)     │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Discord Bot    │
                        │  (通知+审批)    │
                        └─────────────────┘
```

### 3.3 关键技术

| 组件 | 技术 | 说明 |
|------|------|------|
| **启动方式** | 替代 claude 命令 | `ccremote start` 启动 |
| **监控方式** | tmux 轮询 (2s) | 分析输出检测状态 |
| **通知渠道** | Discord Bot | DM 或私有频道 |
| **配额检测** | 正则匹配输出 | 检测 limit 消息 |
| **命令注入** | tmux send-keys | 自动续期时使用 |

### 3.4 使用方式

```bash
# 安装
npm install -g ccremote

# 初始化配置
ccremote init

# 启动（替代 claude 命令）
ccremote start --name "my-session"
```

### 3.5 优点

- **安装简单** - npm 全局安装即可
- **配额管理** - 自动续期，对齐工作日
- **无需 ngrok** - Discord Bot 使用 WebSocket，不需要公网
- **智能监控** - 检测多种状态（限额/错误/完成）

### 3.6 局限性

| 问题 | 说明 |
|------|------|
| 只支持 Discord | 不支持 Telegram/其他渠道 |
| 必须用它启动 | 不能控制已有的 Claude Code session |
| 功能聚焦 | 主要是配额管理，不是完整远程控制 |

---

## 4. claude-code-telegram 分析

> 项目地址：https://github.com/RichardAtCT/claude-code-telegram
> Stars: 214
> 技术栈：Python / Poetry

### 4.1 核心特点

这是一个 **完整的 Telegram Bot**，它自己管理 Claude Code 进程，提供终端级体验。

**主要功能**：
1. **完整终端体验** - 通过 Telegram 与 Claude Code 对话
2. **目录导航** - cd, ls, pwd 等命令
3. **文件上传** - 上传文件给 Claude 分析
4. **Git 集成** - 查看 status, diff, log
5. **会话持久化** - SQLite 存储会话历史
6. **多层认证** - 白名单 + Token 认证

### 4.2 架构

```
┌─────────────────┐     ┌─────────────────┐
│  Telegram User  │────▶│  Telegram Bot   │
│  (发送消息)     │     │  (Python)       │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Claude Process │
                        │  (subprocess)   │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Claude Code    │
                        │  (stdout/stdin) │
                        └─────────────────┘
```

### 4.3 关键技术

| 组件 | 技术 | 说明 |
|------|------|------|
| **进程管理** | asyncio.subprocess | 异步子进程管理 |
| **通信方式** | stdout/stdin | 直接读写 Claude CLI |
| **Bot 框架** | python-telegram-bot | Telegram Bot API |
| **会话存储** | SQLite | 会话历史持久化 |
| **认证方式** | 白名单 + Token | 多层安全验证 |

### 4.4 核心代码

```python
# 创建 Claude Code 子进程
process = await asyncio.create_subprocess_exec(
    *cmd,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    cwd=str(cwd),
)

# 读取输出流
async for line in process.stdout:
    msg = json.loads(line)
    # 处理 Claude 响应...
```

### 4.5 优点

- **完整终端体验** - 不只是通知，是完整的 Claude Code 客户端
- **功能丰富** - 文件上传、Git、快捷操作等
- **会话持久化** - 可以中断后继续
- **安全性好** - 多层认证

### 4.6 局限性

| 问题 | 说明 |
|------|------|
| 独立进程 | 不能控制已有的 Claude Code session |
| Python 依赖 | 需要 Python 环境 |
| 资源占用 | 每个会话一个 Claude Code 进程 |
| 不支持本地窗口 | 只能通过 Telegram 使用 |

---

## 5. 方案对比

| 特性 | Claude-Code-Remote | ccremote | claude-code-telegram |
|------|-------------------|----------|---------------------|
| **Stars** | 979 | 40 | 214 |
| **技术栈** | Node.js | TypeScript/npm | Python |
| **架构模式** | Hook + Webhook | 替代启动 + 轮询 | 独立进程管理 |
| **通知渠道** | 多渠道 | Discord | Telegram |
| **命令注入** | tmux send-keys | tmux send-keys | subprocess stdin |
| **控制已有 session** | ✅ | ❌ | ❌ |
| **配额管理** | ❌ | ✅ | ❌ |
| **会话存储** | JSON 文件 | - | SQLite |
| **需要公网** | ✅ (ngrok) | ❌ | ❌ |
| **安装复杂度** | 高 | 低 | 中 |

### 三种架构模式对比

| 模式 | 代表项目 | 原理 | 优点 | 缺点 |
|------|----------|------|------|------|
| **Hook + Webhook** | Claude-Code-Remote | 用 Claude Code Hook 触发，Webhook 接收回复 | 可控制已有 session | 需要公网，配置复杂 |
| **替代启动 + 轮询** | ccremote | 替代 claude 命令，轮询 tmux 输出 | 无需公网，配额管理 | 必须用它启动 |
| **独立进程** | claude-code-telegram | 自己创建 Claude Code 子进程 | 完全控制，功能完整 | 不能控制已有 session |

---

## 6. 设计方向

### 6.1 核心需求回顾

用户需要：
1. **控制已有的 Claude Code session** - Hook 模式必须
2. **Telegram 通知** - 首选渠道
3. **无需公网依赖** - 避免 ngrok
4. **多窗口管理** - 区分不同 session
5. **支持扩展** - 未来支持 Gemini CLI 等

### 6.2 推荐方案

**混合架构**：结合 Claude-Code-Remote 和 ccremote 的优点

```
┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│   Stop Hook     │
│  (任意窗口)     │     │  (通知触发)     │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  本地 Server    │◀──── Redis Pub/Sub
                        │  (状态管理)     │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Telegram Bot   │──── Long Polling (无需公网)
                        │  (通知+控制)    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  tmux send-keys │──── 命令注入
                        └─────────────────┘
```

### 6.3 关键改进

| 问题 | Claude-Code-Remote | 我们的方案 |
|------|-------------------|-----------|
| 需要 ngrok | Telegram Webhook | Telegram Long Polling |
| 全局 Hook | 所有窗口都触发 | Hook 内检查 tmux session |
| Token 频繁变化 | 每次 Stop 新 Token | 基于 session ID 的稳定标识 |
| 配置复杂 | 多个服务 | 单一服务 + Redis |

### 6.4 实现优先级

1. **P0**: Telegram Long Polling + tmux send-keys 基础功能
2. **P1**: 会话管理（别名、状态）
3. **P2**: Redis 状态存储
4. **P3**: Web Dashboard 备用渠道
5. **P4**: 支持其他 AI CLI

---

## 附录

### A. 测试记录

**2026-01-29 测试 Claude-Code-Remote**:
1. Hook 触发：✅ 成功
2. Telegram 通知：✅ 成功
3. 命令注入：✅ 成功（tmux 模式）
4. 问题：所有窗口都会触发通知

**2026-01-29 测试 claude-code-telegram**:
1. 安装配置：✅ 成功（需要 Python 3.11，3.14 太新）
2. Telegram Bot 连接：✅ 成功
3. 文本对话：✅ 成功
4. 目录导航：✅ 成功（/ls, /cd, /pwd）
5. 图片上传分析：❌ 不支持

**图片功能限制分析**：
- CLI subprocess 模式下，图片无法传递给 Claude CLI
- `ImageHandler` 将图片转成 base64，但只传了文本 prompt
- 需要 SDK 模式 + API Key 才能支持图片（会产生 API 费用）
- **待研究**：分析 Claude Code CLI 本身如何处理图片传输
  - Claude Code 在终端中是否支持图片？
  - 如果支持，数据流是怎样的？
  - 是否可以通过 stdin 或其他方式传递图片给 CLI？

### B. 待研究问题

1. **Claude Code CLI 图片传输机制**
   - Claude Code 终端版如何处理截图/图片？
   - `claude --help` 是否有图片相关参数？
   - MCP 或其他扩展是否支持图片传输？

2. **SDK vs CLI 模式对比**
   - SDK 模式直接调用 API，支持 multimodal
   - CLI 模式通过 subprocess，受限于 CLI 能力
   - 是否有混合方案？
