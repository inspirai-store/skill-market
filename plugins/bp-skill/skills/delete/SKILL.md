---
name: delete
description: "删除过时的最佳实践"
---

# /bp delete - 删除最佳实践

确认后删除指定的最佳实践。

## 使用方式

```
/bp delete <id>        # 删除指定 ID 的实践
```

## 执行步骤

### Step 1: 验证 ID 存在

```bash
BP_DIR="$HOME/.inspirai/best-practices"
INDEX_FILE="$BP_DIR/index.json"

# 读取 index.json，检查 practices[id] 是否存在
```

**ID 不存在时：**

```
未找到 ID 为 "xxx" 的最佳实践

使用 /bp list 浏览所有实践
```

### Step 2: 显示实践信息并确认

```
即将删除：

ID: {id}
标题: {title}
分类: {category}
创建时间: {created}

此操作不可恢复！确认删除吗？
- 确认删除
- 取消
```

### Step 3: 执行删除

**用户确认后：**

```bash
# 删除文档文件
rm "$BP_DIR/{category}/{slug}.md"

# 检查分类目录是否为空，为空则删除
if [ -z "$(ls -A $BP_DIR/{category})" ]; then
    rmdir "$BP_DIR/{category}"
fi
```

从 `index.json` 中移除对应条目，写回文件。

### Step 4: 确认完成

```
已删除「{title}」
```

**用户取消时：**

```
已取消删除操作
```
