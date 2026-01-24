---
name: compute
description: "阿里云 ECS 云服务器管理 - 实例查询、状态监控"
---

# /aliyun:compute - ECS 云服务器

管理阿里云 ECS 实例，支持列表查询和状态查看。

## 使用方式

```
/aliyun:compute list                    # 列出所有实例
/aliyun:compute status <instance-id>    # 查看实例状态
/aliyun:compute list --region cn-shanghai  # 指定区域
```

## 执行步骤

### Step 1: 加载凭证

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/auth.sh"
source "$PLUGIN_DIR/init.sh"

load_config
load_credentials "$ALIYUN_PROFILE"

if [[ "$CREDENTIAL_STATUS" != "authorized" ]]; then
    echo "[ERROR] 凭证无效，请运行 /aliyun:admin 重新配置"
    exit 1
fi
```

### Step 2: 执行操作

```bash
source "$PLUGIN_DIR/cli/ecs.sh"
ecs_main "$@"
```

**list 操作：**
- 调用 `aliyun ecs DescribeInstances` 查询实例
- 格式化输出：实例ID、名称、状态、IP、规格

**status 操作：**
- 调用 `aliyun ecs DescribeInstanceAttribute --InstanceId <id>`
- 显示详细信息：CPU、内存、带宽、到期时间

## 权限

| 操作 | 权限级别 |
|------|---------|
| list / status | ✅ 只读，自动执行 |
| start / stop / restart | ❌ 禁止（安全限制） |

## 智能提示

当对话中出现 ECS 实例 ID（`i-bp*`）时，可主动提示使用此命令查看状态。

## 通用选项

- `--region <id>` — 指定区域（默认读取配置）
- `--json` — 输出原始 JSON
- `--table` — 表格格式输出
