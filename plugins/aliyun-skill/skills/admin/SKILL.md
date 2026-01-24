---
name: admin
description: "阿里云插件配置与权限诊断"
---

# /aliyun:admin - 配置与诊断

初始化阿里云插件配置和诊断当前凭证权限。

## 使用方式

```
/aliyun:admin init           # 首次配置 / 重新配置
/aliyun:admin diag           # 诊断当前权限
/aliyun:admin config         # 查看当前配置
```

## 执行步骤

### init - 初始化配置

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
"$PLUGIN_DIR/init.sh"
```

引导用户完成：
1. 配置 AccessKey ID 和 Secret
2. 选择默认区域
3. 设置权限级别

配置保存到 `~/.claude/plugins/aliyun/config.yaml`。

### diag - 权限诊断

```bash
source "$PLUGIN_DIR/auth.sh"
load_credentials "$ALIYUN_PROFILE"

# 获取当前身份信息
aliyun sts GetCallerIdentity
```

输出当前凭证的：
- 账号 ID
- 用户类型（主账号/RAM 用户）
- ARN
- 可用权限概要

### config - 查看配置

显示当前 `config.yaml` 中的配置内容（脱敏 AccessKey）。

## 配置文件格式

```yaml
# ~/.claude/plugins/aliyun/config.yaml
region: cn-hangzhou
profile: default
permissions:
  ecs: readonly
  oss: confirm
  dns: direct
  rds: readonly
  slb: direct
  ack: readonly
  acr: readonly
```

## 依赖

- `aliyun-cli` — 阿里云命令行工具
- `jq` — JSON 处理
- `yq`（可选） — YAML 处理

## 注意事项

- AccessKey 不会存储在插件目录中，使用 aliyun-cli 的凭证管理
- 权限配置决定了各资源操作的确认级别
