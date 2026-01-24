---
name: status
description: "查看当前 skill 启用状态、禁用列表和上次扫描摘要"
---

# /audit:status - 状态查看

快速查看当前 skills 的安装状态、禁用列表和上次扫描结果。

## 使用方式

```
/audit:status
/audit:status --verbose    # 详细展示每个 skill 的状态
```

## 参数

- `--verbose` — 列出所有已安装 skill 及其状态（启用/禁用）

## 执行步骤

### Step 1: 统计已安装数量

```bash
COMMANDS_DIR="$HOME/.claude/commands"
DISABLED_DIR="$COMMANDS_DIR/.disabled"
PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
CACHE_FILE="$HOME/.claude/audit-cache.json"

# 统计 commands
ACTIVE_COMMANDS=$(find "$COMMANDS_DIR" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
SUB_COMMANDS=$(find "$COMMANDS_DIR" -mindepth 2 -name "*.md" -not -path "*/.disabled/*" | wc -l | tr -d ' ')
DISABLED_COMMANDS=0
if [ -d "$DISABLED_DIR" ]; then
    DISABLED_COMMANDS=$(find "$DISABLED_DIR" -name "*.md" | wc -l | tr -d ' ')
fi

# 统计 plugins
ACTIVE_PLUGINS=$(jq '.plugins | keys | length' "$PLUGINS_FILE" 2>/dev/null || echo 0)
```

### Step 2: 读取扫描缓存

```bash
if [ -f "$CACHE_FILE" ]; then
    LAST_SCAN=$(jq -r '.lastScan' "$CACHE_FILE")
    TOTAL_GROUPS=$(jq '.overlapGroups | length' "$CACHE_FILE")
    RESOLVED=$(jq '[.overlapGroups[] | select(.resolved == true)] | length' "$CACHE_FILE")
    PENDING=$((TOTAL_GROUPS - RESOLVED))
    DISABLED_LIST=$(jq -r '.disabled[]' "$CACHE_FILE" 2>/dev/null)
else
    LAST_SCAN="从未扫描"
    TOTAL_GROUPS=0
    RESOLVED=0
    PENDING=0
fi
```

### Step 3: 输出状态

**基础模式：**

```
Skill Audit Status
──────────────────────────────────
已安装:  {ACTIVE_COMMANDS} commands + {SUB_COMMANDS} sub-commands + {ACTIVE_PLUGINS} plugins
已禁用:  {DISABLED_COMMANDS} commands
上次扫描: {LAST_SCAN}
重叠组:  {TOTAL_GROUPS} 组 (已处理 {RESOLVED}, 待处理 {PENDING})

禁用列表:
  - deploy.md (重叠: /deploy:run 完全覆盖)
  - make-it-pretty.md (重叠: frontend-design 覆盖)
```

**--verbose 模式（额外展示）：**

```
所有 Skills:
  Commands:
    [启用] /commit — Smart Git Commit
    [启用] /review — Code Review
    [禁用] /deploy — 基础部署 (被 /deploy:run 替代)
    [启用] /test — Smart Test Runner
    ...

  Plugins:
    [启用] superpowers@claude-plugins-official (15 skills)
    [启用] frontend-design@claude-plugins-official (1 skill)
    [启用] feature-dev@claude-plugins-official (3 skills)
    ...

  待处理重叠:
    #3 代码审查: /review vs superpowers:requesting-code-review
```

## 自动提醒逻辑

当用户执行 `plugin install` 后，如果检测到新安装的 plugin 在缓存中有潜在重叠记录，输出提醒：

```
[audit] 新安装的 {plugin_name} 可能与已有 skill 功能重叠
[audit] 运行 /audit:scan 查看详细分析
```

此提醒逻辑在 scan SKILL.md 的描述中声明为 agent 行为建议（非强制执行）。

## 注意事项

- 无缓存文件时提示先运行 `/audit:scan`
- 状态信息完全来自文件系统和缓存，不消耗 token
- `--verbose` 模式可能输出较长，适合排查具体 skill 状态
