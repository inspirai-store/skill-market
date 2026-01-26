// MCP Server - 响应 Claude Code 的查询

export class MCPServer {
  constructor(dataStore) {
    this.dataStore = dataStore;
  }

  start() {
    // MCP 使用 stdin/stdout 通信 (JSON-RPC over stdio)
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;

      // 处理完整的 JSON-RPC 消息
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.handleRequest(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });

    // 发送初始化消息
    this.sendResponse({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'chplg-devtools',
          version: '1.0.0'
        },
        capabilities: {
          tools: {}
        }
      }
    });
  }

  // 发送响应
  sendResponse(response) {
    const json = JSON.stringify(response);
    process.stdout.write(json + '\n');
  }

  // 处理请求
  handleRequest(line) {
    let request;
    try {
      request = JSON.parse(line);
    } catch (error) {
      this.sendResponse({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' }
      });
      return;
    }

    const { id, method, params } = request;

    switch (method) {
      case 'initialize':
        this.sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'chplg-devtools',
              version: '1.0.0'
            },
            capabilities: {
              tools: {}
            }
          }
        });
        break;

      case 'tools/list':
        this.sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.getToolDefinitions()
          }
        });
        break;

      case 'tools/call':
        this.handleToolCall(id, params);
        break;

      case 'notifications/initialized':
        // 客户端初始化完成，不需要响应
        break;

      default:
        this.sendResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  }

  // 获取工具定义
  getToolDefinitions() {
    return [
      {
        name: 'get_logs',
        description: 'Get console logs from monitored Chrome extensions',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['debug', 'info', 'warn', 'error'],
              description: 'Filter by log level'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of logs to return (default: 50)'
            },
            since: {
              type: 'string',
              description: 'Time filter, e.g., "5m", "1h", "30s"'
            },
            search: {
              type: 'string',
              description: 'Search in log messages'
            },
            extensionId: {
              type: 'string',
              description: 'Filter by extension ID'
            }
          }
        }
      },
      {
        name: 'get_errors',
        description: 'Get errors from monitored Chrome extensions',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of errors to return (default: 20)'
            },
            extensionId: {
              type: 'string',
              description: 'Filter by extension ID'
            }
          }
        }
      },
      {
        name: 'get_network',
        description: 'Get network requests from monitored Chrome extensions',
        inputSchema: {
          type: 'object',
          properties: {
            urlPattern: {
              type: 'string',
              description: 'Filter by URL pattern (regex)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of requests to return (default: 50)'
            },
            extensionId: {
              type: 'string',
              description: 'Filter by extension ID'
            }
          }
        }
      },
      {
        name: 'get_status',
        description: 'Get DevTools connection status and statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'clear_logs',
        description: 'Clear all collected logs and errors',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  // 处理工具调用
  handleToolCall(id, params) {
    const { name, arguments: args = {} } = params;

    let result;
    try {
      switch (name) {
        case 'get_logs':
          result = this.dataStore.getLogs({
            level: args.level,
            limit: args.limit || 50,
            since: args.since,
            search: args.search,
            extensionId: args.extensionId
          });
          break;

        case 'get_errors':
          result = this.dataStore.getErrors({
            limit: args.limit || 20,
            extensionId: args.extensionId
          });
          break;

        case 'get_network':
          result = this.dataStore.getNetworkRequests({
            urlPattern: args.urlPattern,
            limit: args.limit || 50,
            extensionId: args.extensionId
          });
          break;

        case 'get_status':
          result = this.dataStore.getStatus();
          break;

        case 'clear_logs':
          this.dataStore.clearLogs();
          result = { success: true, message: 'Logs cleared' };
          break;

        default:
          this.sendResponse({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Unknown tool: ${name}` }
          });
          return;
      }

      this.sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      });
    } catch (error) {
      this.sendResponse({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: error.message }
      });
    }
  }
}
