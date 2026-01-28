# BP Skill 设计文档

日期：2026-01-28

## 概述

**插件名称**: `bp-skill` (Best Practices)

**核心目标**: 记录验证通过的解决方案，跨项目复用，避免重复踩坑。

## 存储结构

```
~/.inspirai/best-practices/
├── index.json                    # 索引文件，关键词映射
├── wechat/                       # 分类目录
│   ├── scan-login.md
│   └── mini-program-auth.md
├── typescript/
│   └── strict-mode-migration.md
└── k8s/
    └── rolling-update.md
```

### 索引文件 (`index.json`)

```json
{
  "version": 1,
  "practices": {
    "wechat-scan-login": {
      "title": "微信扫码登录方案",
      "category": "wechat",
      "tags": ["登录", "扫码", "OAuth", "微信"],
      "file": "wechat/scan-login.md",
      "created": "2026-01-28",
      "updated": "2026-01-28"
    }
  }
}
```

## 文档模板

每个文档控制在 200-400 字：

```markdown
---
id: wechat-scan-login
title: 微信扫码登录方案
category: wechat
tags: [登录, 扫码, OAuth, 微信, PC端]
created: 2026-01-28
updated: 2026-01-28
---

## 问题

简述遇到的问题场景。

## 解决方案

1. 步骤一
2. 步骤二
3. ...

## 关键代码

关键代码片段（精简）。

## 注意事项

- 注意点 1
- 注意点 2

## 相关链接

- [链接名](URL)
```

## 子命令设计

### 1. `/bp capture` - 记录新实践

交互流程：
1. 询问标题和分类（提供已有分类选择 + 新建）
2. 引导填写：问题描述、解决方案、关键代码
3. 自动提取标签（可手动补充）
4. 生成文档并更新索引

### 2. `/bp search <keyword>` - 搜索实践

根据关键词搜索索引，返回匹配的实践列表。

### 3. `/bp list [category]` - 列出实践

无参数时显示分类统计，带参数时列出该分类下所有实践。

### 4. `/bp apply <id>` - 应用实践

读取指定实践，提供选项：
- 查看完整内容
- 生成到当前项目文档
- 直接开始实现

### 5. `/bp update <id>` - 更新实践

加载已有内容，引导用户描述更新，保存并更新时间戳。

### 6. `/bp delete <id>` - 删除实践

确认后删除文档和索引条目。

## 触发机制

### A) 手动触发

用户主动调用 `/bp capture`。

### B) Commit 信息检测

检测 commit 信息模式：
- "fix: resolved xxx" 或 "feat: implement xxx solution"
- 连续 fix commit 后出现成功 commit

触发时询问是否记录。

### C) 与 evo skill 联动

当 evo 检测到：
- `retry_loops` 信号消失（问题已解决）
- 高频修改文件趋于稳定

自动建议记录为最佳实践。

## 自动检索机制

### 检索时机

1. 用户描述问题时 - 检测关键词匹配
2. 开始实现功能前 - 根据任务描述搜索
3. 遇到报错时 - 提取错误特征查找

### 检索流程

1. 提取关键词
2. 搜索 index.json（标签匹配）
3. 匹配度 ≥2 时，读取文档内容
4. 主动告知用户并建议参考

### CLAUDE.md 配置

```markdown
## 最佳实践自动检索

开始任务前，检查 ~/.inspirai/best-practices/index.json
若找到匹配实践（标签匹配 ≥2），主动告知用户并建议参考。
```

## 插件结构

```
plugins/bp-skill/
├── plugin.json
├── README.md
└── skills/
    ├── capture/SKILL.md
    ├── search/SKILL.md
    ├── list/SKILL.md
    ├── apply/SKILL.md
    ├── update/SKILL.md
    └── delete/SKILL.md
```
