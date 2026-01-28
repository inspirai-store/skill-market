---
name: list
description: "列出所有最佳实践或按分类筛选"
---

# /bp list - 列出最佳实践

列出已记录的最佳实践，支持按分类筛选。

## 使用方式

```
/bp list              # 显示分类统计
/bp list <category>   # 列出指定分类下的实践
```

## 执行步骤

### Step 1: 检查数据目录

```bash
BP_DIR="$HOME/.inspirai/best-practices"
INDEX_FILE="$BP_DIR/index.json"

if [ ! -f "$INDEX_FILE" ]; then
    echo "尚未记录任何最佳实践。使用 /bp capture 开始记录。"
    exit 0
fi
```

### Step 2: 读取索引

```bash
cat "$INDEX_FILE"
```

### Step 3: 格式化输出

**无参数时 - 显示分类统计：**

```
最佳实践统计：

分类          数量
─────────────────
wechat        3
typescript    2
k8s           5
─────────────────
总计          10

使用 /bp list <category> 查看具体分类
```

**带参数时 - 列出该分类下的实践：**

```
[wechat] 分类下的最佳实践：

ID                    标题                    更新时间
───────────────────────────────────────────────────────
wechat-scan-login     微信扫码登录方案        2026-01-28
wechat-mini-auth      小程序静默登录          2026-01-25
wechat-pay            微信支付集成            2026-01-20

使用 /bp apply <id> 查看详情并应用
```

**分类不存在时：**

```
未找到分类 "xxx"

已有分类：wechat, typescript, k8s

使用 /bp list 查看所有分类
```
