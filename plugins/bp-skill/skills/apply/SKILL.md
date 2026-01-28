---
name: apply
description: "应用指定的最佳实践到当前项目"
---

# /bp apply - 应用最佳实践

读取指定的最佳实践，提供查看或应用选项。

## 使用方式

```
/bp apply <id>         # 应用指定 ID 的实践
```

## 执行步骤

### Step 1: 验证 ID 存在

```bash
BP_DIR="$HOME/.inspirai/best-practices"
INDEX_FILE="$BP_DIR/index.json"

# 读取 index.json，检查 practices[id] 是否存在
# 如果不存在，提示并退出
```

**ID 不存在时：**

```
未找到 ID 为 "xxx" 的最佳实践

使用 /bp search <keyword> 搜索
或使用 /bp list 浏览所有实践
```

### Step 2: 读取实践文档

```bash
# 从 index.json 获取文件路径
FILE_PATH="$BP_DIR/{category}/{slug}.md"
cat "$FILE_PATH"
```

### Step 3: 展示内容并提供选项

展示文档完整内容后，使用 AskUserQuestion 询问：

```
已加载「{title}」

请选择操作：
- 直接开始实现（根据方案步骤指导实现）
- 复制到项目文档（生成到 docs/references/{id}.md）
- 仅查看，稍后再说
```

### Step 4: 执行用户选择

**直接开始实现：**
- 展示解决方案步骤
- 逐步引导用户实现

**复制到项目文档：**
```bash
mkdir -p docs/references
cp "$FILE_PATH" "docs/references/{id}.md"
echo "已复制到 docs/references/{id}.md"
```

**仅查看：**
- 结束，不做额外操作
