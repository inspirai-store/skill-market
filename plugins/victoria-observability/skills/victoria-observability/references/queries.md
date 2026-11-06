# 查询配方：按实际数据修改

以下是常见模式，不是必须存在的 schema。先核对 MCP 工具的 inputSchema；工具名可能有客户端前缀。以下使用工具原名。`cluster`、`namespace`、`pod`、`service` 和日志字段要按目标环境替换；不要对不同环境盲目套用 dev 过滤器。

## 入口与时间

- 指标：`metrics` / `labels` / `label_values` / `series` 发现数据，`query` 查某时间点，`query_range` 查变化。
- 日志：`field_names` / `field_values` / `facets` 发现字段，`query` 搜索及聚合；`stats_query`、`hits`、`stats_query_range` 的参数以目录为准。
- 当前接入的 VictoriaLogs MCP 的 `query` 需要 `query` 与 `start`；指标 `query` 通常只要求查询表达式，`query_range` 需要时间范围与 step。不是所有版本都相同。
- 使用明确的 RFC3339 时间。例如 `2026-11-06T18:00:00+08:00` 与 `2026-11-06T10:00:00Z` 表示同一时刻。不要把本文示例日期当成当前时间。

参数结构示意：

```json
{
  "query": "cluster:dev kubernetes.namespace_name:dev",
  "start": "2026-11-06T10:00:00Z",
  "end": "2026-11-06T10:15:00Z",
  "limit": 50
}
```

将时间与过滤器改为本次任务后，再保存成 `query.json` 供后备工具读取。

## 先判断采集链路

```promql
up{cluster="dev"}
up{cluster="dev"} == 0
```

`up=0` 代表该抓取目标失败，不等于业务服务必然宕机；没有匹配序列也不等于健康。结合目标目录、标签、采集配置或其他数据检查。新部署没有足够历史样本时不要强行解释 rate/increase。

## Kubernetes / 容器

近期重启增量，而不是累计最多的 Pod：

```promql
topk(5,increase(kube_pod_container_status_restarts_total{cluster="dev",namespace="dev"}[15m]))
kube_pod_container_status_waiting_reason{cluster="dev",namespace="dev",reason="CrashLoopBackOff"} == 1
```

资源变化：CPU 的结果单位是核，内存单位是字节；不要把 CPU 核数直接当百分比。

```promql
sum by(pod)(rate(container_cpu_usage_seconds_total{cluster="dev",namespace="dev",container!="",container!="POD"}[5m]))
sum by(pod)(container_memory_working_set_bytes{cluster="dev",namespace="dev",container!="",container!="POD"})
node_memory_MemAvailable_bytes{cluster="dev"}
```

持续抓取的旧 Failed Pod/Job 会持续出现在状态序列中。确认对象身份、结束时间、所属控制器和替代实例，不把旧对象解释成新故障。终止原因、OOM、CPU throttling 等仅在实际采集对应指标或事件时使用。

## 日志聚合，再取原文

```text
cluster:dev kubernetes.namespace_name:dev | stats by (kubernetes.pod_name) count()
cluster:dev kubernetes.namespace_name:dev level:error | stats by (service) count()
cluster:dev kubernetes.pod_name:"YOUR_POD_NAME"
cluster:dev trace_id:"YOUR_TRACE_ID"
cluster:dev telemetry_type:kubernetes_events | stats by (reason) count()
```

若应用没输出 `level` 或 `service`，先发现实际字段，再使用关键字或已有容器元数据；匹配 `error` 的行数不是业务失败请求数。多行栈追踪、同一错误的多次记录和采样都会影响计数。

## 业务指标与关联

业务 QPS、错误率、延迟需要应用实际暴露相应指标。先通过指标发现功能确认名称、单位、status/route 等标签，以及 histogram 的类型；再构造 rate、比例或分位数查询，不编造 metric 名称。

关联时优先使用同一 cluster + namespace + Pod UID/名称 + container + 时间窗，再使用实际存在的 trace_id/request_id。部署版本、事件或配置变更与异常同时间出现只能说明相关，不能单独证明因果。

报告可以简洁到：目标与时间窗、已证实的现象、最可能解释、尚缺的证据、下一项只读检查。不要强制每次都查询所有信号或做一次全环境巡检。

## 接口参考

遇到不支持的语法/参数时核对实际版本及官方文档，不要扩大权限解决查询错误。

- [VictoriaMetrics MCP](https://github.com/VictoriaMetrics/mcp-victoriametrics)
- [VictoriaLogs MCP](https://github.com/VictoriaMetrics/mcp-victorialogs)
- [VictoriaLogs LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/)
- [VictoriaMetrics MetricsQL](https://docs.victoriametrics.com/victoriametrics/metricsql/)
