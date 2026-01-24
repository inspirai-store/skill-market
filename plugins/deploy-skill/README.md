# Deploy Plugin

智能部署工具 - 自动检测部署策略，预检查、发布、监控一体化。

## 安全原则

**严禁修改应用逻辑代码。** Deploy 只关心配置和部署过程。如果发现问题源于应用逻辑，立即停止并建议转交专业技能处理。

## 功能特性

- **deploy:init** - 初始化部署配置，自动检测项目结构
- **deploy:run** - 完整部署流程（检测 → 检查 → 部署 → 监控）
- **deploy:check** - 预检查（镜像、配置、连通性）
- **deploy:monitor** - 实时监控部署状态

## 支持的部署策略

| 策略 | 检测条件 | 状态 |
|------|---------|------|
| k8s | `helm/` + kubectl | ✅ 完整实现 |
| compose | docker-compose.yml | ✅ 基础实现 |
| vercel | vercel.json | 🚧 基础支持 |
| fly | fly.toml | 🚧 基础支持 |
| docker-ssh | Dockerfile only | 🚧 计划中 |
| script | package.json scripts | 🚧 计划中 |

## 安装

```bash
claude plugin marketplace add inspirai-store/skill-market
claude plugin install deploy@skill-market
```

或在 Claude Code 交互模式中：
```
/plugin marketplace add inspirai-store/skill-market
/plugin install deploy@skill-market
```

### 前置依赖

根据使用的策略安装对应工具：

**K8s：**
```bash
brew install kubectl helm docker
```

**Compose：**
```bash
brew install docker docker-compose
```

**Vercel / Fly：**
```bash
npm i -g vercel
# 或
brew install flyctl
```

## 使用方法

### 初始化

```
/deploy:init
```

自动检测项目结构并生成 `.deploy.yaml` 配置。

### 完整部署

```
/deploy:run uat                    # 部署到 uat
/deploy:run prd core ops           # 只部署指定组件到生产
/deploy:run dev --skip-check       # 开发环境跳过检查
```

### 仅预检查

```
/deploy:check uat                  # 检查 uat 部署条件
/deploy:check prd --image-only     # 仅检查镜像
```

### 监控部署

```
/deploy:monitor uat                # 监控 uat 部署状态
/deploy:monitor prd --logs         # 带日志输出
```

## 问题处理策略

| 问题类型 | Deploy 的处理 |
|---------|-------------|
| 配置错误 | 提供修复建议（改 config，不改代码） |
| 镜像缺失 | 提示构建和推送命令 |
| 资源不足 | 建议调整 resource limits |
| 应用崩溃 | **停止部署**，输出日志，建议转交处理 |
| 网络超时 | 检查连通性，提供诊断信息 |

## 检查点机制

部署过程支持检查点恢复：
```
/deploy:run uat --resume           # 从上次失败点恢复
```

## 配置文件

`.deploy.yaml` 示例参见 `/deploy:init` 生成的模板。

## License

MIT
