---
name: search
description: "Fuzzy search API documentation across all projects by keyword, endpoint, method, or field name."
---

# /apispec:search - 模糊搜索 API 文档

跨项目模糊搜索 API 文档，支持按关键词、路径、方法、字段名等维度匹配。

## 使用方式

```
/apispec:search {keyword}                    # 全局模糊搜索
/apispec:search --project {name} {keyword}   # 在指定项目中搜索
/apispec:search --method POST {keyword}      # 按 HTTP 方法过滤
/apispec:search --field {fieldname}          # 按请求/响应字段名搜索
```

## 示例

```
/apispec:search login                        # 搜索包含 "login" 的 API
/apispec:search 验证码                        # 中文关键词搜索
/apispec:search --method POST user           # 搜索 POST 方法中包含 "user" 的 API
/apispec:search --field token                # 搜索请求或响应中包含 token 字段的 API
/apispec:search --project myapp auth         # 在 myapp 项目中搜索 "auth"
```

## 执行步骤

### Step 1: 定位规范仓库

默认路径：`~/.apispec/registry`

如果目录不存在，提示用户先执行 `/apispec:init` 并 clone 仓库。

### Step 2: 拉取最新

```bash
cd {spec_repo}
git pull origin main --quiet
```

### Step 3: 搜索匹配

搜索范围（按优先级）：

1. **endpoint 路径** - URL 路径中包含关键词
2. **summary/description** - API 描述中包含关键词
3. **请求/响应字段名** - field name 匹配
4. **模块/文件名** - 目录或文件名匹配

搜索逻辑：
```bash
# 遍历所有项目的 meta.yaml 和 API 文件
for project_dir in {spec_repo}/*/; do
    # 读取 meta.yaml 中的 API 列表快速匹配
    # 如果 meta 匹配不够，深入读取具体 API 文件
done
```

支持多关键词（AND 逻辑）：
```
/apispec:search POST login    # 匹配同时包含 POST 和 login 的 API
```

### Step 4: 格式化输出

**匹配结果格式：**

```
搜索 "login" - 找到 3 个匹配：

  METHOD  PROJECT      ENDPOINT                     SUMMARY
  POST    myapp        /api/v1/auth/sms/login       短信验证码登录
  POST    myapp        /api/v1/auth/wechat/login    微信登录
  POST    another-app  /api/v1/login                密码登录

提示：使用 /apispec:lookup myapp auth/sms-login 查看详情
```

**无匹配时：**

```
搜索 "xyz" - 未找到匹配的 API

建议：
  - 尝试更短的关键词
  - 使用 /apispec:lookup 浏览项目列表
  - 检查拼写是否正确
```

**字段搜索结果：**

```
搜索字段 "token" - 找到 5 个匹配：

  METHOD  PROJECT  ENDPOINT                   字段位置     字段类型
  POST    myapp    /api/v1/auth/sms/login     response    string
  POST    myapp    /api/v1/auth/wechat/login  response    string
  POST    myapp    /api/v1/auth/refresh       request     string
  GET     myapp    /api/v1/user/profile       request.header  string
  DELETE  myapp    /api/v1/auth/logout        request.header  string

提示：使用 /apispec:lookup myapp auth/sms-login 查看完整 API 定义
```

## 注意事项

- 搜索不区分大小写
- 支持中英文关键词
- 结果按相关度排序（endpoint 匹配 > summary 匹配 > field 匹配）
- 最多显示 20 条结果，超出时提示缩小搜索范围
- 每次搜索前自动 `git pull` 获取最新文档
