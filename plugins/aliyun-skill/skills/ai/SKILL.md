---
name: ai
description: "阿里云 AI 服务信息查询"
---

# /aliyun:ai - AI 服务

查询阿里云 AI 服务信息和可用模型。

## 使用方式

```
/aliyun:ai list              # 列出可用 AI 服务
/aliyun:ai models            # 列出可用模型
/aliyun:ai status            # 查看服务状态
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
source "$PLUGIN_DIR/cli/ai.sh"
ai_main "$@"
```

## 权限

| 操作 | 权限级别 |
|------|---------|
| list / models / status | ✅ 只读 |
| 调用 AI 接口 | ⚠️ 需确认（可能产生费用） |

## 注意事项

- AI 服务调用可能产生费用，执行前需用户确认
- 模型列表可能因区域不同而有差异
