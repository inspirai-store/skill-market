// DevTools Panel 逻辑

class DevToolsPanel {
  constructor() {
    this.currentTab = 'logs';
    this.logs = [];
    this.errors = [];
    this.extensions = [];
    this.attachedExtensions = new Set();

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadExtensions();
    this.updateStatus();
    this.startPolling();
  }

  bindEvents() {
    // Tab 切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // 过滤和搜索
    document.getElementById('levelFilter').addEventListener('change', () => this.renderLogs());
    document.getElementById('searchInput').addEventListener('input', () => this.renderLogs());

    // 按钮
    document.getElementById('clearBtn').addEventListener('click', () => this.clearLogs());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    document.getElementById(`${tabName}Tab`).style.display = 'block';

    if (tabName === 'extensions') {
      this.loadExtensions();
    }
  }

  async loadExtensions() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_EXTENSIONS' });
    this.extensions = response || [];
    this.renderExtensions();
  }

  renderExtensions() {
    const container = document.getElementById('extensionList');

    if (this.extensions.length === 0) {
      container.innerHTML = '<div class="empty-state">No extensions found</div>';
      return;
    }

    container.innerHTML = this.extensions.map(ext => `
      <div class="extension-item">
        <div>
          <div class="extension-name">${ext.name}</div>
          <div class="extension-id">${ext.id}</div>
        </div>
        <button class="btn ${this.attachedExtensions.has(ext.id) ? 'danger' : ''}"
                data-action="${this.attachedExtensions.has(ext.id) ? 'detach' : 'attach'}"
                data-id="${ext.id}">
          ${this.attachedExtensions.has(ext.id) ? 'Detach' : 'Attach'}
        </button>
      </div>
    `).join('');

    // 绑定按钮事件
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'attach') {
          await chrome.runtime.sendMessage({ type: 'ATTACH_EXTENSION', extensionId: id });
          this.attachedExtensions.add(id);
        } else {
          await chrome.runtime.sendMessage({ type: 'DETACH_EXTENSION', extensionId: id });
          this.attachedExtensions.delete(id);
        }

        this.renderExtensions();
      });
    });
  }

  async updateStatus() {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (status?.nativeConnected) {
      dot.classList.add('connected');
      text.textContent = 'Connected';
    } else {
      dot.classList.remove('connected');
      text.textContent = 'Disconnected';
    }

    if (status?.attachedExtensions) {
      this.attachedExtensions = new Set(status.attachedExtensions);
    }
  }

  async loadLogs() {
    this.logs = await chrome.runtime.sendMessage({ type: 'GET_LOGS', params: { limit: 500 } });
    this.renderLogs();
  }

  async loadErrors() {
    this.errors = await chrome.runtime.sendMessage({ type: 'GET_ERRORS', params: { limit: 100 } });
    this.renderErrors();
  }

  renderLogs() {
    const container = document.getElementById('logList');
    let logs = this.logs || [];

    // 过滤
    const level = document.getElementById('levelFilter').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (search) {
      logs = logs.filter(log =>
        log.message.toLowerCase().includes(search) ||
        log.source.toLowerCase().includes(search)
      );
    }

    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state">No logs</div>';
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="log-entry">
        <span class="log-time">${this.formatTime(log.timestamp)}</span>
        <span class="log-level ${log.level}">${log.level}</span>
        <span class="log-source" title="${log.source}">${this.formatSource(log.source)}</span>
        <span class="log-message">${this.escapeHtml(log.message)}</span>
      </div>
    `).join('');

    // 滚动到底部
    container.scrollTop = container.scrollHeight;
  }

  renderErrors() {
    const container = document.getElementById('errorList');

    if (!this.errors || this.errors.length === 0) {
      container.innerHTML = '<div class="empty-state">No errors</div>';
      return;
    }

    container.innerHTML = this.errors.map(err => `
      <div class="log-entry">
        <span class="log-time">${this.formatTime(err.timestamp)}</span>
        <span class="log-level error">${err.type || 'Error'}</span>
        <span class="log-source" title="${err.source}">${this.formatSource(err.source)}</span>
        <span class="log-message">${this.escapeHtml(err.message)}${err.stack ? '\n' + err.stack : ''}</span>
      </div>
    `).join('');
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  }

  formatSource(source) {
    if (!source) return 'unknown';
    const parts = source.split('/');
    return parts[parts.length - 1];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async clearLogs() {
    await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
    this.logs = [];
    this.errors = [];
    this.renderLogs();
    this.renderErrors();
  }

  async refresh() {
    await this.updateStatus();
    await this.loadLogs();
    await this.loadErrors();
  }

  startPolling() {
    // 定期刷新日志
    setInterval(() => {
      if (this.currentTab === 'logs') {
        this.loadLogs();
      } else if (this.currentTab === 'errors') {
        this.loadErrors();
      }
      this.updateStatus();
    }, 2000);
  }
}

// 初始化
new DevToolsPanel();
