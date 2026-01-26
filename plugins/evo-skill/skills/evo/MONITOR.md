# Evo 自动监控

将以下内容添加到项目的 CLAUDE.md 以启用自动监控。

---

## Evo 流程监控

在工作过程中，持续监控以下信号并更新 `.evo-state.json`：

### 信号检测规则

**1. retry_loops（重复试错）**
检测条件（满足任一即记录）：
- 同一个错误/问题连续尝试 2+ 次未解决
- 同一段代码在 10 分钟内修改 3+ 次
- 测试失败后的修复尝试超过 3 轮

**2. interrupted_flows（流程中断）**
检测条件（满足任一即记录）：
- 用户明确说"先不管这个"、"等会再说"、"跳过"
- 任务切换时前一个任务未完成且未说明原因
- debugging/实现过程被打断超过 30 分钟未恢复

**3. git_churn（代码翻动）**
检测条件（满足任一即记录）：
- 同一文件在最近 5 个 commit 中出现 3+ 次修改
- 出现 revert commit
- fix: 类型 commit 针对同一功能连续 2+ 次

### 检测到信号时的行为

1. 读取项目根目录的 `.evo-state.json`（不存在则创建初始结构）
2. 更新对应信号类型的 `count` 和 `instances` 数组
3. 检查是否有任一信号的 `count >= threshold`（默认阈值为 3）
4. 若达到阈值，在当前回复末尾提示：

   > **[Evo]** 检测到流程问题信号（{信号类型} 已达 {count} 次），建议执行 `/evo` 进行分析。

### .evo-state.json 初始结构

首次检测到信号时，若文件不存在，创建以下结构：

```json
{
  "version": "1.0",
  "project": "{当前项目名}",
  "signals": {
    "retry_loops": { "count": 0, "threshold": 3, "instances": [] },
    "interrupted_flows": { "count": 0, "threshold": 3, "instances": [] },
    "git_churn": { "count": 0, "threshold": 3, "instances": [] }
  },
  "last_analysis": null,
  "pending_improvements": []
}
```

### 记录实例的格式

```json
{
  "timestamp": "ISO8601 时间戳",
  "context": "简短描述发生了什么",
  "pattern": "匹配的检测规则"
}
```
