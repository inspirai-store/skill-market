---
name: lookup
description: "Query API documentation across projects. List all projects, view project APIs, or get specific API details."
---

# /apispec:lookup - 查询 API 文档

查询项目的 API 文档，支持列出所有项目、查看项目 API 列表、查看具体 API 详情。

## 使用方式

```
/apispec:lookup                              # 列出所有项目
/apispec:lookup {project}                    # 显示项目的所有 API
/apispec:lookup {project} {module}           # 显示模块下的 API
/apispec:lookup {project} {module}/{api}     # 显示具体 API 详情
```

## 示例

```
/apispec:lookup                              # 列出所有项目
/apispec:lookup myapp                        # 显示 myapp 的所有 API
/apispec:lookup myapp auth                   # 显示 auth 模块的 API
/apispec:lookup myapp auth/sms-login         # 显示 sms-login 的详细文档
```

## 执行步骤

### Step 1: 定位规范仓库

默认路径：`~/.apispec/registry`

如果目录不存在，提示用户 clone 仓库：
```bash
mkdir -p ~/.apispec
git clone <your-api-specs-repo> ~/.apispec/registry
```

### Step 2: 拉取最新

```bash
cd {spec_repo}
git pull origin main --quiet
```

### Step 3: 根据参数查询

**无参数 - 列出所有项目：**

读取 `meta.yaml`，格式化输出：

```
API Specifications Registry

Projects:
  myapp          用户中心服务 - 认证、会员、支付    20 APIs
  another-app    其他项目描述                      12 APIs
```

**一个参数 - 显示项目 API 列表：**

读取 `{project}/meta.yaml`，格式化输出：

```
myapp - 用户中心服务
Base URL: https://api.example.com
Updated: 2026-01-22

APIs (20):
  METHOD  ENDPOINT                        AUTH  SUMMARY
  POST    /api/v1/auth/sms/send           -     发送短信验证码
  POST    /api/v1/auth/sms/login          -     短信验证码登录
  GET     /api/v1/user/profile            *     获取用户信息
  PUT     /api/v1/user/profile            *     更新用户信息

* = 需要认证
```

**两个参数（模块）- 显示模块 API：**

筛选显示指定模块的 API。

**完整路径 - 显示 API 详情：**

读取 `{project}/{module}/{api}.yaml`，格式化输出完整的请求/响应信息。

## 输出格式

- 简洁的文本格式，便于快速理解
- 字段对齐，易于阅读
- 只显示必要信息，减少 token 消耗

## 注意事项

- 每次查询前自动 `git pull` 获取最新文档
- 如果项目或 API 不存在，给出友好提示并建议使用 `/apispec:search` 模糊查找
