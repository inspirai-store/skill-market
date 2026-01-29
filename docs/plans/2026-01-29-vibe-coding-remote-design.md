# Vibe-Coding-Remote 设计文档

> 项目名称：vibe-coding-remote（灵创）
> 日期：2026-01-29
> 状态：设计完成，待实现

## 1. 概述

### 1.1 项目目标

构建一个轻量级的 Claude Code 远程监控和控制系统，让用户可以通过手机 APP 实时查看多个 Claude Code 窗口的状态，并进行远程控制。

### 1.2 核心需求

| 需求 | 描述 | 优先级 |
|------|------|--------|
| 多窗口监控 | 同时监控多个 Claude Code 窗口的状态 | P0 |
| 状态通知 | 等待输入、任务完成等状态变化时通知 | P0 |
| 远程控制 | 通过手机发送指令、回答问题 | P1 |
| 会话别名 | 每个窗口可设置易识别的别名 | P1 |
| 状态同步 | 开发上下文同步到手机 | P2 |

### 1.3 技术约束

- 不需要高可用
- 延迟不敏感（秒级延迟可接受）
- 使用现有阿里云轻量服务器
- 先做 PWA，后续可升级 Flutter

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    开发电脑 (macOS)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Claude Code │  │ Claude Code │  │ Claude Code │         │
│  │  项目 A     │  │  项目 B     │  │  项目 C     │         │
│  │ (tmux: a)   │  │ (tmux: b)   │  │ (tmux: c)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │ Hook 脚本   │ ← Claude Code Hooks       │
│                   │ (状态上报)  │                           │
│                   └──────┬──────┘                           │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │ 轮询脚本    │ ← 定时拉取命令            │
│                   │ (命令执行)  │                           │
│                   └──────┬──────┘                           │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              阿里云轻量服务器 (武汉)                          │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │  API 服务       │◄──►│  Redis          │                 │
│  │  (Node.js)      │    │  (自建)         │                 │
│  │                 │    │                 │                 │
│  │  端口: 3000     │    │  端口: 6379     │                 │
│  └────────┬────────┘    └─────────────────┘                 │
│           │                                                  │
│           │ WebSocket (实时推送)                             │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────┐
│   手机 APP      │
│  (PWA/Flutter)  │
│                 │
│  - 会话列表     │
│  - 状态监控     │
│  - 远程控制     │
│  - 消息通知     │
└─────────────────┘
```

### 2.2 数据流

#### 状态上报流程

```
1. Claude Code 触发 Hook (Stop/SubagentStop/等)
2. Hook 脚本收集状态信息（项目、tmux session、最后消息等）
3. Hook 脚本 POST 到服务器 /api/events
4. 服务器存储到 Redis，通过 WebSocket 推送到手机
5. 手机 APP 显示状态更新
```

#### 远程控制流程

```
1. 用户在手机 APP 输入命令
2. APP POST 到服务器 /api/commands
3. 服务器存储命令到 Redis (status: pending)
4. 电脑轮询脚本 GET /api/commands/pending/:sessionId
5. 轮询脚本获取命令，通过 tmux send-keys 注入
6. 轮询脚本 POST /api/commands/:id/ack 确认执行
```

### 2.3 组件说明

| 组件 | 职责 | 技术栈 |
|------|------|--------|
| **Hook 脚本** | 监听 Claude Code 事件，上报状态 | Shell + curl |
| **轮询脚本** | 定时拉取命令，执行 tmux 注入 | Node.js |
| **API 服务** | 提供 REST API 和 WebSocket | Node.js + Express + ws |
| **Redis** | 存储会话、事件、命令 | Redis 7.x |
| **手机 APP** | 用户界面 | PWA (Vue/React) → Flutter |

---

## 3. 数据模型

### 3.1 Session（会话）

```typescript
interface Session {
  id: string;              // UUID
  machineId: string;       // 机器标识（支持多台电脑）
  alias: string;           // 用户设置的别名，如 "skill-market-主窗口"
  project: string;         // 项目名称
  projectPath: string;     // 项目路径
  tmuxSession: string;     // tmux session 名称
  status: SessionStatus;   // 当前状态
  lastActivity: Date;      // 最后活动时间
  lastMessage: string;     // 最后的 Claude 消息摘要
  createdAt: Date;
  updatedAt: Date;
}

enum SessionStatus {
  WORKING = 'working',           // Claude 正在工作
  WAITING_INPUT = 'waiting_input', // 等待用户输入
  IDLE = 'idle',                 // 空闲
  ERROR = 'error',               // 出错
  OFFLINE = 'offline'            // 离线
}
```

### 3.2 Event（事件）

```typescript
interface Event {
  id: string;              // UUID
  sessionId: string;       // 关联的会话
  type: EventType;         // 事件类型
  title: string;           // 事件标题
  content: string;         // 事件内容/详情
  metadata: object;        // 额外元数据
  createdAt: Date;
}

enum EventType {
  STATUS_CHANGE = 'status_change',   // 状态变化
  NEED_INPUT = 'need_input',         // 需要输入
  TASK_COMPLETED = 'completed',      // 任务完成
  ERROR = 'error',                   // 错误
  HEARTBEAT = 'heartbeat'            // 心跳
}
```

### 3.3 Command（命令）

```typescript
interface Command {
  id: string;              // UUID
  sessionId: string;       // 目标会话
  type: CommandType;       // 命令类型
  content: string;         // 命令内容
  status: CommandStatus;   // 执行状态
  createdAt: Date;
  deliveredAt?: Date;      // 送达时间
  executedAt?: Date;       // 执行时间
}

