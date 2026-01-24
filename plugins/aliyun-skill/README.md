# Aliyun Plugin

阿里云资源管理工具 - 支持 ECS、OSS、DNS、RDS、ACK、ACR、SLB、AI 等服务的查询和操作。

## 功能特性

- **aliyun:compute** - ECS 云服务器实例查询与状态监控
- **aliyun:storage** - OSS 对象存储文件管理
- **aliyun:network** - DNS 解析和 SLB 负载均衡
- **aliyun:database** - RDS 数据库实例管理
- **aliyun:container** - ACK 集群和 ACR 镜像仓库
- **aliyun:ai** - AI 服务信息查询
- **aliyun:admin** - 插件配置与权限诊断

## 安装

### 通过 Claude Code Plugin 系统安装（推荐）

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install aliyun@skill-market
```

或在 Claude Code 交互模式中：
```
/plugin marketplace add inspirai-store/skill-market
/plugin install aliyun@skill-market
```

### 前置依赖

```bash
# 安装阿里云 CLI
brew install aliyun-cli   # macOS
# 或参考 https://github.com/aliyun/aliyun-cli

# 安装 jq
brew install jq

# 配置凭证
aliyun configure
```

## 使用方法

### 首次配置

```
/aliyun:admin init
```

### ECS 云服务器

```
/aliyun:compute list
/aliyun:compute status i-bp1xxxxx
```

### OSS 对象存储

```
/aliyun:storage ls
/aliyun:storage ls my-bucket/path/
/aliyun:storage cp file.txt oss://bucket/path/
```

### DNS 与 SLB

```
/aliyun:network dns list
/aliyun:network dns list example.com
/aliyun:network slb list
```

### RDS 数据库

```
/aliyun:database list
/aliyun:database status rm-bp1xxxxx
```

### 容器服务

```
/aliyun:container ack list
/aliyun:container acr list
```

### 权限诊断

```
/aliyun:admin diag
```

## 权限控制

| 资源 | 读操作 | 写操作 |
|-----|-------|-------|
| ECS | ✅ 自动 | ❌ 禁止 |
| RDS | ✅ 自动 | ❌ 禁止 |
| OSS | ✅ 自动 | ⚠️ 需确认 |
| DNS | ✅ 自动 | ✅ 直接 |
| SLB | ✅ 自动 | ❌ 禁止 |

权限可在 `~/.claude/plugins/aliyun/config.yaml` 中调整。

## License

MIT
