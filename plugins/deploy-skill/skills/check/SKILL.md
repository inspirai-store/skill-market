---
name: check
description: "部署预检查 - 镜像、配置、连通性等检查，确保部署条件就绪"
---

# /deploy:check - 预检查

执行部署前的预检查，确保所有条件就绪。

## 安全原则

**只检查、只报告，不修改任何文件。** 发现问题后提供修复建议，由用户决定是否执行。

## 使用方式

```
/deploy:check <env> [components...] [options]

选项:
  --image-only         仅检查镜像
  --config-only        仅检查配置
  --connectivity-only  仅检查连通性
  --strategy <type>    指定策略
```

## 执行步骤

### Step 1: 检测策略并加载配置

同 `/deploy:run` Step 1。

### Step 2: 通用检查

所有策略都执行的检查：

```bash
echo "[INFO] ========== 通用预检查 =========="

# 1. 环境变量检查
echo "[CHECK] 环境变量..."
# 检查 .env / .env.{env} 是否存在必需变量

# 2. Git 状态检查
echo "[CHECK] Git 状态..."
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo "[WARN] 有 $UNCOMMITTED 个未提交的变更"
fi

# 3. 分支检查（生产环境）
if [ "$ENV" = "prd" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
        echo "[WARN] 当前分支 $BRANCH 不是主分支"
    fi
fi
```

### Step 3: 策略专属检查

**K8s 策略：**

```bash
echo "[INFO] ========== K8s 预检查 =========="

# 1. 镜像推送检查
echo "[CHECK] 镜像推送状态..."
for comp in $COMPONENTS; do
    tag=$(get_version_tag "$comp" "$ENV")
    image="$REGISTRY/$NAMESPACE/${comp}:${tag}"
    if docker manifest inspect "$image" &>/dev/null; then
        echo "  ✓ $comp: $tag"
    else
        echo "  ✗ $comp: $tag (未推送)"
        FAILED=true
    fi
done

# 2. 配置同步检查
echo "[CHECK] 配置同步..."
# 渲染本地 Helm values vs 集群 ConfigMap/Secret
# 对比 data 字段差异

# 3. 集群连通性
echo "[CHECK] 集群连通性..."
kubectl cluster-info $KUBECTL_ARGS &>/dev/null || echo "[ERROR] 无法连接集群"

# 4. Namespace 存在性
kubectl get namespace "$NAMESPACE" $KUBECTL_ARGS &>/dev/null || echo "[ERROR] Namespace $NAMESPACE 不存在"
```

**Compose 策略：**

```bash
echo "[INFO] ========== Compose 预检查 =========="

# 1. 镜像构建检查
echo "[CHECK] 镜像构建..."
docker compose config --quiet || echo "[ERROR] compose 配置无效"

# 2. 目标主机连通性（远程部署时）
if [ -n "$DEPLOY_HOST" ]; then
    echo "[CHECK] 远程主机连通性..."
    ssh -o ConnectTimeout=5 "$DEPLOY_HOST" "echo ok" || echo "[ERROR] 无法连接 $DEPLOY_HOST"
fi

# 3. 磁盘空间
echo "[CHECK] 磁盘空间..."
docker system df
```

**Vercel/Fly 策略：**

```bash
echo "[INFO] ========== 平台预检查 =========="

# 1. CLI 登录状态
echo "[CHECK] 登录状态..."
vercel whoami || fly auth whoami || echo "[ERROR] 未登录"

# 2. 项目链接
echo "[CHECK] 项目链接..."
# 检查是否已 link 到远程项目
```

### Step 4: 输出报告

```
========== 预检查报告 ==========

环境: uat
策略: k8s
组件: core, ops, admin

通用检查:
  ✓ 环境变量完整
  ✓ Git 状态干净
  ✓ 分支: main

策略检查:
  ✓ 镜像: core (v1.2.3)
  ✗ 镜像: ops (v1.2.3) - 未推送
  ✓ 配置同步
  ✓ 集群连通

结果: 1 项失败
建议: 执行 `just push uat COMPONENTS="ops"` 推送镜像后重试
```

## 注意事项

- 检查过程完全只读，不修改任何文件或集群状态
- 失败项提供具体的修复命令建议
- 可单独运行用于 CI/CD pipeline 的 gate check
