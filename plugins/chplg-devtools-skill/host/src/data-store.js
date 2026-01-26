// 数据存储 - 使用文件在 Native Host 和 MCP Server 之间共享数据

import fs from 'fs';
import path from 'path';
import os from 'os';

// 使用固定路径确保 Native Host 和 MCP Server 共享同一文件
const DATA_DIR = path.join(os.homedir(), '.chplg-devtools');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

export class DataStore {
  constructor(options = {}) {
    this.maxLogs = options.maxLogs || 2000;
    this.maxErrors = options.maxErrors || 500;
    this.maxNetworkRequests = options.maxNetworkRequests || 1000;

    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 加载或初始化数据
    this.data = this.load();
  }

  // 从文件加载数据
  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      // 文件损坏，重新初始化
    }

    return {
      logs: [],
      errors: [],
      networkRequests: [],
      stats: {
        totalLogs: 0,
        totalErrors: 0,
        totalNetworkRequests: 0,
        startTime: Date.now()
      },
      extensionConnected: false,
      lastMessageTime: null
    };
  }

  // 保存数据到文件
  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data), 'utf8');
    } catch (error) {
      console.error('[DataStore] Failed to save:', error.message);
    }
  }

  // 添加日志
  addLog(entry) {
    this.data.logs.push(entry);
    this.data.stats.totalLogs++;

    if (this.data.logs.length > this.maxLogs) {
      this.data.logs.shift();
    }

    // 如果是错误，同时添加到错误列表
    if (entry.level === 'error') {
      this.addError(entry);
    }

    this.save();
  }

  // 添加错误
  addError(entry) {
    this.data.errors.push(entry);
    this.data.stats.totalErrors++;

    if (this.data.errors.length > this.maxErrors) {
      this.data.errors.shift();
    }

    this.save();
  }

  // 添加网络请求
  addNetworkRequest(entry) {
    this.data.networkRequests.push(entry);
    this.data.stats.totalNetworkRequests++;

    if (this.data.networkRequests.length > this.maxNetworkRequests) {
      this.data.networkRequests.shift();
    }

    this.save();
  }

  // 获取日志 (每次读取最新数据)
  getLogs(params = {}) {
    this.data = this.load();
    let result = [...this.data.logs];

    // 按级别过滤
    if (params.level) {
      const levels = Array.isArray(params.level) ? params.level : [params.level];
      result = result.filter(log => levels.includes(log.level));
    }

    // 按时间过滤
    if (params.since) {
      const sinceTime = this.parseTimeParam(params.since);
      result = result.filter(log => log.timestamp >= sinceTime);
    }

    // 按扩展过滤
    if (params.extensionId) {
      result = result.filter(log => log.extensionId === params.extensionId);
    }

    // 按关键词搜索
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      result = result.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.source?.toLowerCase().includes(searchLower)
      );
    }

    // 限制数量
    if (params.limit) {
      result = result.slice(-params.limit);
    }

    return result;
  }

  // 获取错误
  getErrors(params = {}) {
    this.data = this.load();
    let result = [...this.data.errors];

    if (params.extensionId) {
      result = result.filter(err => err.extensionId === params.extensionId);
    }

    if (params.limit) {
      result = result.slice(-params.limit);
    }

    return result;
  }

  // 获取网络请求
  getNetworkRequests(params = {}) {
    this.data = this.load();
    let result = [...this.data.networkRequests];

    if (params.urlPattern) {
      const pattern = new RegExp(params.urlPattern, 'i');
      result = result.filter(req => pattern.test(req.url));
    }

    if (params.extensionId) {
      result = result.filter(req => req.extensionId === params.extensionId);
    }

    if (params.limit) {
      result = result.slice(-params.limit);
    }

    return result;
  }

  // 获取状态
  getStatus() {
    this.data = this.load();
    return {
      extensionConnected: this.data.extensionConnected,
      lastMessageTime: this.data.lastMessageTime,
      logsCount: this.data.logs.length,
      errorsCount: this.data.errors.length,
      networkRequestsCount: this.data.networkRequests.length,
      stats: {
        ...this.data.stats,
        uptime: Date.now() - this.data.stats.startTime
      }
    };
  }

  // 清空日志
  clearLogs() {
    this.data.logs = [];
    this.data.errors = [];
    this.data.stats.totalLogs = 0;
    this.data.stats.totalErrors = 0;
    this.save();
  }

  // 清空所有数据
  clearAll() {
    this.clearLogs();
    this.data.networkRequests = [];
    this.data.stats.totalNetworkRequests = 0;
    this.save();
  }

  // 解析时间参数
  parseTimeParam(timeStr) {
    if (typeof timeStr === 'number') return timeStr;

    const match = String(timeStr).match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    return Date.now() - (value * multipliers[unit]);
  }

  // 更新连接状态
  setExtensionConnected(connected) {
    this.data.extensionConnected = connected;
    if (connected) {
      this.data.lastMessageTime = Date.now();
    }
    this.save();
  }

  // 更新最后消息时间
  updateLastMessageTime() {
    this.data.lastMessageTime = Date.now();
    this.save();
  }
}
