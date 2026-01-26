---
name: test
description: "Chrome 插件测试策略 - 单元测试、E2E 测试、手动测试清单"
---

# /chplg:test - 测试策略

根据项目情况生成测试配置和测试用例，覆盖单元测试、集成测试和手动测试。

## 使用方式

```
/chplg:test                      # 交互式选择测试类型
/chplg:test --unit               # 配置单元测试
/chplg:test --e2e                # 配置 E2E 测试
/chplg:test --checklist          # 生成手动测试清单
/chplg:test --all                # 完整测试方案
```

## 参数

- `--unit` — 配置单元测试（Jest/Vitest）
- `--e2e` — 配置 E2E 测试（Playwright）
- `--checklist` — 生成手动测试清单
- `--all` — 配置完整测试方案

## 执行步骤

### Step 1: 检查项目配置

```bash
# 读取项目配置
if [ ! -f ".chplg.yaml" ]; then
    echo "[WARN] 未检测到 Chrome 插件项目"
    echo "[INFO] 请先运行 /chplg:init 初始化项目"
    exit 1
fi

STACK=$(yq '.stack' .chplg.yaml)
TYPE=$(yq '.type' .chplg.yaml)
```

### Step 2: 选择测试类型

使用 `AskUserQuestion`：

```
当前项目: {name} ({stack})

选择要配置的测试类型（可多选）:
A) 单元测试 - 测试工具函数和业务逻辑（推荐）
B) E2E 测试 - 自动化测试完整插件行为
C) 手动测试清单 - 生成上架前验收检查表
D) 全部配置
```

---

## 单元测试配置

### 框架选择

| 技术栈 | 推荐框架 | 理由 |
|--------|----------|------|
| Vanilla JS | Jest | 生态成熟，零配置 |
| React | Vitest | 与 Vite 集成好 |
| Vue | Vitest | 与 Vite 集成好 |
| Svelte | Vitest | 与 Vite 集成好 |

### Jest 配置 (Vanilla JS)

**jest.config.js:**
```javascript
export default {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

**tests/setup.js (Chrome API Mock):**
```javascript
// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://mock-id/${path}`)
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue()
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  permissions: {
    contains: jest.fn().mockResolvedValue(false),
    request: jest.fn().mockResolvedValue(false)
  }
};
```

**package.json 添加:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

### Vitest 配置 (React/Vue/Svelte)

**vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // 或 vue/svelte 插件

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}']
  }
});
```

**tests/setup.js:**
```javascript
import { vi } from 'vitest';

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    },
    onInstalled: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue()
    },
    onChanged: {
      addListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn()
  }
};
```

### 示例测试用例

**tests/storage.test.js:**
```javascript
import { storage } from '../src/lib/storage.js';

describe('Storage utility', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  test('get returns stored value', async () => {
    chrome.storage.local.get.mockResolvedValue({ user: { name: 'Alex' } });

    const user = await storage.get('user');

    expect(chrome.storage.local.get).toHaveBeenCalledWith('user');
    expect(user).toEqual({ name: 'Alex' });
  });

  test('set stores value correctly', async () => {
    await storage.set('settings', { theme: 'dark' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: { theme: 'dark' }
    });
  });

  test('get returns default value when key not found', async () => {
    chrome.storage.local.get.mockResolvedValue({});

    const result = await storage.get('nonexistent', 'default');

    expect(result).toBe('default');
  });
});
```

**tests/messaging.test.js:**
```javascript
describe('Message handling', () => {
  test('sends message to background', async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ success: true });

    const response = await chrome.runtime.sendMessage({
      type: 'GET_DATA',
      payload: { id: 1 }
    });

    expect(response.success).toBe(true);
  });
});
```

---

## E2E 测试配置

### Playwright 配置

**playwright.config.js:**
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    headless: false, // 插件测试需要有头浏览器
    viewport: { width: 1280, height: 720 }
  },
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chrome',
        // 加载插件
        launchOptions: {
          args: [
            `--disable-extensions-except=${process.cwd()}/dist`,
            `--load-extension=${process.cwd()}/dist`
          ]
        }
      }
    }
  ]
});
```

**package.json 添加:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

### E2E 测试示例

**e2e/popup.spec.js:**
```javascript
import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const extensionPath = path.join(__dirname, '../dist');

