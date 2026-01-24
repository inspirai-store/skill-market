---
name: logs
description: "微信小程序实时日志监听 - console 输出和网络请求"
---

# /wxm:logs - 实时日志监听

监听微信小程序的 console 日志和网络请求。

## 使用方式

```
/wxm:logs                    # 实时 console 日志
/wxm:logs --filter error     # 只显示错误日志
/wxm:logs --filter warn      # 只显示警告
/wxm:logs --network          # 网络请求日志
```

## 执行步骤

### Step 1: 加载环境

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/utils/config.sh"
source "$PLUGIN_DIR/core/websocket.sh"
```

### Step 2: 连接 WebSocket

```bash
wxm_websocket_logs "$FILTER"
```

- 连接微信开发者工具的 WebSocket 调试接口
- 实时输出日志（Ctrl+C 停止）

### 日志过滤

| 参数 | 说明 |
|------|------|
| 无 | 所有 console 输出 |
| `--filter error` | 仅 console.error |
| `--filter warn` | 仅 console.warn |
| `--network` | 网络请求（URL、状态码、耗时） |

## 输出格式

```
[14:35:02] [LOG] Page onLoad: pages/index/index
[14:35:02] [LOG] Data loaded: 42 items
[14:35:03] [ERROR] Request failed: /api/user/info - 401
[14:35:04] [WARN] Deprecated API: wx.getUserInfo
```

## 依赖

- `wscat`（WebSocket 客户端）
  ```bash
  npm install -g wscat
  ```

## 注意事项

- 需要微信开发者工具已开启服务端口
- 日志量可能较大，建议使用 filter 过滤
- 网络模式下只显示 wx.request 发起的请求
