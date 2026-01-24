---
name: database
description: "阿里云 RDS 数据库实例管理 - 实例查询、状态监控"
---

# /aliyun:database - RDS 数据库

管理阿里云 RDS 数据库实例，支持列表查询和状态查看。

## 使用方式

```
/aliyun:database list                    # 列出所有 RDS 实例
/aliyun:database status <instance-id>    # 查看实例详情
/aliyun:database list --region cn-beijing  # 指定区域
```

## 执行步骤

### Step 1: 加载凭证

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/auth.sh"
source "$PLUGIN_DIR/init.sh"

load_config
load_credentials "$ALIYUN_PROFILE"
```

### Step 2: 执行操作

```bash
source "$PLUGIN_DIR/cli/rds.sh"
rds_main "$@"
```

**list 操作：**
- 调用 `aliyun rds DescribeDBInstances`
- 格式化输出：实例ID、引擎、版本、状态、连接地址

**status 操作：**
- 调用 `aliyun rds DescribeDBInstanceAttribute --DBInstanceId <id>`
- 显示详情：规格、存储、连接数、到期时间

## 权限

| 操作 | 权限级别 |
|------|---------|
| list / status | ✅ 只读，自动执行 |
| 创建/删除/修改 | ❌ 禁止（安全限制） |

## 智能提示

当对话中出现 RDS 实例 ID（`rm-bp*`）时，可主动提示使用此命令。
