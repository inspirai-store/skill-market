---
name: resolve
description: "交互式处理功能重叠 - 根据扫描报告逐组确认保留或禁用"
---

# /audit:resolve - 处理功能重叠

基于 `/audit:scan` 的分析结果，交互式引导用户处理每组重叠。

## 使用方式

```
/audit:resolve              # 处理所有未解决的重叠组
/audit:resolve --group 2    # 只处理第 2 组
/audit:resolve --undo       # 恢复上次禁用的 skills
```

## 参数

- `--group <n>` — 只处理指定编号的重叠组
- `--undo` — 恢复所有被禁用的 skills
- `--dry-run` — 预览将要执行的操作，不实际执行

## 前置检查

```bash
CACHE_FILE="$HOME/.claude/audit-cache.json"
if [ ! -f "$CACHE_FILE" ]; then
    echo "[INFO] 未找到扫描结果，请先运行 /audit:scan"
    exit 0
fi

# 检查是否有未解决的重叠组
UNRESOLVED=$(jq '[.overlapGroups[] | select(.resolved == false)] | length' "$CACHE_FILE")
if [ "$UNRESOLVED" -eq 0 ]; then
    echo "[INFO] 所有重叠组已处理完毕，无需操作"
    exit 0
fi
```

## 执行步骤

### Step 1: 加载扫描结果

从 `~/.claude/audit-cache.json` 读取未处理的重叠组。

### Step 2: 逐组展示并等待决策

对每个未解决的重叠组，展示详情并使用 AskUserQuestion 让用户选择：

```
━━━ 重叠组 #{n}: {领域} (置信度: {level}) ━━━━━━
  A) {skill_id}  — {描述}
  B) {skill_id}  — {描述}

  重叠: {重叠点}
  建议: {recommendation}
```

用户选项：
1. **保留 A，禁用 B** — 按建议操作
2. **保留 B，禁用 A** — 反向选择
3. **全部保留** — 标记为已处理但不禁用
4. **跳过** — 暂不处理

### Step 3: 收集所有决策后确认

所有组处理完毕后，汇总展示即将执行的操作：

```
即将执行以下操作：

  禁用: /deploy (command) → 移至 .disabled/
  禁用: /make-it-pretty (command) → 移至 .disabled/
  保留: frontend-design, ui-ux-pro-max, /review, ...

确认执行？(Y/n)
```

### Step 4: 执行禁用操作

**禁用 command：**
```bash
DISABLED_DIR="$HOME/.claude/commands/.disabled"
mkdir -p "$DISABLED_DIR"

# 移动文件到 .disabled 目录
mv "$HOME/.claude/commands/deploy.md" "$DISABLED_DIR/deploy.md"
echo "[OK] 已禁用 /deploy → .disabled/deploy.md"
```

**禁用 plugin skill：**
```bash
# 在 installed_plugins.json 中添加 disabled 标记
# 或者更简单：在 audit-cache.json 中记录禁用状态
# Claude Code 加载时检查此标记
PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"

# 方案：通过移除 installed_plugins.json 中的条目实现
# 但保留在 audit-cache.json 中以便恢复
jq ".plugins.\"${PLUGIN_KEY}\" += [{\"disabled\": true}]" "$PLUGINS_FILE" > tmp && mv tmp "$PLUGINS_FILE"
```

**注意：** 对于 plugin 的禁用，优先使用 `claude plugin uninstall` 命令（如果可用），并在 audit-cache.json 中记录以便恢复。

### Step 5: 更新缓存

```bash
# 标记已处理的组
jq ".overlapGroups[$GROUP_INDEX].resolved = true" "$CACHE_FILE" > tmp && mv tmp "$CACHE_FILE"

# 记录禁用的 skills（用于 undo）
jq ".disabled += [\"$SKILL_ID\"]" "$CACHE_FILE" > tmp && mv tmp "$CACHE_FILE"
```

## --undo 恢复流程

```bash
if [ "$MODE" = "undo" ]; then
    DISABLED_DIR="$HOME/.claude/commands/.disabled"

    # 恢复所有 .disabled 目录中的 commands
    if [ -d "$DISABLED_DIR" ]; then
        for f in "$DISABLED_DIR"/*.md; do
            [ -f "$f" ] || continue
            mv "$f" "$HOME/.claude/commands/$(basename "$f")"
            echo "[OK] 已恢复 /$(basename "$f" .md)"
        done
    fi

    # 恢复 plugins（从 cache 记录中重新安装）
    DISABLED_PLUGINS=$(jq -r '.disabled[] | select(startswith("plugin:"))' "$CACHE_FILE")
    for p in $DISABLED_PLUGINS; do
        echo "[INFO] 请手动运行: claude plugin install ${p#plugin:}"
    done

    # 清空禁用记录
    jq '.disabled = [] | .overlapGroups[].resolved = false' "$CACHE_FILE" > tmp && mv tmp "$CACHE_FILE"
    echo "[OK] 所有禁用已恢复"
fi
```

## 安全规则

- **确认前不执行** — 所有操作在用户最终确认后才批量执行
- **可恢复** — command 只是移动到 .disabled/，随时可用 --undo 恢复
- **不删除** — 永远不 rm 任何文件，只做移动
- **不碰项目级** — 只处理 `~/.claude/commands/`，不碰项目 `.claude/commands/`
- **plugin 谨慎处理** — plugin 禁用记录在 cache 中，不直接修改 installed_plugins.json 结构

## 注意事项

- 首次使用前必须先运行 `/audit:scan`
- `--dry-run` 可预览操作效果
- 禁用的 command 在 `.disabled/` 目录，不会被 Claude Code 加载
- 恢复 plugin 可能需要手动 `claude plugin install`
