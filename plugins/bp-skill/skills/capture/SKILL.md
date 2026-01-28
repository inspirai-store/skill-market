---
name: capture
description: "记录新的最佳实践"
---

# /bp capture - 记录最佳实践

交互式引导记录新的最佳实践。

## 使用方式

```
/bp capture            # 开始交互式记录
```

## 执行步骤

### Step 1: 初始化数据目录

```bash
BP_DIR="$HOME/.inspirai/best-practices"
INDEX_FILE="$BP_DIR/index.json"

mkdir -p "$BP_DIR"

# 如果 index.json 不存在，创建初始结构
if [ ! -f "$INDEX_FILE" ]; then
    echo '{"version":1,"practices":{}}' > "$INDEX_FILE"
fi
```

### Step 2: 收集基本信息

使用 AskUserQuestion 依次询问：

**问题 1：标题**
```
请输入最佳实践的标题（简洁描述方案）：
示例：微信扫码登录方案、K8s 滚动更新配置
```

**问题 2：分类**

先读取现有分类：
```bash
cat "$INDEX_FILE" | jq -r '.practices[].category' | sort -u
```

```
请选择分类：
- wechat（已有 3 个实践）
- typescript（已有 2 个实践）
- k8s（已有 5 个实践）
- 新建分类...
```

**问题 3：标签**
```
请输入标签（用逗号分隔，用于搜索匹配）：
示例：登录, 扫码, OAuth, 微信
```

### Step 3: 收集内容

依次引导填写：

**问题描述：**
```
请简述遇到的问题场景（1-3 句话）：
```

**解决方案：**
```
请描述解决方案的关键步骤（可以是编号列表）：
```

**关键代码（可选）：**
```
请粘贴关键代码片段（可选，直接回车跳过）：
```

**注意事项（可选）：**
```
有什么需要特别注意的坑吗？（可选，直接回车跳过）：
```

**相关链接（可选）：**
```
有参考文档链接吗？（可选，直接回车跳过）：
```

### Step 4: 生成 ID 和文件

ID 生成规则：`{category}-{slug}`
- slug 从标题生成，取关键词，用连字符连接
- 示例：标题 "微信扫码登录方案" -> ID "wechat-scan-login"

```bash
CATEGORY="wechat"
SLUG="scan-login"
ID="${CATEGORY}-${SLUG}"
FILE_PATH="$BP_DIR/$CATEGORY/$SLUG.md"
DATE=$(date +%Y-%m-%d)

mkdir -p "$BP_DIR/$CATEGORY"
```

### Step 5: 写入文档

生成 Markdown 文件：

```markdown
---
id: {id}
title: {title}
category: {category}
tags: [{tags}]
created: {date}
updated: {date}
---

## 问题

{problem}

## 解决方案

{solution}

## 关键代码

{code}

## 注意事项

{notes}

## 相关链接

{links}
```

### Step 6: 更新索引

读取 `index.json`，添加新条目：

```json
{
  "practices": {
    "{id}": {
      "title": "{title}",
      "category": "{category}",
      "tags": ["{tag1}", "{tag2}"],
      "file": "{category}/{slug}.md",
      "created": "{date}",
      "updated": "{date}"
    }
  }
}
```

写回 `index.json`。

### Step 7: 确认完成

```
已记录最佳实践：

ID: {id}
标题: {title}
分类: {category}
标签: {tags}
文件: {file_path}

使用 /bp apply {id} 可随时查看和应用此实践
```
