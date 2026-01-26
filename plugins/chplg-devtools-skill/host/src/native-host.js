// Native Messaging Host - 与 Chrome 扩展通信

export class NativeHost {
  constructor(dataStore) {
    this.dataStore = dataStore;
    this.buffer = Buffer.alloc(0);
  }

  start() {
    // Native Messaging 使用 stdin/stdout (二进制模式)
    process.stdin.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.processBuffer();
    });

    process.stdin.on('end', () => {
      this.dataStore.setExtensionConnected(false);
      process.exit(0);
    });

    process.stdin.on('error', (err) => {
      console.error('[NativeHost] stdin error:', err);
    });

    // 标记扩展已连接
    this.dataStore.setExtensionConnected(true);
  }

  // 处理缓冲区中的消息
  processBuffer() {
    while (this.buffer.length >= 4) {
      // 读取 4 字节的消息长度
      const length = this.buffer.readUInt32LE(0);

      if (length === 0 || length > 1024 * 1024) {
        // 无效长度，重置
        this.buffer = Buffer.alloc(0);
        return;
      }

      // 检查是否有完整消息
      if (this.buffer.length < 4 + length) {
        // 等待更多数据
        return;
      }

      // 提取消息
      const messageBuffer = this.buffer.slice(4, 4 + length);
      this.buffer = this.buffer.slice(4 + length);

      try {
        const message = JSON.parse(messageBuffer.toString('utf8'));
        this.handleMessage(message);
      } catch (error) {
        console.error('[NativeHost] Failed to parse message:', error);
      }
    }
  }

  // 发送消息
  sendMessage(message) {
    const json = JSON.stringify(message);
    const buffer = Buffer.from(json, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(buffer.length, 0);

    process.stdout.write(lengthBuffer);
    process.stdout.write(buffer);
  }

  // 处理消息
  handleMessage(message) {
    this.dataStore.updateLastMessageTime();

    switch (message.type) {
      case 'INIT':
        // 扩展初始化
        this.sendMessage({ type: 'INIT_ACK', version: '1.0.0' });
        break;

      case 'LOG':
        // 收到日志
        this.dataStore.addLog(message.data);
        break;

      case 'ERROR':
        // 收到错误
        this.dataStore.addError(message.data);
        break;

      case 'NETWORK':
        // 收到网络请求
        this.dataStore.addNetworkRequest(message.data);
        break;

      case 'LOGS_RESULT':
      case 'ERRORS_RESULT':
      case 'STATUS_RESULT':
      case 'CLEAR_RESULT':
        // 这些是扩展响应 MCP 查询的结果，转发给等待的请求
        // (在完整实现中需要处理请求/响应匹配)
        break;

      default:
        console.error('[NativeHost] Unknown message type:', message.type);
    }
  }

  // 查询日志 (供 MCP Server 调用)
  queryLogs(params) {
    return this.dataStore.getLogs(params);
  }

  // 查询错误
  queryErrors(params) {
    return this.dataStore.getErrors(params);
  }

  // 查询状态
  queryStatus() {
    return this.dataStore.getStatus();
  }
}
