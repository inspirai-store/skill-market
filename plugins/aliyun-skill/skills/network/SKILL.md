---
name: network
description: "阿里云网络管理 - DNS 解析和 SLB 负载均衡"
---

# /aliyun:network - DNS 与 SLB

管理阿里云 DNS 解析和 SLB 负载均衡。

## 使用方式

### DNS 操作

```
/aliyun:network dns list                         # 列出所有域名
/aliyun:network dns list example.com             # 列出域名的解析记录
/aliyun:network dns add example.com A www 1.2.3.4    # 添加记录
/aliyun:network dns del example.com <record-id>      # 删除记录
```

### SLB 操作

```
/aliyun:network slb list                         # 列出所有负载均衡
/aliyun:network slb status <slb-id>              # 查看 SLB 详情
/aliyun:network slb backends <slb-id>            # 查看后端服务器
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
    dns)
        source "$PLUGIN_DIR/cli/dns.sh"
        dns_main "$@"
        ;;
    slb)
        source "$PLUGIN_DIR/cli/slb.sh"
        slb_main "$@"
        ;;
esac
```

## 权限

| 操作 | 权限级别 |
|------|---------|
| dns list | ✅ 只读 |
| dns add/del | ✅ 直接执行（DNS 变更即时生效） |
| slb list/status | ✅ 只读 |
| slb 修改 | ❌ 禁止 |

## 注意事项

- DNS 添加记录会立即生效，注意检查记录值
- SLB 仅支持查询操作，修改需通过控制台
