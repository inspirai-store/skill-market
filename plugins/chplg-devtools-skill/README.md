# Chplg DevTools

Chrome 插件调试工具 - 通过 MCP 让 Claude Code 获取插件的实时日志、错误和状态。

## 架构

```
Chrome 扩展 ←→ Native Messaging ←→ MCP Server ←→ Claude Code
```

## 组件

| 组件 | 目录 | 说明 |
|------|------|------|
| Chrome 扩展 | `extension/` | 收集目标插件的日志、错误、网络请求 |
| Native Host | `host/` | 接收扩展数据，提供 MCP Server |
| Skills | `skills/` | Claude Code 命令 `/chplg:logs` 等 |

## 安装

### 1. 安装 Chrome 扩展

```bash
# 开发模式
1. 打开 chrome://extensions
2. 启用开发者模式
3. 点击"加载已解压的扩展程序"
4. 选择 extension/ 目录
5. 复制扩展 ID
```

### 2. 安装 Native Host

```bash
cd host
npm install
npm run install-host

# 更新配置文件中的扩展 ID
# macOS: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chplg.devtools.json
# 将 EXTENSION_ID_PLACEHOLDER 替换为实际的扩展 ID
```

### 3. 配置 Claude Code MCP

```bash
node host/install.js setup-mcp
# 重启 Claude Desktop
```

## 使用

### 在 Chrome 中

1. 打开目标插件的 DevTools (F12)
2. 切换到 "Chplg DevTools" 面板
3. 点击 "Attach" 附加到要调试的扩展

### 在 Claude Code 中

```bash
/chplg:logs                    # 查看日志
/chplg:logs --level error      # 仅看错误
/chplg:logs --since 5m         # 最近 5 分钟

/chplg:errors                  # 查看错误详情
/chplg:errors --last           # 最后一个错误

/chplg:status                  # 连接状态
/chplg:status --storage        # 查看 storage
```

## 功能

- ✅ 实时日志收集（console.log/warn/error）
- ✅ 错误捕获（含堆栈跟踪）
- ✅ 网络请求监控
- ✅ Storage 数据查看
- ✅ DevTools 面板 UI
- ✅ MCP 集成

## 开发

```bash
# 扩展开发
cd extension
# 修改后在 chrome://extensions 重新加载

# Native Host 开发
cd host
npm start              # 运行 Native Host
npm start -- --mcp     # 运行 MCP Server
```

## License

MIT
