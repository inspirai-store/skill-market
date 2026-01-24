---
name: dev
description: "微信小程序编译与模拟器控制 - 编译项目、启动/重载模拟器、页面导航"
---

# /wxm:dev - 编译与模拟器

编译微信小程序项目并控制模拟器。

## 使用方式

```
/wxm:dev compile                        # 编译项目
/wxm:dev compile --watch                # 监听模式编译
/wxm:dev simulator start                # 打开模拟器
/wxm:dev simulator reload               # 重新加载
/wxm:dev simulator navigate <path>      # 跳转到指定页面
/wxm:dev init                           # 初始化环境配置
/wxm:dev diagnose                       # 诊断环境
/wxm:dev config                         # 查看当前配置
```

## 执行步骤

### 初始化（首次使用）

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
source "$PLUGIN_DIR/init.sh"
```

检查环境并生成 `.wxm.yaml` 配置文件。

### 编译

```bash
source "$PLUGIN_DIR/utils/config.sh"
source "$PLUGIN_DIR/core/http_api.sh"

wxm_api_compile
```

- 调用微信开发者工具 HTTP API 触发编译
- 显示编译结果（成功/失败及错误信息）

### 模拟器控制

```bash
source "$PLUGIN_DIR/core/http_api.sh"

# start
wxm_api_open

# reload
wxm_api_reload

# navigate
wxm_api_navigate "<page_path>"
```

## 前置条件

- 微信开发者工具已安装并启动
- HTTP 服务端口已开启（设置 → 安全 → 开启服务端口）
- 项目已在开发者工具中打开

## 配置文件

`.wxm.yaml`（项目根目录）：
```yaml
project_path: /path/to/miniprogram
devtools_port: 9420
```

## 注意事项

- 编译失败时会显示具体错误，可直接修复后重新编译
- `navigate` 的 path 格式为 `pages/index/index`（不带前导斜杠）
- 模拟器需已打开才能执行 reload 和 navigate
