---
name: dev
description: "Chrome 插件开发指导 - API 使用、调试技巧、最佳实践问答"
---

# /chplg:dev - 开发指导

交互式开发指导，根据当前项目上下文和具体问题提供针对性帮助。

## 使用方式

```
/chplg:dev                           # 交互式问答
/chplg:dev 如何在 popup 和 background 之间通信
/chplg:dev storage 数据如何持久化
/chplg:dev --topic messaging         # 指定主题
```

## 参数

- `--topic <name>` — 指定主题（messaging/storage/permissions/network/dom/debug）

## 执行步骤

### Step 1: 读取项目上下文

```bash
# 检查项目配置
if [ -f ".chplg.yaml" ]; then
    CONFIG=$(cat .chplg.yaml)
    STACK=$(yq '.stack' .chplg.yaml)
    TYPE=$(yq '.type' .chplg.yaml)
fi

# 读取 manifest
if [ -f "manifest.json" ]; then
    MANIFEST=$(cat manifest.json)
    PERMISSIONS=$(jq '.permissions' manifest.json)
fi
```

如果没有找到项目文件：
```
[WARN] 未检测到 Chrome 插件项目
[INFO] 请先运行 /chplg:init 初始化项目，或在项目目录中执行此命令
```

### Step 2: 确定用户需求

如果用户没有指定问题，使用 `AskUserQuestion`：

```
当前项目: {name} ({stack}, {type})

你想了解什么？
A) 消息通信 - popup/content/background 之间如何通信
B) 数据存储 - storage API 使用和最佳实践
C) 权限管理 - 权限声明和运行时请求
D) 网络请求 - 从插件发起请求的正确方式
E) DOM 操作 - Content Script 操作页面的技巧
F) 调试技巧 - Service Worker 和插件调试方法
G) 其他问题 - 描述你的具体问题
```

### Step 3: 按主题提供指导

---

## 主题: 消息通信 (messaging)

### 核心概念

Chrome 插件有三个主要上下文，它们之间通过消息通信：

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Popup     │ ←→  │  Service Worker  │ ←→  │ Content Script │
│  (短生命周期)│     │   (Background)   │     │  (注入网页)    │
└─────────────┘     └──────────────────┘     └────────────────┘
```

### Popup ↔ Background 通信

**从 Popup 发送消息:**
```javascript
// popup.js
async function sendToBackground(type, payload) {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload });
    return response;
  } catch (error) {
    console.error('Communication error:', error);
  }
}

// 使用示例
const data = await sendToBackground('GET_USER_DATA', { userId: 123 });
```

**Background 接收并响应:**
```javascript
// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_USER_DATA') {
    // 异步处理必须 return true
    getUserData(message.payload.userId)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // 保持消息通道开启
  }
});
```

### Content Script ↔ Background 通信

**从 Content Script 发送:**
```javascript
// content.js
chrome.runtime.sendMessage({ type: 'PAGE_INFO', payload: {
  url: window.location.href,
  title: document.title
}});
```

**Background 识别发送者:**
```javascript
// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // sender.tab 存在说明来自 Content Script
  if (sender.tab) {
    console.log('Message from tab:', sender.tab.id, sender.tab.url);
  }
});
```

### Background → Content Script 通信

**向特定标签页发送:**
```javascript
// service-worker.js
async function sendToTab(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    // 标签页可能没有 Content Script
    console.error('Tab communication error:', error);
  }
}

// 向当前活动标签页发送
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab?.id) {
  await sendToTab(tab.id, { type: 'HIGHLIGHT', selector: '.target' });
}
```

### 常见错误

**错误 1: 异步响应未返回 true**
```javascript
// ❌ 错误
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then(sendResponse); // sendResponse 在异步完成前已失效
});

// ✓ 正确
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then(sendResponse);
  return true; // 保持通道开启
});
```

**错误 2: Popup 关闭后无法接收响应**
```javascript
// Popup 随时可能关闭，不要依赖长时间异步响应
// 使用 storage 作为状态中转
chrome.storage.local.set({ pendingResult: result });
```

---

## 主题: 数据存储 (storage)

### 存储类型对比

| 类型 | 容量 | 同步 | 场景 |
|------|------|------|------|
| `storage.local` | 10MB | 否 | 本地大量数据 |
| `storage.sync` | 100KB | 是 | 跨设备同步的设置 |
| `storage.session` | 10MB | 否 | 会话级临时数据 |

### 基础用法

```javascript
// 存储
await chrome.storage.local.set({
  user: { name: 'Alex', id: 1 },
  settings: { theme: 'dark' }
});

// 读取
const { user, settings } = await chrome.storage.local.get(['user', 'settings']);

// 读取全部
const all = await chrome.storage.local.get(null);

// 删除
await chrome.storage.local.remove('user');

// 清空
await chrome.storage.local.clear();
```

### 监听变化

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${areaName}.${key} changed:`, oldValue, '→', newValue);
  }
});
```

### 最佳实践: 封装 Storage

```javascript
// lib/storage.js
class StorageManager {
  constructor(area = 'local') {
    this.storage = chrome.storage[area];
  }

