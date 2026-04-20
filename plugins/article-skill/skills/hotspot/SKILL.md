---
name: article-hotspot
description: Use when user wants to research trending topics or viral articles before writing — triggers on "找热点", "抓热点", "热点分析", "爆款分析", "analyze hot topics", "find trending", "research hotspots", "最近有什么爆款", or when the user is about to write and wants angle/structure inspiration from currently viral pieces. Searches the web for current trends in the user's domain, decomposes viral titles (conflict / question / number / negation), maps article structures (hook / body / interaction), and outputs differentiable angles.
---

# 热点分析工具 (Hotspot Research)

> 创作前的情报工作：抓取当下热点 + 拆解爆款要素 + 输出差异化切入点。

本 skill 面向公众号创作者，用于"下笔前"的话题调研。

## When to Use

触发场景：
- **"帮我找一下 AI 工具相关的热点"**
- **"分析一下最近设计领域的爆款文章"**
- **"搜索 MidJourney 相关的热门话题"**
- **"我要写 X，先看看热点再动笔"**
- 用户明确要求热点 / 话题 / 爆款调研

**When NOT to use:**
- 用户已经有明确主题和切入角度 → 直接用 `article-write`
- 泛泛的新闻查询（不涉及写作）→ 用 WebSearch / web-reader
- 不是内容创作场景

## 核心流程

```
Step 1: 确认调研范围
  ├── 领域 / 关键词（结合作者配置.md 中的领域定位）
  ├── 时效窗口（默认"最近 7 天"，紧急热点可缩短）
  └── 平台偏好（公众号 / 知乎 / 小红书 / X / B站）

Step 2: 多路搜索
  ├── 关键词 + "爆款" / "高赞" / "最新"
  ├── 关键词 + 平台名（"公众号爆款 X" / "知乎 X 高赞"）
  └── 关键词 + 时效词（"2026 X 趋势" / "最近 X"）

Step 3: 爆款标题拆解
  ├── 标题类型（冲突型 / 疑问型 / 数字型 / 否定型）
  ├── 字数 + 关键词 + 情绪触发点
  └── 为什么吸引人

Step 4: 结构拆解
  ├── 开头钩子方式
  ├── 段落结构
  ├── 配图策略
  └── 互动设计

Step 5: 输出差异化角度
  ├── 可切入的写作角度（3-5 个）
  ├── 基于作者配置的差异化建议
  └── 避免跟风的提醒
```

## 输出格式

```
【热点话题】
1. [话题标题]
   - 热度：[搜索结果数 / 讨论数]
   - 来源：[平台 / 文章]
   - 关键信息：[简述]

【爆款标题分析】
1. "[标题]"
   - 类型：[冲突型 / 疑问型 / 数字型 / 否定型]
   - 字数：[数字]
   - 关键词：[提取]
   - 为什么吸引人：[分析]

【可借鉴角度】
- 角度 1：[描述]
- 角度 2：[描述]
- 角度 3：[描述]

【差异化建议】
- 你的优势：[来自作者配置.md]
- 差异化切入点：[具体建议]
```

## 依赖

- **WebSearch / WebFetch** 工具（必需，用于实时抓取）
- **作者配置.md**（可选但强烈推荐，决定"差异化建议"的落点）

## 详细参考

完整的搜索关键词库、平台特定搜索技巧、时效性注意事项见 `references/hotspot-tool.md`。

## 与其他 skill 的协作

```
article-hotspot   →   article-write
  (本 skill)          (正文创作，使用热点结果作为切入点)
```

调研完成后，用户通常会进入写作流程，可主动引导："要不要现在用 `article-write` 开始动笔？"

## 关键原则

1. **时效优先**：建议在创作前 1-2 小时内搜索，确保信息新鲜
2. **多源交叉**：不依赖单一平台，至少覆盖 2-3 个来源
3. **相关性优先**：结合作者领域过滤，不要给出偏离的热点
4. **差异化 ≠ 对立**：找到独特切入点，不是为了反对而反对
5. **不鼓励模仿**：拆解爆款是为了理解机制，不是照搬标题
