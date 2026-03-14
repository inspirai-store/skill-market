# Story Skill - 小说分析与短剧改编

从小说原文到短剧剧本的全链路工具——先提取结构化梗概，再改编为具有电影感的分镜剧本。

## 功能

- **story:extract** - 小说梗概提取：拆解人物图谱、场景清单、道具流转、事件链、故事线、伏笔网，提炼故事吸引力内核
- **story:adapt** - 小说转短剧改编：将梗概素材转化为幕式结构的分镜剧本，含镜头语言、声音设计、碰撞设计、叙事钩子

## 工作流

```
小说原文 → story:extract（分析） → 结构化梗概 → story:adapt（创作） → 分镜剧本
```

两个 skill 可独立使用，也可串联使用：
- `story:extract` 单独使用：为任何下游改编（短剧/长剧/漫画/游戏）提供结构化素材
- `story:adapt` 单独使用：已有梗概时直接进入短剧改编

## 安装

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install story@skill-market
```

## 使用

```
/story:extract    # 提供小说原文，输出结构化梗概
/story:adapt      # 基于梗概或原文，输出分镜剧本
```

## License

MIT