  async get(key, defaultValue = null) {
    const result = await this.storage.get(key);
    return result[key] ?? defaultValue;
  }

  async set(key, value) {
    await this.storage.set({ [key]: value });
  }

  async update(key, updater) {
    const current = await this.get(key, {});
    const updated = typeof updater === 'function'
      ? updater(current)
      : { ...current, ...updater };
    await this.set(key, updated);
  }

  async remove(key) {
    await this.storage.remove(key);
  }
}

export const localStorage = new StorageManager('local');
export const syncStorage = new StorageManager('sync');
```

### 存储限制处理

```javascript
async function safeSet(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    if (error.message.includes('QUOTA_BYTES')) {
      console.error('Storage quota exceeded');
      // 清理旧数据或提示用户
    }
    throw error;
  }
}
```

---

## 主题: 权限管理 (permissions)

### 权限类型

**声明式权限** (manifest.json):
```json
{
  "permissions": ["storage", "tabs", "alarms"],
  "host_permissions": ["https://*.example.com/*"]
}
```

**可选权限** (运行时请求):
```json
{
  "optional_permissions": ["bookmarks", "history"],
  "optional_host_permissions": ["https://*/*.com/*"]
}
```

### 运行时请求权限

```javascript
// 检查权限
const hasPermission = await chrome.permissions.contains({
  permissions: ['bookmarks']
});

// 请求权限（必须由用户手势触发）
async function requestBookmarksAccess() {
  const granted = await chrome.permissions.request({
    permissions: ['bookmarks']
  });

  if (granted) {
    console.log('Permission granted');
  } else {
    console.log('Permission denied');
  }
}

// 移除权限
await chrome.permissions.remove({ permissions: ['bookmarks'] });
```

### 最小权限原则

```javascript
// ❌ 过度权限
"permissions": ["tabs", "<all_urls>"]

// ✓ 按需权限
"permissions": ["activeTab"]  // 只在用户点击时获取当前标签页权限
```

### activeTab vs tabs

| 权限 | 能力 | 适用场景 |
|------|------|----------|
| `activeTab` | 用户点击时临时获取当前标签页 | 大多数场景 |
| `tabs` | 读取所有标签页 URL 和标题 | 标签页管理器 |

---

## 主题: 网络请求 (network)

### 从 Background 发请求

```javascript
// service-worker.js
async function fetchAPI(endpoint) {
  const response = await fetch(`https://api.example.com${endpoint}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
```

### 从 Content Script 发请求

Content Script 受页面 CSP 限制，推荐通过 Background 中转：

```javascript
// content.js
const data = await chrome.runtime.sendMessage({
  type: 'FETCH_API',
  payload: { endpoint: '/users' }
});

// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_API') {
    fetchAPI(message.payload.endpoint).then(sendResponse);
    return true;
  }
});
```

### 处理 CORS

在 manifest.json 声明 host_permissions：
```json
{
  "host_permissions": ["https://api.example.com/*"]
}
```

---

## 主题: DOM 操作 (dom)

### Content Script 注入时机

```json
// manifest.json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"  // 默认，DOM 完成后
    // "run_at": "document_start"  // DOM 解析前
    // "run_at": "document_end"    // DOM 解析完成
  }]
}
```

### 安全的 DOM 操作

```javascript
// 使用 Shadow DOM 隔离样式
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'closed' });
shadow.innerHTML = `
  <style>
    .my-extension { /* 样式不会泄露到页面 */ }
  </style>
  <div class="my-extension">Extension UI</div>
`;
document.body.appendChild(host);
```

### 监听 DOM 变化

```javascript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      // 处理新增节点
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processNewElement(node);
        }
      });
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

---

## 主题: 调试技巧 (debug)

### Service Worker 调试

1. 打开 `chrome://extensions`
2. 找到你的插件，点击 "Service Worker" 链接
3. 在 DevTools 中调试

### 查看 Service Worker 状态

```javascript
// 在 DevTools Console 中
chrome.runtime.getBackgroundPage(page => console.log(page));
// V3 中此 API 不可用，使用 DevTools 直接调试
```

### 强制唤醒 Service Worker

```javascript
// 发送消息会唤醒休眠的 Service Worker
chrome.runtime.sendMessage({ type: 'PING' });
```

### 常见调试命令

```javascript
// 查看所有 storage 数据
chrome.storage.local.get(null, console.log);

// 查看当前权限
chrome.permissions.getAll(console.log);

// 查看所有标签页
chrome.tabs.query({}, console.log);
```

### 日志最佳实践

```javascript
// 使用统一的日志前缀
const log = (...args) => console.log('[MyExtension]', ...args);
const error = (...args) => console.error('[MyExtension]', ...args);

// 开发环境开关
const DEBUG = true;
const debug = (...args) => DEBUG && console.log('[MyExtension:DEBUG]', ...args);
```

---

## 交互响应模式

根据用户提问，提供：

1. **概念解释** — 简明扼要说明原理
2. **代码示例** — 可直接使用的代码片段
3. **常见错误** — 提前避坑
4. **项目适配** — 根据当前项目配置给出针对性建议

询问用户是否需要：
- 将代码写入项目
- 了解更多相关内容
- 解答其他问题
