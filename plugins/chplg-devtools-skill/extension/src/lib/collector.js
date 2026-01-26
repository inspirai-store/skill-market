// 数据收集器 - 存储和管理调试数据

export class DataCollector {
  constructor(options = {}) {
    this.maxLogs = options.maxLogs || 1000;
    this.maxErrors = options.maxErrors || 100;
    this.maxNetworkRequests = options.maxNetworkRequests || 500;

    this.logs = [];
    this.errors = [];
    this.networkRequests = new Map();
    this.completedNetworkRequests = [];

    this.stats = {
      totalLogs: 0,
      totalErrors: 0,
      totalNetworkRequests: 0,
      startTime: Date.now()
    };
  }

  // 添加日志
  addLog(entry) {
    this.logs.push(entry);
    this.stats.totalLogs++;

    // 如果是错误级别，也添加到错误列表
    if (entry.level === 'error') {
      this.addError(entry);
    }

    // 保持最大数量限制
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  // 添加错误
  addError(entry) {
    this.errors.push(entry);
    this.stats.totalErrors++;

    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  // 添加网络请求
  addNetworkRequest(entry) {
    this.networkRequests.set(entry.id, entry);
    this.stats.totalNetworkRequests++;
  }

  // 更新网络请求
  updateNetworkRequest(requestId, updates) {
    const request = this.networkRequests.get(requestId);
    if (request) {
      Object.assign(request, updates);
    }
  }

  // 获取网络请求
  getNetworkRequest(requestId) {
    return this.networkRequests.get(requestId);
  }

  // 完成网络请求
  completeNetworkRequest(requestId) {
    const request = this.networkRequests.get(requestId);
    if (request) {
      this.completedNetworkRequests.push(request);
      this.networkRequests.delete(requestId);

      if (this.completedNetworkRequests.length > this.maxNetworkRequests) {
        this.completedNetworkRequests.shift();
      }
    }
    return request;
  }

  // 获取日志
  getLogs(params = {}) {
    let result = [...this.logs];

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
        log.source.toLowerCase().includes(searchLower)
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
    let result = [...this.errors];

    if (params.extensionId) {
      result = result.filter(err => err.extensionId === params.extensionId);
    }

    if (params.limit) {
      result = result.slice(-params.limit);
    }

    if (params.last) {
      return result.slice(-1);
    }

    return result;
  }

  // 获取网络请求
  getNetworkRequests(params = {}) {
    let result = [...this.completedNetworkRequests];

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
    return {
      logsCount: this.logs.length,
      errorsCount: this.errors.length,
      networkRequestsCount: this.completedNetworkRequests.length,
      pendingNetworkRequests: this.networkRequests.size,
      stats: {
        ...this.stats,
        uptime: Date.now() - this.stats.startTime
      }
    };
  }

  // 清空日志
  clearLogs() {
    this.logs = [];
    this.errors = [];
    this.stats.totalLogs = 0;
    this.stats.totalErrors = 0;
  }

  // 清空所有数据
  clearAll() {
    this.clearLogs();
    this.networkRequests.clear();
    this.completedNetworkRequests = [];
    this.stats.totalNetworkRequests = 0;
  }

  // 解析时间参数 (如 "5m", "1h", "30s")
  parseTimeParam(timeStr) {
    if (typeof timeStr === 'number') return timeStr;

    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return Date.now();

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
}
