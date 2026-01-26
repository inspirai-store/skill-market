# Evo Skill - 技能自我进化

检测工作流中的问题信号（重复试错、流程中断、代码翻动），生成分析报告，并引导在独立 session 中处理改进。

## 安装

```bash
claude plugin install evo@skill-market
```

## 使用方式

```bash
/evo              # 执行完整分析流程
/evo --status     # 查看当前信号状态
/evo --report     # 仅生成报告，不进入交互
/evo --continue   # 继续处理 pending 改进项
```

## 功能特性

### 三种信号检测

| 信号类型 | 检测条件 |
|----------|----------|
| `retry_loops` | 同一问题连续尝试 2+ 次未解决 |
| `interrupted_flows` | 任务中断未恢复 |
| `git_churn` | 同一文件频繁修改或 revert |

### 核心原则

1. **非阻塞** - 分析快速完成，改进在独立 session 处理
2. **阈值触发** - 单类信号达到 3 次才建议分析
3. **双重存储** - 项目内详细报告 + 全局跨项目统计

### 自动监控

将 `MONITOR.md` 内容添加到项目的 `CLAUDE.md`，即可启用自动信号检测。当任一信号达到阈值时，AI 会自动提示执行 `/evo`。

## 文件说明

- `.evo-state.json` - 项目状态文件（建议加入 .gitignore）
- `docs/evo-reports/` - 分析报告目录
- `~/.claude/evo-stats/` - 全局跨项目统计

## License

MIT
