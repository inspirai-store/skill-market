---
name: errors
description: "Chrome 插件错误查看 - 获取运行时错误和异常堆栈"
---

# /chplg:errors - 错误查看

查看被监控 Chrome 插件的运行时错误和异常。

## 使用方式

```
/chplg:errors                  # 查看所有错误
/chplg:errors --last           # 仅看最后一个错误
/chplg:errors --limit 10       # 最近 10 个错误
/chplg:errors --extension <id> # 指定扩展
```

## 参数

- `--last` — 仅返回最后一个错误
- `--limit <n>` — 返回数量限制（默认 20）
- `--extension <id>` — 指定扩展 ID

## 执行步骤

### Step 1: 调用 MCP Tool

使用 MCP tool `chplg-devtools.get_errors` 获取错误。

### Step 2: 格式化输出

```
══════════════════════════════════════
  Chrome Extension Errors
══════════════════════════════════════

[1] TypeError: Cannot read property 'id' of undefined
    时间: 2026-01-26 10:23:47
    来源: service-worker.js:47
    扩展: Tab Manager

    堆栈:
      at handleGetAllTabs (service-worker.js:47:23)
      at chrome.runtime.onMessage (service-worker.js:24:7)

────────────────────────────────────────

[2] ReferenceError: storage is not defined
    时间: 2026-01-26 10:22:15
    来源: popup.js:89
    扩展: Tab Manager

    堆栈:
      at saveSettings (popup.js:89:5)
      at HTMLButtonElement.onclick (popup.js:34:3)

══════════════════════════════════════
总计: 2 个错误
══════════════════════════════════════
```

### Step 3: 智能分析

对每个错误提供：
- 错误类型解释
- 可能的原因
- 修复建议
- 相关文档链接

## 输出示例（带分析）

```
══════════════════════════════════════
  最新错误分析
══════════════════════════════════════

TypeError: Cannot read property 'id' of undefined

位置: service-worker.js:47
代码: const tabId = tab.id;

分析:
  这是一个常见的空值访问错误。变量 `tab` 在访问 `.id`
  属性时是 undefined。

可能原因:
  1. chrome.tabs.query() 返回空数组
  2. 异步操作中 tab 对象已被销毁
  3. 标签页在查询期间被关闭

修复建议:
  // 添加空值检查
  if (tab && tab.id) {
    const tabId = tab.id;
    // ...
  }

  // 或使用可选链
  const tabId = tab?.id;

══════════════════════════════════════
```

## 注意事项

- 错误包含完整的堆栈跟踪
- 默认最多保存 500 个错误
- 使用 `/chplg:logs --level error` 可以看到错误的上下文日志
