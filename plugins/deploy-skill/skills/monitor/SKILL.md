---
name: monitor
description: "部署状态监控 - 实时跟踪部署进度、检测异常、输出日志"
---

# /deploy:monitor - 部署监控

监控进行中的部署状态，检测异常并提供诊断信息。

## 安全原则

**只监控、只报告。** 发现应用层错误时停止监控，报告问题并建议转交处理。严禁自动修改应用代码来"修复"问题。

## 使用方式

```
/deploy:monitor <env> [options]

选项:
  --timeout <seconds>   超时时间（默认 600）
  --interval <seconds>  轮询间隔（默认 5）
  --logs                同时显示 Pod 日志
  --strategy <type>     指定策略
```

## 执行步骤

### Step 1: 确定监控目标

根据策略确定要监控的资源：

**K8s：** Deployment replicas、Pod status、Events
**Compose：** Container status、health checks
**Vercel/Fly：** Deployment status API

### Step 2: 轮询监控

**K8s 监控：**

```bash
TIMEOUT=${TIMEOUT:-600}
INTERVAL=${INTERVAL:-5}
START_TIME=$(date +%s)

while true; do
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -gt $TIMEOUT ]; then
        echo "[TIMEOUT] 超过 ${TIMEOUT}s 未完成"
        break
    fi

    echo "[INFO] ===== $(date +%H:%M:%S) (${ELAPSED}s) ====="

    # Deployment 状态
    kubectl get deployment -n $NAMESPACE -l "$INSTANCE_LABEL" $KUBECTL_ARGS \
        -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,DESIRED:.spec.replicas,UP-TO-DATE:.status.updatedReplicas"

    # Pod 状态
    kubectl get pods -n $NAMESPACE -l "$INSTANCE_LABEL" $KUBECTL_ARGS \
        -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,AGE:.metadata.creationTimestamp"

    # 异常事件
    WARNINGS=$(kubectl get events -n $NAMESPACE $KUBECTL_ARGS \
        --field-selector type=Warning --sort-by='.lastTimestamp' 2>/dev/null | tail -5)
    if [ -n "$WARNINGS" ]; then
        echo ""
        echo "[WARN] 异常事件:"
        echo "$WARNINGS"
    fi

    # 检查是否全部就绪
    NOT_READY=$(kubectl get deployment -n $NAMESPACE -l "$INSTANCE_LABEL" $KUBECTL_ARGS \
        -o jsonpath='{range .items[*]}{.metadata.name}:{.status.readyReplicas}/{.spec.replicas}{"\n"}{end}' \
        | grep -v -E "^[^:]+:([0-9]+)/\1$" | wc -l | tr -d ' ')

    if [ "$NOT_READY" -eq 0 ]; then
        echo ""
        echo "[SUCCESS] ✓ 所有 Deployment 已就绪"
        break
    fi

    sleep $INTERVAL
done
```

**Compose 监控：**

```bash
while true; do
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

    # 检查是否全部 healthy
    UNHEALTHY=$(docker compose ps --format json | jq -r 'select(.Health != "healthy") | .Name')
    if [ -z "$UNHEALTHY" ]; then
        echo "[SUCCESS] ✓ 所有容器 healthy"
        break
    fi

    sleep $INTERVAL
done
```

### Step 3: 异常处理

**检测到的异常类型及处理：**

| 异常 | 处理方式 |
|------|---------|
| ImagePullBackOff | 报告镜像拉取失败，检查 tag 和 registry 权限 |
| CrashLoopBackOff | ⚠️ **停止监控**，输出 Pod 日志，建议检查应用代码 |
| OOMKilled | 报告内存不足，建议调整 resource limits |
| Pending (长时间) | 检查节点资源和调度约束 |
| CreateContainerConfigError | 报告配置错误，检查 ConfigMap/Secret |

**CrashLoopBackOff 特殊处理（应用逻辑问题）：**

```
[ERROR] 检测到 Pod 持续崩溃 (CrashLoopBackOff)

容器: myapp-core-5f8b9c7d4-x2j9k
重启次数: 5
最近日志:
  panic: runtime error: index out of range [3]
  goroutine 1 [running]:
  main.handleRequest(...)
      /app/handlers/user.go:42

⚠️ 这是应用逻辑错误，部署监控已停止。
建议:
  1. 检查 handlers/user.go:42 的数组越界问题
  2. 修复后重新构建镜像
  3. 使用 /deploy:run uat core 重新部署

如需回滚到上一版本:
  kubectl rollout undo deployment/myapp-core -n $NAMESPACE
```

### Step 4: 监控结束

**成功：**
```
[SUCCESS] 部署完成
  耗时: 45s
  组件: core (1/1), ops (1/1), admin (1/1)
  环境: uat
```

**失败（非逻辑问题）：**
提供具体修复建议（配置、资源、网络）。

**失败（逻辑问题）：**
停止监控，输出诊断信息，明确建议转交处理。

## 注意事项

- 监控期间不执行任何修改操作
- CrashLoopBackOff 等应用错误立即停止并报告
- 提供回滚命令供用户选择
- 超时后不自动重试，等待用户指示
