---
name: status
description: "Chrome 插件调试状态 - 连接状态、统计信息、storage 查看"
---

# /chplg:status - 状态监控

查看 Chplg DevTools 的连接状态和监控统计。

## 使用方式

```
/chplg:status                  # 查看连接状态和统计
/chplg:status --storage        # 查看目标插件的 storage 数据
/chplg:status --network        # 查看网络请求统计
/chplg:status --perf           # 查看性能指标
```

## 参数

- `--storage` — 显示 storage 数据
- `--network` — 显示网络请求
- `--perf` — 显示性能指标
- `--extension <id>` — 指定扩展 ID

## 执行步骤

### Step 1: 调用 MCP Tool

使用 MCP tool `chplg-devtools.get_status` 获取状态。

### Step 2: 格式化输出

## 基础状态输出

```
══════════════════════════════════════
  Chplg DevTools Status
══════════════════════════════════════

连接状态:
  Extension → Native Host: ✓ 已连接
  Native Host → MCP:       ✓ 运行中
  最后消息:                 3 秒前

监控统计:
  运行时间:     2 小时 15 分钟
  收集日志:     1,234 条
  收集错误:     12 条
  网络请求:     456 条

附加的扩展:
  ✓ Tab Manager (abc123def456)
  ✓ My Extension (xyz789ghi012)

══════════════════════════════════════
```

## --storage 输出

```
══════════════════════════════════════
  Storage Data - Tab Manager
══════════════════════════════════════

storage.local:
{
  "settings": {
    "theme": "dark",
    "autoGroup": false
  },
  "cachedTabs": [...],
  "lastSync": 1706234567890
}

storage.sync:
{
  "userPreferences": {
    "language": "zh-CN"
  }
}

总大小: 12.5 KB / 10 MB (0.1%)

══════════════════════════════════════
```

## --network 输出

```
══════════════════════════════════════
  Network Requests - Last 50
══════════════════════════════════════

状态  方法  URL                              耗时
────────────────────────────────────────────────
200   GET   https://api.example.com/users    45ms
200   POST  https://api.example.com/sync     120ms
404   GET   https://api.example.com/config   32ms
500   POST  https://api.example.com/log      89ms

统计:
  成功: 45 (90%)
  失败: 5 (10%)
  平均耗时: 67ms

══════════════════════════════════════
```

## --perf 输出

```
══════════════════════════════════════
  Performance Metrics
══════════════════════════════════════

Service Worker:
  状态:           active
  上次唤醒:       5 分钟前
  唤醒次数:       23 次

内存使用:
  当前:           15.2 MB
  峰值:           28.7 MB

CPU 使用:
  平均:           0.5%
  峰值:           12.3%

══════════════════════════════════════
```

## 未连接时的输出

```
══════════════════════════════════════
  Chplg DevTools Status
══════════════════════════════════════

⚠️  DevTools 未完全连接

连接状态:
  Extension → Native Host: ✗ 未连接
  Native Host → MCP:       ✓ 运行中

可能原因:
  1. Chrome 扩展未安装或未启用
  2. Native Messaging Host 未正确注册
  3. 扩展 ID 与 Native Host 配置不匹配

解决步骤:
  1. 检查扩展是否已安装: chrome://extensions
  2. 检查 Native Host 配置:
     cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.chplg.devtools.json
  3. 确保 allowed_origins 包含正确的扩展 ID

══════════════════════════════════════
```

## 注意事项

- storage 查看需要目标扩展授权
- 性能数据需要 Chrome 开启相关调试功能
- 网络请求仅记录扩展发起的请求
