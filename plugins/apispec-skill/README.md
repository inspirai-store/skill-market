# API Spec Plugin

API 规范管理工具 - 跨项目 API 文档的初始化、更新、查询与搜索。

## 功能特性

- **apispec:init** - 初始化项目 API 文档配置
- **apispec:update** - 解析路由并生成 API 文档
- **apispec:lookup** - 精确查询 API 文档
- **apispec:search** - 模糊搜索 API（支持关键词、字段名、HTTP 方法过滤）

## 安装

### 通过 Claude Code Plugin 系统安装（推荐）

```bash
# 添加 marketplace
claude plugin marketplace add inspirai-store/skill-market

# 安装插件
claude plugin install apispec@skill-market
```

或在 Claude Code 交互模式中：
```
/plugin marketplace add inspirai-store/skill-market
/plugin install apispec@skill-market
```

### 前置准备

Clone API specs 仓库到本地：
```bash
mkdir -p ~/.apispec
git clone <your-api-specs-repo> ~/.apispec/registry
```

## 使用方法

### 初始化项目

```
/apispec:init
```

在项目根目录生成 `.api-spec.yaml` 配置，自动检测：
- 项目类型（Go / Node.js / Python）
- 路由文件位置
- Base URL

### 更新 API 文档

```
/apispec:update              # 更新所有 API
/apispec:update auth         # 只更新 auth 模块
```

解析路由和 handler，生成 YAML 文档并推送到 spec 仓库。

### 查询 API 文档

```
/apispec:lookup                              # 列出所有项目
/apispec:lookup myapp                        # 显示项目所有 API
/apispec:lookup myapp auth                   # 显示 auth 模块
/apispec:lookup myapp auth/sms-login         # 查看具体 API 详情
```

### 搜索 API

```
/apispec:search login                        # 模糊搜索
/apispec:search --method POST user           # 按方法过滤
/apispec:search --field token                # 按字段名搜索
/apispec:search --project myapp auth         # 在指定项目中搜索
```

## 目录结构

```
~/.apispec/registry/
├── meta.yaml                    # 全局项目索引
├── myapp/
│   ├── meta.yaml               # 项目 API 索引
│   ├── auth/
│   │   ├── sms-send.yaml
│   │   └── sms-login.yaml
│   ├── user/
│   └── ...
└── another-project/
    └── ...
```

## License

MIT
