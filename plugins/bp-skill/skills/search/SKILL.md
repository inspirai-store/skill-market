---
name: search
description: "按关键词搜索最佳实践"
---

# /bp search - 搜索最佳实践

根据关键词在标题和标签中搜索匹配的最佳实践。

## 使用方式

```
/bp search <keyword>           # 单关键词搜索
/bp search <kw1> <kw2>         # 多关键词搜索（AND 逻辑）
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

### Step 2: 读取索引并搜索

读取 `index.json`，对每个实践检查：
1. 标题是否包含关键词
2. 标签数组是否包含关键词

匹配规则：
- 不区分大小写
- 多关键词时，所有关键词都需匹配（AND 逻辑）
- 按匹配度排序（标题匹配 > 标签匹配）

### Step 3: 格式化输出

**找到匹配时：**

```
搜索 "微信 登录" - 找到 2 个匹配：

1. [wechat-scan-login] 微信扫码登录方案
   标签: 登录, 扫码, OAuth, 微信
   分类: wechat | 更新: 2026-01-28

2. [wechat-mini-auth] 小程序静默登录
   标签: 登录, 小程序, 微信
   分类: wechat | 更新: 2026-01-25

使用 /bp apply <id> 查看详情并应用
```

**无匹配时：**

```
搜索 "xyz" - 未找到匹配

建议：
- 尝试更短或不同的关键词
- 使用 /bp list 浏览所有分类
```
