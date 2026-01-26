---
name: publish
description: "Chrome 插件发布上架 - 打包、检查、上架指导"
---

# /chplg:publish - 发布上架

发布前检查、打包和上架 Chrome Web Store 指导。

## 使用方式

```
/chplg:publish                   # 完整发布流程
/chplg:publish --check           # 仅检查，不打包
/chplg:publish --pack            # 仅打包
/chplg:publish --guide           # 上架步骤指导
```

## 参数

- `--check` — 仅执行发布前检查
- `--pack` — 仅打包，跳过检查
- `--guide` — 显示 Chrome Web Store 上架步骤
- `--version <ver>` — 指定版本号（默认读取 manifest）

## 执行步骤

### Step 1: 项目检查

```bash
# 检查项目配置
if [ ! -f "manifest.json" ]; then
    echo "[ERROR] 未找到 manifest.json"
    echo "[INFO] 请确保在 Chrome 插件项目根目录执行"
    exit 1
fi
```

### Step 2: 发布前自动检查

执行以下检查并输出报告：

#### 2.1 Manifest 完整性检查

```javascript
const requiredFields = [
  'manifest_version',
  'name',
  'version',
  'description',
  'icons'
];

const recommended = [
  'action',
  'permissions'
];
```

**检查项:**
- [ ] manifest_version 为 3
- [ ] name 不为空（最多 45 字符）
- [ ] version 格式正确（如 1.0.0）
- [ ] description 不为空（最多 132 字符）
- [ ] icons 包含所有必需尺寸

#### 2.2 图标检查

```bash
# 必需的图标尺寸
REQUIRED_ICONS="16 32 48 128"

for size in $REQUIRED_ICONS; do
    icon_path=$(jq -r ".icons.\"$size\"" manifest.json)
    if [ ! -f "$icon_path" ]; then
        echo "[ERROR] 缺少 ${size}x${size} 图标: $icon_path"
    fi
done
```

**检查项:**
- [ ] 16x16 图标存在
- [ ] 32x32 图标存在
- [ ] 48x48 图标存在
- [ ] 128x128 图标存在
- [ ] 图标为 PNG 格式
- [ ] 图标尺寸正确（非缩放）

#### 2.3 权限合理性检查

```javascript
const sensitivePermissions = [
  'tabs',           // 可读取所有标签页 URL
  '<all_urls>',     // 访问所有网站
  'webRequest',     // 拦截网络请求
  'history',        // 读取浏览历史
  'bookmarks'       // 读取书签
];
```

**检查项:**
- [ ] 无过度权限申请
- [ ] 使用 activeTab 代替 tabs（如适用）
- [ ] host_permissions 范围最小化

#### 2.4 代码清理检查

```bash
# 检查调试代码残留
grep -r "console.log" src/ --include="*.js" | head -20
grep -r "debugger" src/ --include="*.js"
```

**检查项:**
- [ ] 无 console.log 残留（或仅限必要日志）
- [ ] 无 debugger 语句
- [ ] 无硬编码的测试数据
- [ ] 无注释掉的调试代码

#### 2.5 隐私合规检查

```javascript
// 需要隐私政策的权限
const privacyRequiredPermissions = [
  'tabs',
  'history',
  'bookmarks',
  'storage',  // 如果存储用户数据
  '<all_urls>'
];
```

**检查项:**
- [ ] 使用敏感权限是否需要隐私政策
- [ ] 是否收集用户数据
- [ ] 数据如何存储和使用

### Step 3: 输出检查报告

```
══════════════════════════════════════
  发布前检查报告
══════════════════════════════════════

插件信息:
  名称: My Extension
  版本: 1.0.0
  描述: A helpful Chrome extension

检查结果:

  ✓ Manifest 格式正确
  ✓ 所有必需字段已填写
  ✓ 图标文件齐全
  ✓ 无过度权限申请
  ⚠ 发现 3 处 console.log（建议移除）
  ⚠ 使用 storage 权限，建议准备隐私政策

总结: 2 警告, 0 错误

══════════════════════════════════════
```

### Step 4: 询问是否继续

```
检查完成。是否继续打包?
A) 继续打包
B) 先修复问题
C) 忽略警告，强制打包
```

### Step 5: 打包

#### 5.1 构建（如果使用框架）

```bash
# 检查是否需要构建
if [ -f "package.json" ]; then
    if grep -q '"build"' package.json; then
        echo "[INFO] 执行构建..."
        npm run build
    fi
fi
```

#### 5.2 创建 ZIP 包

```bash
VERSION=$(jq -r '.version' manifest.json)
NAME=$(jq -r '.name' manifest.json | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
OUTPUT_DIR="dist"
ZIP_NAME="${NAME}-v${VERSION}.zip"

# 确定要打包的目录
if [ -d "dist" ]; then
    SOURCE_DIR="dist"
else
    SOURCE_DIR="."
fi

# 创建 ZIP（排除不需要的文件）
cd "$SOURCE_DIR"
zip -r "../$ZIP_NAME" . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "*.md" \
    -x "tests/*" \
    -x "e2e/*" \
    -x "*.config.js" \
    -x "package*.json" \
    -x ".chplg.yaml" \
    -x "*.zip"

echo "[SUCCESS] 打包完成: $ZIP_NAME"
```

