---
name: container
description: "阿里云容器服务 - ACK 集群和 ACR 镜像仓库管理"
---

# /aliyun:container - ACK 与 ACR

管理阿里云容器服务 ACK（Kubernetes）和 ACR（容器镜像服务）。

## 使用方式

### ACK 操作

```
/aliyun:container ack list                # 列出所有 K8s 集群
/aliyun:container ack status <cluster-id> # 查看集群详情
/aliyun:container ack nodes <cluster-id>  # 列出节点
```

### ACR 操作

```
/aliyun:container acr list                # 列出镜像仓库
/aliyun:container acr tags <repo-name>    # 列出镜像标签
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

### Step 2: 解析子命令

```bash
SUB_CMD="$1"
shift

case "$SUB_CMD" in
    ack)
        source "$PLUGIN_DIR/cli/ack.sh"
        ack_main "$@"
        ;;
    acr)
        source "$PLUGIN_DIR/cli/acr.sh"
        acr_main "$@"
        ;;
esac
```

## 权限

| 操作 | 权限级别 |
|------|---------|
| ack list/status/nodes | ✅ 只读 |
| acr list/tags | ✅ 只读 |
| 集群创建/删除 | ❌ 禁止 |

## 注意事项

- ACK 操作仅支持查询，集群管理需通过控制台
- ACR 镜像列表可能较长，注意使用分页
