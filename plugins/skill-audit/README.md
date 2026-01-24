# Skill Audit

Skill 重叠分析工具 - 检测已安装 skills/commands 的功能重复，辅助精简配置。

## 功能特性

- **audit:scan** - 全量扫描，标签快筛 + AI 深度对比，生成重叠分析报告
- **audit:resolve** - 交互式处理重叠组，确认保留或禁用
- **audit:status** - 查看当前安装状态、禁用列表和待处理重叠

## 安装

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install audit@skill-market
```

## 使用方法

### 扫描分析

```
/audit:scan                # 全量分析（标签 + AI 对比）
/audit:scan --quick        # 仅标签分析，快速预览
/audit:scan --focus deploy # 聚焦某个领域
```

### 处理重叠

```
/audit:resolve             # 逐组交互式处理
/audit:resolve --group 2   # 只处理第 2 组
/audit:resolve --undo      # 恢复所有禁用
/audit:resolve --dry-run   # 预览操作
```

### 查看状态

```
/audit:status              # 简要状态
/audit:status --verbose    # 详细列出所有 skill
```

## 分析流程

1. **收集** — 扫描 commands/ 和已安装 plugins 的所有 skill
2. **标签提取** — 从名称、描述、内容提取功能标签
3. **快筛** — 计算标签交集率，筛选高疑似重叠
4. **AI 对比** — 对高疑似组进行深度功能对比分析
5. **报告** — 输出重叠组、独有能力和建议

## 安全原则

- scan 完全只读，不修改任何文件
- resolve 操作需用户逐步确认
- 禁用 = 移至 .disabled/ 目录，可随时恢复
- 不删除任何文件
- 只处理用户级配置，不碰项目级

## 缓存文件

`~/.claude/audit-cache.json` — 存储扫描结果和禁用记录。

## License

MIT
