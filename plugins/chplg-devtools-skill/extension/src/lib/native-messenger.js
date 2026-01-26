// Native Messaging 通信封装

export class NativeMessenger {
  constructor(hostName) {
    this.hostName = hostName;
    this.port = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  // 连接到 Native Host
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = chrome.runtime.connectNative(this.hostName);

        this.port.onMessage.addListener((message) => {
          this.handleMessage(message);
        });

        this.port.onDisconnect.addListener(() => {
          this.handleDisconnect();
        });

        this.connected = true;
        this.reconnectAttempts = 0;
        console.log(`[NativeMessenger] Connected to ${this.hostName}`);
        resolve(true);
      } catch (error) {
        console.error(`[NativeMessenger] Connection failed:`, error);
        reject(error);
      }
    });
  }

  // 断开连接处理
  handleDisconnect() {
    const lastError = chrome.runtime.lastError;
    console.log(`[NativeMessenger] Disconnected:`, lastError?.message || 'Unknown reason');

    this.connected = false;
    this.port = null;

    // 尝试重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[NativeMessenger] Reconnecting... (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.error(`[NativeMessenger] Max reconnect attempts reached`);
    }
  }

  // 处理收到的消息
  handleMessage(message) {
    console.log(`[NativeMessenger] Received:`, message);

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  // 发送消息
  send(type, data) {
    if (!this.connected || !this.port) {
      console.warn(`[NativeMessenger] Not connected, cannot send message`);
      return false;
    }

    try {
      this.port.postMessage({
        type,
        data,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error(`[NativeMessenger] Send failed:`, error);
      return false;
    }
  }

  // 注册消息处理器
  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  // 移除消息处理器
  off(type) {
    this.messageHandlers.delete(type);
  }

  // 检查连接状态
  isConnected() {
    return this.connected;
  }

  // 断开连接
  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
      this.connected = false;
    }
  }
}
