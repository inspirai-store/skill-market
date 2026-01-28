---
name: update
description: "更新已有的最佳实践"
---

# /bp update - 更新最佳实践

加载已有实践，引导更新内容。

## 使用方式

```
/bp update <id>        # 更新指定 ID 的实践
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

使用 /bp search <keyword> 搜索
或使用 /bp list 浏览所有实践
```

### Step 2: 读取现有内容

```bash
FILE_PATH="$BP_DIR/{category}/{slug}.md"
cat "$FILE_PATH"
```

展示当前内容给用户。

### Step 3: 询问更新内容

```
当前内容已加载。请描述需要更新的内容：

你可以：
- 补充新的注意事项
- 更新解决方案步骤
- 添加代码片段
- 修正错误信息

请输入更新内容：
```

### Step 4: 应用更新

根据用户描述，修改文档相应部分。

更新 frontmatter 中的 `updated` 字段：
```yaml
updated: {today}
```

### Step 5: 更新索引

更新 `index.json` 中对应条目的 `updated` 字段。

### Step 6: 确认完成

```
已更新「{title}」

更新时间: {date}
文件: {file_path}

使用 /bp apply {id} 查看更新后的内容
```
