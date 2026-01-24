---
name: init
description: "初始化部署配置 - 自动检测项目结构并生成 .deploy.yaml"
---

# /deploy:init - 初始化部署配置

自动检测项目结构，生成 `.deploy.yaml` 配置文件。

## 使用方式

```
/deploy:init                     # 自动检测并生成配置
/deploy:init --strategy k8s      # 指定策略
```

## 执行步骤

### Step 1: 检测项目结构

```bash
echo "[INFO] 检测项目结构..."

# 检测部署策略
DETECTED_STRATEGIES=""

[ -d "helm" ] && DETECTED_STRATEGIES="$DETECTED_STRATEGIES k8s"
[ -f "docker-compose.yml" ] && DETECTED_STRATEGIES="$DETECTED_STRATEGIES compose"
[ -f "docker-compose.prod.yml" ] && DETECTED_STRATEGIES="$DETECTED_STRATEGIES compose"
[ -f "vercel.json" ] && DETECTED_STRATEGIES="$DETECTED_STRATEGIES vercel"
[ -f "fly.toml" ] && DETECTED_STRATEGIES="$DETECTED_STRATEGIES fly"
[ -f "Dockerfile" ] && DETECTED_STRATEGIES="$DETECTED_STRATEGIES docker-ssh"

echo "[INFO] 检测到策略: $DETECTED_STRATEGIES"
```

### Step 2: 收集信息

使用 AskUserQuestion 确认或补充信息：

1. **策略选择** — 如果检测到多个，让用户选择
2. **项目名称** — 从 package.json / go.mod / 目录名推断
3. **环境列表** — 从 helm/environments 或询问用户

### Step 3: 策略专属信息收集

**K8s：**
- 从 justfile/Makefile 提取 registry 信息
- 从 helm/ 目录发现 chart 和 values
- 从 .service-tags.json 或 services/ 发现组件
- 从 helm/environments/ 发现环境配置

**Compose：**
- 解析 docker-compose.yml 中的 services
- 检测远程部署目标（如有）

**Vercel/Fly：**
- 从 vercel.json / fly.toml 读取项目配置

### Step 4: 生成 .deploy.yaml

**K8s 模板：**
```yaml
strategy: k8s

project:
  name: {project_name}
  description: {description}

registry:
  domain: {registry_domain}
  namespace: {registry_namespace}
  overrides:
    prd: {vpc_registry}

components:
  - name: {component}
    path: services/{component}
    image: {project}-{component}

environments:
  dev:
    cluster: {cluster}
    namespace: {namespace}
    context: {context}
  prd:
    cluster: {cluster}
    namespace: {namespace}
    context: {context}

commands:
  build: "{build_cmd}"
  push: "{push_cmd}"
  deploy: "{deploy_cmd}"
  config: "{config_cmd}"

helm:
  chart_path: helm/{chart}
  release_name: {release}

monitor:
  interval: 5
  timeout: 600
  failure_threshold: 3
```

**Compose 模板：**
```yaml
strategy: compose

project:
  name: {project_name}

compose:
  file: docker-compose.prod.yml
  # 远程部署（可选）
  host: {user}@{server}
  path: /opt/{project_name}

environments:
  dev:
    file: docker-compose.yml
  prd:
    file: docker-compose.prod.yml

commands:
  deploy: "docker compose -f {file} up -d"
  logs: "docker compose -f {file} logs -f"

monitor:
  interval: 5
  timeout: 120
```

**Vercel 模板：**
```yaml
strategy: vercel

project:
  name: {project_name}

environments:
  preview:
    auto: true
  prd:
    branch: main
    prod: true

commands:
  deploy: "vercel --prod"
  preview: "vercel"
```

### Step 5: 确认配置

显示生成的配置文件，询问用户确认或修改。

## 输出

- 在项目根目录生成 `.deploy.yaml`
- 建议将 `.deploy.yaml` 加入版本控制（不含敏感信息时）

## 注意事项

- 如果 `.deploy.yaml` 已存在，询问是否覆盖
- 敏感信息（credentials、tokens）不写入配置文件
- 配置文件中使用占位符的命令模板，实际值从环境变量读取
