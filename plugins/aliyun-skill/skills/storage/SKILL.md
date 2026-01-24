---
name: storage
description: "阿里云 OSS 对象存储管理 - Bucket 列表、文件操作"
---

# /aliyun:storage - OSS 对象存储

管理阿里云 OSS，支持 Bucket 列表、文件浏览和上传。

## 使用方式

```
/aliyun:storage ls                          # 列出所有 Bucket
/aliyun:storage ls my-bucket/               # 列出 Bucket 中的文件
/aliyun:storage ls my-bucket/path/          # 列出指定前缀的文件
/aliyun:storage cp file.txt oss://bucket/path/  # 上传文件（需确认）
/aliyun:storage cp oss://bucket/file.txt .      # 下载文件
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
source "$PLUGIN_DIR/cli/oss.sh"
oss_main "$@"
```

**ls 操作：**
- 无参数：调用 `aliyun oss ls` 列出所有 Bucket
- 带路径：调用 `aliyun oss ls oss://bucket/prefix/` 列出文件

**cp 操作：**
- 上传：需用户确认后执行 `aliyun oss cp <local> <remote>`
- 下载：直接执行

## 权限

| 操作 | 权限级别 |
|------|---------|
| ls（列表） | ✅ 只读，自动执行 |
| cp（上传） | ⚠️ 写操作，需用户确认 |
| cp（下载） | ✅ 自动执行 |
| rm（删除） | ❌ 禁止 |

## 智能提示

当对话中出现 OSS 路径（`oss://*`）时，可主动提示使用此命令。
