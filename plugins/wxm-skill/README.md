# WXM Plugin

微信小程序开发调试工具 - 自动化编译、截图、日志监听、测试与 UI 闭环迭代。

## 功能特性

- **wxm:dev** - 编译项目、启动/控制模拟器、页面导航
- **wxm:screenshot** - 截取模拟器页面、UI 对比分析
- **wxm:logs** - 实时 console 日志和网络请求监听
- **wxm:test** - 运行自动化测试
- **wxm:ui-iterate** - 截图驱动的闭环 UI 开发

## 安装

### 通过 Claude Code Plugin 系统安装（推荐）

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install wxm@skill-market
```

或在 Claude Code 交互模式中：
```
/plugin marketplace add inspirai-store/skill-market
/plugin install wxm@skill-market
```

### 前置依赖

- 微信开发者工具（已安装并开启 HTTP 服务端口）
- Node.js >= 14

安装 Automator 依赖：
```bash
cd ~/.claude/plugins/wxm-skill/scripts/automator
npm install
```

可选依赖：
```bash
npm install -g wscat        # 日志监听
brew install imagemagick    # 截图对比
```

## 使用方法

### 初始化

```
/wxm:dev init
```

检查环境并生成 `.wxm.yaml` 配置文件。

### 编译与模拟器

```
/wxm:dev compile
/wxm:dev simulator start
/wxm:dev simulator reload
/wxm:dev simulator navigate pages/index/index
```

### 截图

```
/wxm:screenshot
/wxm:screenshot --page pages/user/user
```

### 日志监听

```
/wxm:logs
/wxm:logs --filter error
/wxm:logs --network
```

### 自动化测试

```
/wxm:test
/wxm:test test/index.test.js
```

### UI 迭代（闭环开发）

```
/wxm:ui-iterate --page pages/index/index --requirement "把标题改成蓝色"
```

自动执行：截图 → 修改代码 → 编译 → 截图验证 → 循环直到满足需求。

## 配置

`.wxm.yaml`（项目根目录）：
```yaml
project_path: /path/to/miniprogram
devtools_port: 9420
```

## License

MIT
