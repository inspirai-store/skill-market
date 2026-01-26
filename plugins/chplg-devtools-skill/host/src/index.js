#!/usr/bin/env node

// chplg-devtools-host
// Native Messaging Host + MCP Server

import { NativeHost } from './native-host.js';
import { MCPServer } from './mcp-server.js';
import { DataStore } from './data-store.js';

const args = process.argv.slice(2);

// 共享数据存储
const dataStore = new DataStore();

// 判断运行模式
if (args.includes('--mcp')) {
  // MCP Server 模式 (被 Claude Code 调用)
  const mcpServer = new MCPServer(dataStore);
  mcpServer.start();
} else if (args.includes('--install')) {
  // 安装 Native Messaging Host
  import('./install.js').then(m => m.install());
} else if (args.includes('--setup-mcp')) {
  // 配置 Claude Code MCP
  import('./install.js').then(m => m.setupMCP());
} else {
  // Native Messaging Host 模式 (被 Chrome 扩展调用)
  const nativeHost = new NativeHost(dataStore);
  nativeHost.start();
}
