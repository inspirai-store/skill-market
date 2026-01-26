---
name: logs
description: "Chrome 插件实时日志 - 通过 MCP 获取被调试插件的 console 输出"
---

# /chplg:logs - 实时日志查看

查看被监控 Chrome 插件的 console 日志输出。

## 前置条件

需要安装 Chplg DevTools：
1. 安装 Chrome 扩展：`chplg-devtools-extension`
2. 安装 Native Host：`npm install -g chplg-devtools-host && chplg-devtools-host --install`
3. 配置 MCP：`chplg-devtools-host --setup-mcp`

## 使用方式

```
/chplg:logs                    # 查看最近 50 条日志
/chplg:logs --level error      # 仅看错误级别
/chplg:logs --level warn,error # 看警告和错误
/chplg:logs --since 5m         # 最近 5 分钟的日志
/chplg:logs --search "failed"  # 搜索包含 "failed" 的日志
/chplg:logs --limit 100        # 获取 100 条日志
```

## 参数

- `--level <level>` — 日志级别过滤（debug/info/warn/error）
- `--since <time>` — 时间过滤（如 5m, 1h, 30s）
- `--search <keyword>` — 关键词搜索
- `--limit <n>` — 返回数量限制（默认 50）
- `--extension <id>` — 指定扩展 ID

## 执行步骤

### Step 1: 调用 MCP Tool

使用 MCP tool `chplg-devtools.get_logs` 获取日志。

参数映射：
- `--level` → `level`
- `--since` → `since`
- `--search` → `search`
- `--limit` → `limit`
- `--extension` → `extensionId`

### Step 2: 格式化输出

将日志格式化为表格：

```
时间       级别   来源              消息
────────────────────────────────────────────────────
10:23:45   INFO   popup.js:12       User clicked save button
10:23:46   WARN   service-worker:8  Storage quota at 80%
10:23:47   ERROR  content.js:156    Failed to inject script
```

### Step 3: 智能分析

如果存在错误日志，自动分析：
- 错误类型和可能原因
- 相关代码位置
- 修复建议

## 输出格式

### 正常输出

```
══════════════════════════════════════
  Chrome Extension Logs (Tab Manager)
══════════════════════════════════════

10:23:45  INFO   popup.js         TabManager initialized
10:23:45  INFO   popup.js         Loading tabs...
10:23:46  INFO   service-worker   Received message: GET_ALL_TABS
10:23:46  INFO   popup.js         Loaded 12 tabs

总计: 4 条日志 | 过滤: 无 | 来源: Tab Manager

══════════════════════════════════════
```

### 有错误时

```
══════════════════════════════════════
  Chrome Extension Logs (Tab Manager)
══════════════════════════════════════

10:23:45  INFO   popup.js         TabManager initialized
10:23:46  ERROR  service-worker   Cannot read property 'id' of undefined

⚠️  发现 1 个错误

错误分析:
  类型: TypeError
  位置: service-worker.js:47
  原因: 尝试访问 undefined 对象的 id 属性
  建议: 检查 handleGetAllTabs 函数中的 tab 对象是否有效

══════════════════════════════════════
```

## 未连接时

如果 MCP Server 未运行或扩展未连接：

```
[WARN] Chplg DevTools 未连接

请确保：
1. Chrome 扩展 "Chplg DevTools" 已安装并启用
2. Native Host 已安装: chplg-devtools-host --install
3. MCP 已配置: chplg-devtools-host --setup-mcp
4. 在 DevTools 面板中已附加到目标扩展

运行 /chplg:status 查看详细连接状态
```

## 注意事项

- 需要先在 Chplg DevTools 扩展中"附加"到目标扩展才能收集日志
- 日志存储在内存中，重启 Native Host 后会清空
- 默认最多保存 2000 条日志
