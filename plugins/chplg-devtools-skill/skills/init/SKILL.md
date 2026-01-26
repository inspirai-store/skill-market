---
name: init
description: "Chrome 插件项目初始化 - 脚手架生成、技术栈选择、manifest 配置"
---

# /chplg:init - 项目初始化

创建 Chrome 插件项目脚手架，支持多种技术栈，内置 Manifest V3 最佳实践。

## 使用方式

```
/chplg:init                      # 交互式初始化
/chplg:init my-extension         # 指定项目名称
/chplg:init --stack react        # 指定技术栈
/chplg:init --type popup         # 指定插件类型
```

## 参数

- `--stack <name>` — 技术栈（vanilla/react/vue/svelte），默认交互选择
- `--type <type>` — 插件类型（popup/sidebar/content-only/background-only）
- `--permissions <list>` — 预设权限，逗号分隔

## 执行步骤

### Step 1: 检查当前目录

```bash
# 检查是否已有 Chrome 插件项目
if [ -f "manifest.json" ] || [ -f ".chplg.yaml" ]; then
    echo "[WARN] 当前目录已存在 Chrome 插件项目"
    echo "[INFO] 如需重新初始化，请先备份或清理现有文件"
    exit 1
fi
```

### Step 2: 交互式收集信息

使用 `AskUserQuestion` 收集以下信息：

**问题 1: 插件名称**
- 如果命令行未指定，询问项目名称
- 验证名称格式（字母、数字、连字符）

**问题 2: 插件类型**
```
选择插件类型:
A) Popup - 点击图标弹出界面（最常见）
B) Side Panel - 侧边栏面板（Chrome 114+）
C) Content Script - 注入网页的脚本（无独立UI）
D) Background Only - 纯后台服务（无UI）
```

**问题 3: 技术栈**
```
选择技术栈:
A) Vanilla JS - 原生开发，轻量无依赖（推荐新手）
B) React - 适合复杂 UI
C) Vue - 适合复杂 UI
D) Svelte - 编译时框架，体积小
```

**问题 4: 常用权限**
```
选择需要的权限（可多选）:
A) storage - 本地数据存储
B) tabs - 标签页操作
C) activeTab - 当前标签页访问
D) contextMenus - 右键菜单
E) notifications - 系统通知
F) alarms - 定时任务
G) 暂不选择，稍后手动配置
```

### Step 3: 生成项目结构

根据选择生成对应的项目结构。

#### Vanilla JS 结构

```
{project-name}/
├── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── options/
│       ├── options.html
│       ├── options.css
│       └── options.js
├── assets/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── lib/
│   └── storage.js          # storage 工具封装
├── scripts/
│   └── build.js            # 打包脚本
├── .chplg.yaml             # 项目配置
├── .gitignore
└── README.md
```

#### React/Vue/Svelte 结构

```
{project-name}/
├── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── index.js
│   │   └── Content.{jsx|vue|svelte}
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.js
│   │   └── App.{jsx|vue|svelte}
│   ├── options/
│   │   ├── index.html
│   │   ├── index.js
│   │   └── App.{jsx|vue|svelte}
│   └── lib/
│       └── storage.js
├── assets/
│   └── icons/
├── vite.config.js          # Vite 构建配置
├── package.json
├── .chplg.yaml
├── .gitignore
└── README.md
```

### Step 4: 生成核心文件

#### manifest.json

```json
{
  "manifest_version": 3,
  "name": "{project-name}",
  "version": "1.0.0",
  "description": "A Chrome extension",
  "icons": {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "32": "assets/icons/icon-32.png"
    }
  },
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "permissions": [],
  "host_permissions": []
}
```

#### service-worker.js (最佳实践模板)

```javascript
// Service Worker - 事件驱动模式
// 注意: V3 的 Service Worker 会被休眠，不要依赖全局状态

// 安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // 初始化默认设置
    chrome.storage.local.set({ settings: {} });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// 消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理来自 popup/content script 的消息
  if (message.type === 'GET_DATA') {
    // 异步操作需要 return true
    handleGetData(message.payload).then(sendResponse);
    return true;
  }
});

async function handleGetData(payload) {
  // 业务逻辑
  return { success: true, data: null };
}
```

#### lib/storage.js (工具封装)

```javascript
// Storage 工具封装 - 简化 chrome.storage API 使用

export const storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async remove(key) {
    await chrome.storage.local.remove(key);
  },

  async getAll() {
    return await chrome.storage.local.get(null);
  },

  // 监听变化
  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
};
```

#### .chplg.yaml

```yaml
# Chrome 插件项目配置 - 由 /chplg:init 生成
name: {project-name}
version: 1.0.0
stack: {vanilla|react|vue|svelte}
type: {popup|sidebar|content-only|background-only}

features:
  - storage
  # ... 其他选择的权限

created_at: {timestamp}
```

#### .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/
*.zip

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

### Step 5: 框架特定配置

#### React (vite.config.js)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.js'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

#### package.json (框架项目)

```json
{
  "name": "{project-name}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "pack": "node scripts/pack.js"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### Step 6: 生成占位图标

使用简单的 SVG 生成占位图标，或提示用户替换：

```bash
# 创建占位图标提示
echo "请替换为实际图标文件" > assets/icons/README.md
```

也可以调用 `/gen:image` 生成图标（如果可用）。

### Step 7: 输出完成信息

```
✓ Chrome 插件项目初始化完成

项目结构:
  {project-name}/
  ├── manifest.json      # 插件配置
  ├── src/               # 源代码
  ├── assets/icons/      # 图标（需替换）
  └── .chplg.yaml        # 项目配置

下一步:
  1. cd {project-name}
  2. 替换 assets/icons/ 中的占位图标
  3. 在 Chrome 加载插件: chrome://extensions → 加载已解压的扩展程序
  4. 使用 /chplg:dev 获取开发指导
```

## 插件类型特殊处理

### Side Panel 类型

manifest.json 额外配置：
```json
{
  "side_panel": {
    "default_path": "src/sidepanel/sidepanel.html"
  },
  "permissions": ["sidePanel"]
}
```

### Content Script Only 类型

manifest.json 配置：
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"],
      "css": ["src/content/content.css"]
    }
  ]
}
```

不生成 popup 相关文件。

### Background Only 类型

仅生成 service-worker.js，不生成 UI 相关文件。

## 注意事项

- 生成的代码遵循 Manifest V3 规范
- Service Worker 模板已处理异步消息响应
- 权限遵循最小化原则，按需添加
- 图标需要用户自行替换或使用 `/gen:image` 生成
