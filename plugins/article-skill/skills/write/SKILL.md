---
name: article-write
description: Use when user wants to write WeChat public-account articles or long-form content — triggers on "写文章", "写公众号", "爆款文章", "创作文章", "help me write an article", "draft a post", "公众号爆款", or when the user provides a topic and asks for a full article draft. Learns the author's voice from a config file, pulls in hotspot angles, and runs a full topic→title→structure→polish workflow with four title formulas and three article templates.
---

# 公众号爆款写作 (Article Writing Workflow)

> 完整的公众号文章创作系统：风格自适应 + 热点切入 + 4 种标题 + 3 种结构 + 爆款要素检查。

本 skill 是 `article` 插件的核心入口。面向公众号 / 长文创作者，覆盖从选题到成稿的全流程。

## Overview

创作流程遵循：**读作者配置 → 选题方向 → 热点调研 → 标题生成 → 结构设计 → 正文创作 → 爆款检查 → 去 AI 化润色**。

设计目标：
- **风格一致**：通过 `author-config.md` 固化作者人设（亲和力强 / 专业严谨 / 幽默风趣 / 极简干货）
- **题材可复制**：4 种标题公式 + 3 种文章结构（工具介绍 / 方法教程 / 深度思考）
- **质量可校验**：爆款要素 checklist + 去 AI 化润色兜底

## When to Use

触发场景：
- 用户说 **"我要写一篇关于 X 的文章"** / **"写一篇公众号爆款"** / **"帮我写篇稿子"**
- 用户提供主题或素材，想要得到完整文章初稿
- 用户已有标题或大纲，需要继续填充正文
- 用户需要从选题到成稿的系统化协助

**When NOT to use:**
- 单独的热点调研 → 用 `article-hotspot` skill
- 单独的文本去 AI 化 → 用 `article-depolish` skill
- 非公众号场景的文案（小红书 / 营销 copy / 技术文档）—— 可参考但非目标场景

## 前置步骤（Phase 0）：确认作者配置

**首次为某用户创作前**，必须确认作者配置文件存在：

1. 在当前工作目录（或用户指定位置）查找 `author-config.md` / `作者配置.md`
2. **如果不存在**：
   - 复制 `assets/author-template.md` 作为起点
   - 提示用户填写：笔名 / 身份 / 领域 / 人设标签 / 代表文章
   - 可引用 `assets/author-example.md` 作为范本
3. **如果已存在**：加载并在创作中严格遵守其中的风格约束

作者配置是风格自适应的唯一来源，不要凭空猜测用户的写作偏好。

## 核心工作流

```
Step 1: 需求澄清
  ├── 主题 / 核心观点 / 目标读者
  ├── 文章类型（工具介绍 / 方法教程 / 深度思考）
  └── 是否需要热点加持（调用 article-hotspot）

Step 2: 热点调研（可选）
  └── 使用 article-hotspot skill 获取切入角度

Step 3: 标题生成
  ├── 4 种公式：冲突型 / 疑问型 / 数字型 / 否定型
  └── 每次生成 3-5 个候选，让用户挑选

Step 4: 结构生成
  ├── 工具介绍型：痛点 → 工具 → 实测 → 对比 → 总结
  ├── 方法教程型：场景 → 方法 → 步骤 → 案例 → 要点
  └── 深度思考型：现象 → 追问 → 剖析 → 洞察 → 启示

Step 5: 正文创作
  └── 遵循作者配置的语言风格，使用金句收束关键段

Step 6: 爆款要素检查
  └── 开头钩子 / 信息密度 / 情绪点 / 互动设计 / 金句

Step 7: 去 AI 化润色
  └── 调用 article-depolish 或按 references/workflow.md 流程自行处理
```

## 文件导航

本 skill 采用渐进披露，详细方法论按需加载：

### references/（按需读取）

| 文件 | 用途 | 何时读 |
|------|------|--------|
| **methodology.md** | 公众号爆款核心方法论：4 种标题 / 3 种结构 / 爆款要素 | Step 3-6 的理论基础 |
| **workflow.md** | 完整创作工作流程（含每步的 prompt 与检查点） | Step 1-7 逐步执行时的详细指南 |
| **deep-cognition.md** | 深度认知型内容写作框架（适用于思考类深稿） | 当文章类型为"深度思考型"时 |
| **tools.md** | 写作辅助工具手册：标题 / 结构 / 优化 / 金句 / 检查命令 | 执行 `/标题生成` `/结构生成` `/金句生成` `/爆款检查` 时 |
| **quick-ref.md** | 速查卡：一页纸汇总常用模板与检查项 | 用户要快速查询时 |
| **system.md** | 系统架构说明（可选读） | 用户问"这套系统是怎么工作的" |

### assets/（用于生成输出）

| 文件 | 用途 |
|------|------|
| **author-template.md** | 作者配置空白模板，复制给用户填写 |
| **author-example.md** | 配置示例，作为填写参考 |

## 命令速查

原仓库定义的 8 个命令，实现位于 `references/tools.md` 和 `references/methodology.md`：

| 命令 | 功能 | 归属文件 |
|------|------|---------|
| `/热点` | 抓取热点话题 | 建议转用 `article-hotspot` skill |
| `/标题生成` | 生成 4 种类型候选标题 | `tools.md` |
| `/结构生成` | 输出文章大纲 | `tools.md` |
| `/内容优化` | 优化单段语言风格 | `tools.md` |
| `/金句生成` | 生成可传播金句 | `tools.md` |
| `/爆款检查` | 对照 checklist 自检 | `methodology.md` |
| `/话题推荐` | 结合领域推荐选题 | `tools.md` |
| `/去AI化` | 去 AI 特征 | 建议转用 `article-depolish` skill |

## 与其他 skill 的协作

```
article-hotspot   →   article-write   →   article-depolish
  (热点调研)          (正文创作)           (去 AI 化润色)
```

- **前置**：创作前用 `article-hotspot` 拿到切入点 / 差异化角度
- **后置**：成稿后用 `article-depolish` 去除机械感

## 关键约束

1. **作者配置是单一事实来源**：任何风格决策都要回查配置，不要凭记忆假设
2. **中文原生**：标题 / 正文 / 金句全部中文，不要混入英文风格的书面语
3. **爆款 ≠ 标题党**：四种标题公式强调"冲突 / 疑问 / 数字 / 否定"的修辞张力，不鼓励虚假承诺
4. **原文引用保真**：引用用户素材时原样保留，不要改写后假装是原文
