---
name: scan
description: "全量扫描已安装的 skills/commands，分析功能重叠并生成报告"
---

# /audit:scan - 功能重叠分析

扫描所有已安装的 commands 和 plugins，检测功能重叠，生成分析报告。

## 使用方式

```
/audit:scan
/audit:scan --quick        # 仅标签分析，跳过 AI 深度对比
/audit:scan --focus deploy  # 只分析与 deploy 相关的重叠
```

## 参数

- `--quick` — 仅执行标签分析，不做 AI 深度对比（速度快）
- `--focus <keyword>` — 聚焦分析某个功能领域的重叠
- `--include-project` — 同时扫描项目级 `.claude/commands/`（默认只扫描用户级）

## 执行步骤

### Step 1: 收集所有已安装 Skill

扫描以下路径，收集所有 skill 的元信息：

```bash
# 1. 用户级 commands
COMMANDS_DIR="$HOME/.claude/commands"
find "$COMMANDS_DIR" -name "*.md" -not -path "*/.disabled/*" | while read f; do
    echo "command:$(basename "$f" .md):$f"
done

# 2. 子目录 commands (如 gh/fix-issue.md → /gh:fix-issue)
find "$COMMANDS_DIR" -mindepth 2 -name "*.md" | while read f; do
    DIR=$(basename "$(dirname "$f")")
    NAME=$(basename "$f" .md)
    echo "command:${DIR}:${NAME}:$f"
done

# 3. 已安装 plugins
PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
# 解析 JSON 获取每个插件的 installPath
# 读取每个插件下 skills/*/SKILL.md
```

为每个 skill 建立信息记录：
```
{
  "id": "command:deploy" | "plugin:deploy:run",
  "type": "command" | "plugin-skill",
  "name": "deploy",
  "source": "~/.claude/commands/deploy.md" | "deploy@skill-market",
  "description": "...",
  "content_summary": "前200字摘要"
}
```

### Step 2: 功能标签提取

对每个 skill 提取功能标签：

**标签维度：**

| 维度 | 标签示例 |
|------|---------|
| 领域 | deploy, review, test, format, refactor, scaffold, ui, docs, git, security, cloud, wechat, api |
| 动作 | generate, analyze, fix, create, monitor, scan, build, install, migrate |
| 技术栈 | frontend, backend, k8s, docker, node, python, react, aliyun |

**提取规则：**

1. **文件名/skill名** — 直接作为领域标签
2. **description 字段** — 提取关键词匹配标签库
3. **内容关键词** — 扫描正文，匹配预定义标签词典：

```
标签词典 = {
  "deploy": ["部署", "deploy", "release", "rollout", "发布"],
  "review": ["review", "审查", "code review", "PR"],
  "test": ["test", "测试", "spec", "assert", "coverage"],
  "format": ["format", "格式化", "lint", "prettier", "eslint"],
  "refactor": ["refactor", "重构", "restructure", "cleanup"],
  "ui": ["UI", "界面", "component", "组件", "frontend", "style", "CSS"],
  "generate": ["generate", "生成", "create", "scaffold", "template"],
  "security": ["security", "安全", "vulnerability", "漏洞", "scan"],
  "docs": ["documentation", "文档", "README", "注释", "comment"],
  "git": ["git", "commit", "branch", "merge", "PR", "pull request"],
  ...
}
```

4. 每个 skill 最终得到 3-8 个标签

### Step 3: 重叠候选检测

对所有 skill 两两计算标签交集率：

```
overlap_score(A, B) = |tags(A) ∩ tags(B)| / min(|tags(A)|, |tags(B)|)
```

分级：
- `>= 0.6` → **高疑似重叠** → 进入 Step 4
- `0.3 ~ 0.6` → **中度疑似** → 标记在报告中但不深度分析
- `< 0.3` → 无关，跳过

将高疑似的 pair 聚合为**重叠组**（连通分量）：
- 如果 A-B 重叠且 B-C 重叠，合并为 {A, B, C} 一组

### Step 4: AI 深度对比（非 --quick 模式）

对每个高疑似重叠组，将所有成员的 SKILL.md 内容一起分析：

**分析提示词：**

```
请分析以下 skills 的功能重叠情况：

[Skill A - {name}]
{SKILL.md 内容摘要，前500字}

[Skill B - {name}]
{SKILL.md 内容摘要，前500字}

请回答：
1. 功能重叠度（高/中/低/无）
2. 重叠的具体功能点
3. 各 skill 的独有能力
4. 推荐保留哪个（基于完整度和覆盖面）
5. 置信度（高/中/低）
```

### Step 5: 生成报告

输出格式：

```
╔══════════════════════════════════════════════════╗
║  Skill Audit Report                             ║
╠══════════════════════════════════════════════════╣
║  扫描: {N} commands + {M} plugins ({T} skills)  ║
║  发现: {G} 组功能重叠                            ║
╚══════════════════════════════════════════════════╝

━━━ 重叠组 #1: {领域} (置信度: {高/中/低}) ━━━━━━
  A) {skill_id}  — {一句话描述}
  B) {skill_id}  — {一句话描述}

  重叠: {重叠功能点}
  A 独有: {独有能力}
  B 独有: {独有能力}

  → 建议: {保留/禁用建议}

━━━ 重叠组 #2: ... ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ...
```

### Step 6: 缓存结果

将扫描结果写入缓存文件：

```bash
CACHE_FILE="$HOME/.claude/audit-cache.json"
```

```json
{
  "lastScan": "2026-01-24T12:00:00Z",
  "skillCount": 42,
  "overlapGroups": [
    {
      "id": "group-1",
      "domain": "deploy",
      "confidence": "high",
      "members": ["command:deploy", "plugin:deploy:run"],
      "recommendation": "disable command:deploy",
      "resolved": false
    }
  ],
  "disabled": []
}
```

## 输出示例

```
扫描完成: 28 commands + 11 plugins (42 skills)

发现 4 组功能重叠:

#1 部署 (高): /deploy vs /deploy:run → 建议禁用 command
#2 前端 (中): /make-it-pretty vs frontend-design vs ui-ux-pro-max
#3 代码审查 (中): /review vs superpowers:requesting-code-review
#4 规范设计 (低): /spec vs kiro:spec

运行 /audit:resolve 处理这些重叠。
```

## 注意事项

- 标签提取基于关键词匹配，可能存在误判，以 AI 深度对比结果为准
- `--quick` 模式不消耗额外 token，适合快速预览
- 扫描不会修改任何文件，完全只读
- 缓存文件用于 status 和增量对比，可安全删除