#### 5.3 验证 ZIP

```bash
# 检查 ZIP 内容
echo "\nZIP 内容:"
unzip -l "$ZIP_NAME" | head -30

# 检查大小
SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo "\n文件大小: $SIZE"

# Chrome Web Store 限制
# - ZIP 最大 500MB（通常插件远小于此）
```

### Step 6: 上架指导

```
══════════════════════════════════════
  Chrome Web Store 上架指南
══════════════════════════════════════

打包文件: my-extension-v1.0.0.zip

── 上架步骤 ──

1. 访问 Chrome Web Store 开发者后台
   https://chrome.google.com/webstore/devconsole

2. 首次发布需要支付一次性注册费 $5

3. 点击「新建商品」

4. 上传 ZIP 文件
   文件: my-extension-v1.0.0.zip

5. 填写商店信息

── 必填信息 ──

商店资源:
  - 商店图标: 128x128 PNG
  - 截图: 1280x800 或 640x400（至少1张，最多5张）
  - 详细描述

类别:
  - 选择最相关的类别
  - 选择语言和地区

隐私:
  - 单一用途说明
  - 权限用途说明
  - 隐私政策 URL（如使用敏感权限）

── 可选但推荐 ──

  - 宣传图 440x280（小）
  - 宣传图 920x680（大）
  - 宣传图 1400x560（Marquee）
  - 演示视频 YouTube 链接

── 审核时间 ──

  - 首次发布: 通常 1-3 个工作日
  - 更新版本: 通常 1 个工作日
  - 涉及敏感权限可能需要更长时间

══════════════════════════════════════
```

---

## 上架素材清单

生成 `STORE_ASSETS_CHECKLIST.md`:

```markdown
# Chrome Web Store 上架素材清单

## 必备素材

### 图标
- [ ] 商店图标 128x128 PNG
  - 背景透明或纯色
  - 主体图形清晰可辨

### 截图
- [ ] 至少 1 张截图
- [ ] 尺寸: 1280x800 或 640x400
- [ ] 格式: PNG 或 JPEG
- [ ] 内容: 展示插件主要功能

推荐截图内容:
1. Popup 界面展示
2. 主要功能操作演示
3. 设置/选项页面（如有）

### 描述
- [ ] 简短描述（132 字符内）
- [ ] 详细描述
  - 功能介绍
  - 使用方法
  - 更新日志（可选）

## 可选素材

### 宣传图
- [ ] 小宣传图: 440x280
- [ ] 大宣传图: 920x680
- [ ] Marquee: 1400x560

### 视频
- [ ] YouTube 演示视频链接

## 隐私相关

### 单一用途声明
描述插件的单一明确用途（Chrome 政策要求）

示例:
> 此插件用于 [具体用途]，帮助用户 [具体收益]。

### 权限说明
为每个权限提供使用理由:

| 权限 | 用途说明 |
|------|----------|
| storage | 保存用户设置和数据 |
| activeTab | 在当前页面执行操作 |
| ... | ... |

### 隐私政策（如需要）
- [ ] 准备隐私政策页面
- [ ] 说明收集的数据类型
- [ ] 说明数据使用方式
- [ ] 说明数据存储位置

如果插件:
- 不收集任何用户数据 → 可能不需要
- 使用 storage 存储用户配置 → 建议提供
- 发送数据到服务器 → 必须提供
```

---

## 版本更新流程

```
/chplg:publish --version 1.0.1
```

**自动执行:**

1. 更新 manifest.json 中的 version
2. 更新 .chplg.yaml 中的 version（如存在）
3. 执行发布前检查
4. 打包新版本
5. 输出更新说明模板

**更新说明模板:**

```markdown
## v1.0.1 更新内容

### 新功能
-

### 改进
-

### 修复
-

---
发布日期: {date}
```

---

## 输出信息

```
══════════════════════════════════════
  发布准备完成
══════════════════════════════════════

✓ 检查通过
✓ 打包完成

输出文件:
  dist/my-extension-v1.0.0.zip (125 KB)

生成的文档:
  STORE_ASSETS_CHECKLIST.md

下一步:
  1. 准备截图和宣传图
  2. 编写商店描述
  3. 访问 https://chrome.google.com/webstore/devconsole
  4. 上传 ZIP 并填写信息
  5. 提交审核

提示:
  - 审核通常需要 1-3 个工作日
  - 使用敏感权限需准备权限用途说明
  - 建议准备隐私政策页面

══════════════════════════════════════
```

## 常见上架问题

### 权限拒绝

**问题:** 申请了过多权限被拒
**解决:**
- 移除不必要的权限
- 使用 optional_permissions
- 为每个权限提供清晰的使用说明

### 描述不符

**问题:** 描述与实际功能不符
**解决:**
- 确保描述准确反映功能
- 不夸大功能
- 更新截图匹配当前版本

### 单一用途

**问题:** 插件功能过于分散
**解决:**
- 明确核心功能
- 移除不相关功能
- 或拆分为多个插件