test.describe('Extension Popup', () => {
  let context;
  let extensionId;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // 获取插件 ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    extensionId = background.url().split('/')[2];
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('popup opens and displays correctly', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    // 验证 UI 元素
    await expect(page.locator('h1')).toBeVisible();
  });

  test('popup interacts with storage', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    // 点击按钮
    await page.click('#save-button');

    // 验证结果
    await expect(page.locator('.status')).toHaveText('Saved');
  });
});
```

**e2e/content-script.spec.js:**
```javascript
import { test, expect } from '@playwright/test';

test.describe('Content Script', () => {
  test('injects into target page', async ({ page }) => {
    await page.goto('https://example.com');

    // 等待 Content Script 注入
    await page.waitForSelector('.my-extension-injected');

    // 验证注入的元素
    const element = page.locator('.my-extension-injected');
    await expect(element).toBeVisible();
  });
});
```

---

## 手动测试清单

### 生成的清单文件

**tests/MANUAL_TEST_CHECKLIST.md:**

```markdown
# {extension-name} 手动测试清单

> 版本: {version}
> 生成时间: {timestamp}

## 安装测试

- [ ] 从 chrome://extensions 加载已解压的扩展程序
- [ ] 图标正确显示在工具栏
- [ ] 无控制台错误

## 基础功能测试

### Popup 测试
- [ ] 点击图标，Popup 正常弹出
- [ ] Popup UI 布局正确，无样式错乱
- [ ] 按钮点击响应正常
- [ ] 输入框可正常输入
- [ ] 关闭后再打开，数据正确保持/重置

### Service Worker 测试
- [ ] 安装后 Service Worker 正常启动
- [ ] 休眠后能被消息唤醒
- [ ] 长时间无操作后仍能正常工作

### Content Script 测试（如适用）
- [ ] 目标网页上正确注入
- [ ] 注入的 UI 样式隔离，不影响页面
- [ ] 与页面 JS 无冲突

### 数据存储测试
- [ ] 数据正确保存到 storage
- [ ] 浏览器重启后数据保持
- [ ] 清除数据功能正常

## 权限测试

- [ ] 首次安装显示正确的权限请求
- [ ] 可选权限可正常请求和授予
- [ ] 权限拒绝后有合理的降级处理

## 边界情况测试

- [ ] 无网络时的处理
- [ ] API 请求失败时的错误提示
- [ ] Storage 数据量较大时的性能
- [ ] 多标签页同时使用时的状态同步

## 兼容性测试

- [ ] Chrome 最新稳定版
- [ ] Chrome Beta 版本
- [ ] 不同屏幕尺寸/分辨率

## 性能测试

- [ ] Popup 打开速度 < 200ms
- [ ] Content Script 不影响页面加载速度
- [ ] 内存占用合理

## 隐私与安全

- [ ] 不收集非必要数据
- [ ] 敏感数据加密存储（如适用）
- [ ] 无 XSS 漏洞风险

## 上架准备

- [ ] manifest.json 所有必填字段完整
- [ ] 图标四种尺寸齐全
- [ ] 无 console.log 残留
- [ ] 版本号已更新
- [ ] 描述文案准备完成
- [ ] 截图已准备

---

## 测试记录

| 日期 | 测试人 | 版本 | 结果 | 备注 |
|------|--------|------|------|------|
|      |        |      |      |      |

```

---

## 目录结构

测试配置完成后的项目结构：

```
{project}/
├── src/
├── tests/
│   ├── setup.js              # Chrome API Mock
│   ├── __tests__/
│   │   ├── storage.test.js
│   │   └── messaging.test.js
│   └── MANUAL_TEST_CHECKLIST.md
├── e2e/
│   ├── popup.spec.js
│   └── content-script.spec.js
├── jest.config.js            # 或 vitest.config.js
├── playwright.config.js
└── package.json
```

## 输出信息

```
✓ 测试配置完成

已生成:
  - tests/setup.js           # Chrome API Mock
  - jest.config.js           # 单元测试配置
  - playwright.config.js     # E2E 测试配置
  - tests/MANUAL_TEST_CHECKLIST.md

运行测试:
  npm test                   # 单元测试
  npm run test:e2e           # E2E 测试

下一步:
  1. 编写业务逻辑的单元测试
  2. 使用 /chplg:publish 准备上架
```
