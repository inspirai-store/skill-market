---
name: test
description: "微信小程序自动化测试 - 运行测试用例并查看结果"
---

# /wxm:test - 自动化测试

运行微信小程序自动化测试并显示结果。

## 使用方式

```
/wxm:test                    # 运行全部测试
/wxm:test <file>             # 运行指定测试文件
/wxm:test --report           # 生成测试报告
```

## 执行步骤

### Step 1: 加载环境

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/utils/config.sh"
source "$PLUGIN_DIR/core/cli.sh"
```

### Step 2: 运行测试

```bash
wxm_cli_test "$TEST_FILE"
```

- 使用微信小程序 CLI 工具运行测试
- 解析测试输出，格式化显示结果

## 输出格式

```
Running tests...

  ✓ pages/index - should load data (120ms)
  ✓ pages/index - should render list (85ms)
  ✗ pages/user - should show profile (timeout)
  ✓ components/button - should handle click (32ms)

Results: 3 passed, 1 failed
Failed:
  pages/user - should show profile
    Error: Timeout after 5000ms
    at pages/user/user.test.js:15
```

## 测试文件格式

测试文件放在项目的 `test/` 或 `__tests__/` 目录下：
```
miniprogram/
├── pages/
├── test/
│   ├── index.test.js
│   └── user.test.js
└── ...
```

## 注意事项

- 需要微信开发者工具已启动
- 测试运行前会自动编译项目
- 超时测试默认等待 5000ms
- 测试报告保存在 `.wxm-screenshots/test-reports/` 目录