enum CommandType {
  INPUT = 'input',         // 输入文本
  INTERRUPT = 'interrupt', // 中断 (Ctrl+C)
  ENTER = 'enter',         // 回车
  CUSTOM = 'custom'        // 自定义 tmux 命令
}

enum CommandStatus {
  PENDING = 'pending',     // 待执行
  DELIVERED = 'delivered', // 已送达
  EXECUTED = 'executed',   // 已执行
  FAILED = 'failed'        // 执行失败
}
```

---

## 4. API 设计

### 4.1 REST API

#### 会话管理

```
POST   /api/sessions              # 注册/更新会话
GET    /api/sessions              # 获取所有会话
GET    /api/sessions/:id          # 获取单个会话
PATCH  /api/sessions/:id          # 更新会话（别名等）
DELETE /api/sessions/:id          # 删除会话
```

#### 事件管理

```
POST   /api/events                # 上报事件
GET    /api/events                # 获取所有事件（分页）
GET    /api/events/:sessionId     # 获取会话的事件
```

#### 命令管理

```
POST   /api/commands              # 发送命令
GET    /api/commands/pending/:sessionId  # 获取待执行命令
POST   /api/commands/:id/ack      # 确认命令执行
```

### 4.2 WebSocket

```
连接: ws://server:3000/ws?token=xxx

服务器推送消息类型:
- session_update: 会话状态更新
- new_event: 新事件
- command_status: 命令状态更新
```

### 4.3 认证

简单 Token 认证：
- 配置文件中设置 `API_TOKEN`
- 所有请求 Header 携带 `Authorization: Bearer <token>`

---

## 5. 实现计划

### 5.1 阶段划分

#### P0: 基础设施（第 1 周）

- [ ] 服务器环境配置（Node.js + Redis）
- [ ] API 服务骨架
- [ ] 基础数据存储

#### P1: 状态上报（第 1-2 周）

- [ ] Hook 脚本开发
- [ ] 会话注册/更新 API
- [ ] 事件上报 API
- [ ] 心跳机制

#### P2: PWA 基础界面（第 2 周）

- [ ] 会话列表页面
- [ ] 会话详情页面
- [ ] WebSocket 实时更新
- [ ] 基础 UI 组件

#### P3: 远程控制（第 3 周）

- [ ] 命令下发 API
- [ ] 电脑端轮询脚本
- [ ] tmux 命令注入
- [ ] APP 控制界面

#### P4: 通知推送（第 3-4 周）

- [ ] Web Push 通知
- [ ] 通知偏好设置
- [ ] 静默时段配置

#### P5: Flutter APP（后续）

- [ ] 重构为 Flutter
- [ ] 原生推送
- [ ] 更好的 UI/UX

### 5.2 目录结构

```
vibe-coding-remote/
├── server/                 # 服务端
│   ├── src/
│   │   ├── api/           # API 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── models/        # 数据模型
│   │   ├── websocket/     # WebSocket 处理
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── Dockerfile
│
├── client/                 # 电脑端脚本
│   ├── hooks/             # Claude Code Hook 脚本
│   │   └── vcr-hook.sh
│   ├── poller/            # 命令轮询脚本
│   │   └── vcr-poller.js
│   └── install.sh         # 安装脚本
│
├── webapp/                 # PWA 前端
│   ├── src/
│   ├── public/
│   └── package.json
│
├── docs/                   # 文档
│   └── api.md
│
└── README.md
```

---

## 6. 资源消耗估算

### 6.1 服务器资源

| 资源 | 预估消耗 | 说明 |
|------|----------|------|
| CPU | < 1% | 低频请求 |
| 内存 | ~100MB | Node.js 50MB + Redis 50MB |
| 磁盘 | ~100MB | 代码 + 日志 + Redis 数据 |
| 带宽 | ~30MB/月 | 状态上报 + 命令下发 |

### 6.2 使用量估算

假设：3 个项目，每天活跃 8 小时

| 类型 | 频率 | 单次大小 | 日流量 |
|------|------|----------|--------|
| Hook 通知 | ~300 次/天 | ~2KB | 600KB |
| WebSocket 推送 | ~300 次/天 | ~0.5KB | 150KB |
| 轮询请求 | ~17280 次/天 | ~0.2KB | 3.5MB |
| 远程命令 | ~50 次/天 | ~1KB | 50KB |

**月总流量**: ~120MB（轮询占大头，实际更少）

---

## 7. 安全考虑

### 7.1 认证

- API Token 认证
- Token 定期轮换建议

### 7.2 传输

- HTTPS 加密（使用 Let's Encrypt）
- WebSocket over TLS (wss://)

### 7.3 数据

- 不存储敏感代码内容
- 只存储状态摘要和元数据
- Redis 数据定期清理（保留 7 天）

---

## 8. 后续扩展

### 8.1 可能的扩展

- [ ] 支持多台电脑
- [ ] 支持 Gemini CLI 等其他 AI CLI
- [ ] 会话录制回放
- [ ] 成本统计
- [ ] 团队协作

### 8.2 待研究

- [ ] Claude Code CLI 图片传输机制（见 Issue #4）
- [ ] 更精准的状态检测（分析 Claude 输出）

---

## 附录

### A. 相关文档

- [调研文档](./2026-01-29-vibe-coding-remote-research.md)
- [GitHub Issue #4: 图片传输研究](https://github.com/inspirai-store/skill-market/issues/4)

### B. 参考项目

- [Claude-Code-Remote](https://github.com/JessyTsui/Claude-Code-Remote) - Hook + Webhook 方案
- [claude-code-telegram](https://github.com/RichardAtCT/claude-code-telegram) - 独立进程方案
- [ccremote](https://github.com/generativereality/ccremote) - 配额管理方案
