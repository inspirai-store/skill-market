---
name: run
description: "智能部署 - 自动检测策略，执行预检查、部署和监控的完整流程"
---

# /deploy:run - 执行部署

自动检测部署策略，执行完整的 check → deploy → monitor 流程。

## 安全原则

**严禁修改应用逻辑代码。** 本 skill 只操作部署相关文件（配置、Dockerfile、Helm、compose 等）。

如果部署过程中发现问题源于应用逻辑：
1. **立即停止部署**
2. **报告问题详情**（错误日志、堆栈信息）
3. **建议转交专业技能处理**（如 `/wxm:dev`、代码修复等）
4. **设置检查点**，修复后可从当前步骤恢复部署

## 使用方式

```
/deploy:run <env> [components...] [options]

参数:
  env          目标环境 (dev/test/uat/prd)
  components   要部署的组件列表（默认: 全部）

选项:
  --skip-check         跳过所有预检查
  --skip-image-check   跳过镜像推送检查
  --skip-config-check  跳过配置同步检查
  --force              强制部署
  --strategy <type>    指定策略（跳过自动检测）
```

## 执行步骤

### Step 1: 检测部署策略

按优先级自动检测：

```bash
# 1. 显式配置
if [ -f ".deploy.yaml" ]; then
    STRATEGY=$(grep "^strategy:" .deploy.yaml | awk '{print $2}')
fi

# 2. 自动检测
if [ -z "$STRATEGY" ]; then
    if [ -d "helm" ] && command -v kubectl &>/dev/null; then
        STRATEGY="k8s"
    elif [ -f "docker-compose.yml" ] || [ -f "docker-compose.prod.yml" ]; then
        STRATEGY="compose"
    elif [ -f "vercel.json" ]; then
        STRATEGY="vercel"
    elif [ -f "fly.toml" ]; then
        STRATEGY="fly"
    elif [ -f "Dockerfile" ]; then
        STRATEGY="docker-ssh"
    elif [ -f "package.json" ]; then
        STRATEGY="script"
    else
        echo "[ERROR] 无法检测部署策略，请创建 .deploy.yaml"
        exit 1
    fi
fi

echo "[INFO] 部署策略: $STRATEGY"
```

### Step 2: 预检查（调用 /deploy:check）

执行策略对应的预检查，参见 `/deploy:check`。

如果检查失败：
- 展示失败原因
- 提供选项：修复后重试 / 跳过检查 / 中止

### Step 3: 执行部署

根据策略执行部署命令：

**K8s 策略：**
```bash
# 从 .deploy.yaml 或自动发现获取命令
DEPLOY_CMD=$(get_command "deploy" "$ENV")
# 通常是: just deploy $ENV 或 helm upgrade ...

echo "[INFO] 执行部署: $DEPLOY_CMD"
eval "$DEPLOY_CMD"
```

**Compose 策略：**
```bash
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
if [ "$ENV" = "prd" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

docker compose -f "$COMPOSE_FILE" up -d $COMPONENTS
```

**Vercel 策略：**
```bash
if [ "$ENV" = "prd" ]; then
    vercel --prod
else
    vercel
fi
```

**Fly 策略：**
```bash
fly deploy --app "$APP_NAME"
```

**Script 策略：**
```bash
# 从 package.json scripts 中查找
npm run deploy:$ENV
```

### Step 4: 监控（调用 /deploy:monitor）

部署命令执行后，自动进入监控模式，参见 `/deploy:monitor`。

### Step 5: 问题处理

**部署失败时的处理流程：**

```
检测到错误类型：
├── 配置错误（env vars、secrets）
│   → 提示修改部署配置，不触碰应用代码
├── 镜像拉取失败
│   → 检查 registry 连通性和镜像 tag
├── 健康检查失败（应用启动异常）
│   → ⚠️ 可能是逻辑问题
│   → 停止部署，输出日志
│   → 建议: "应用启动失败，建议检查应用代码后重新部署"
├── 资源不足（OOM、CPU limit）
│   → 提示调整资源配额
└── 未知错误
    → 输出完整日志，等待用户指示
```

**严格规则：任何涉及修改 .go / .ts / .js / .py 等业务代码的操作，必须停止并转交。**

## 检查点机制

每个步骤完成后设置检查点：
```
checkpoint: strategy_detected → checks_passed → deploy_submitted → monitoring
```

失败后恢复：
```
/deploy:run <env> --resume    # 从上次检查点恢复
```

## 示例

```
/deploy:run uat                    # 完整流程部署到 uat
/deploy:run prd core ops           # 只部署 core 和 ops 到生产
/deploy:run dev --skip-check       # 开发环境跳过检查
/deploy:run uat --strategy compose # 强制使用 compose 策略
```
