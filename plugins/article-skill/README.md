# article-skill

> 公众号爆款写作系统 - 风格自适应 / 热点抓取 / 完整创作工作流 / AI 文本去人工化

## 包含的 skills

| Skill | 触发场景 | 说明 |
|-------|---------|------|
| **article-write** | "写一篇关于 X 的文章" / "写公众号" / "写爆款" | 主创作流程（选题→标题→结构→正文→检查→润色） |
| **article-hotspot** | "找一下 X 领域的热点" / "分析爆款文章" | 创作前的话题调研，输出差异化切入角度 |
| **article-depolish** | "去 AI 化" / "人工化润色" / "让文字更像人写的" | 中文文本去 AI 味（去机械连接词 / 打破模板 / 节奏调整） |

## 使用流程

```
article-hotspot   →   article-write   →   article-depolish
  (调研)                (创作)              (润色)
```

三个 skill 可独立使用，也可串联。

## 作者配置（重要）

创作前请在工作目录放置 `author-config.md` / `作者配置.md`，定义笔名 / 身份 / 领域 / 人设 / 代表文章。

- 模板：`plugins/article-skill/skills/write/assets/author-template.md`
- 示例：`plugins/article-skill/skills/write/assets/author-example.md`

## 原始出处

本插件基于 [TanShilongMario/ArticleSkill](https://github.com/TanShilongMario/ArticleSkill)（MIT License）重组而来，已适配 Claude Code Plugin 规范（`.claude-plugin/plugin.json` + 多 skill 渐进披露结构）。原始方法论文档完整保留在各 skill 的 `references/` 目录中。

## License

MIT
