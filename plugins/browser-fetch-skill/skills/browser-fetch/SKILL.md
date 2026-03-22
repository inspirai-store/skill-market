---
name: browser-fetch
description: Use when user wants to fetch/scrape web content using fingerprint browser. Triggers on "帮我抓取这个网页", "从这几个链接提取资料", "fetch 这个 URL", "抓取知乎/微信这篇文章", "browser fetch", "用浏览器打开这个链接", "从网页获取内容".
---

# browser-fetch · 指纹浏览器网页抓取

## 概述

用 Camoufox（反检测 Firefox）访问有反爬保护的网站，提取正文内容。
无需额外配置浏览器路径，`pip install camoufox && python3 -m camoufox fetch` 即可使用。
独立 Profile 保持各站点登录态，支持微信文章、知乎、小红书、Twitter 等。

## 前置检查

确认 camoufox 已安装：

```bash
python3 -c "from camoufox.sync_api import Camoufox; print('✅ Camoufox 可用')"
```

若未安装：`pip3 install camoufox && python3 -m camoufox fetch`

## 单 URL 抓取

```bash
python3 ~/.wxpub/commands/fetch.py <url>
# 结果写入 ~/.wxpub/.fetch_result.txt
```

抓取完成后读取结果并输出摘要（前 500 字 + 总字数）。

## 多 URL 批量抓取

```bash
cat > /tmp/fp_urls.txt <<EOF
https://mp.weixin.qq.com/s/xxx
https://zhuanlan.zhihu.com/p/yyy
EOF

python3 ~/.wxpub/commands/fetch.py --urls-file /tmp/fp_urls.txt
```

## Profile 选择（保持站点登录态）

| 站点类型 | 推荐 profile |
|---------|-------------|
| 微信文章 | `--profile wxpub-wechat` |
| 知乎 | `--profile wxpub-zhihu` |
| 小红书 / 微博 / Twitter / 其他 | `--profile wxpub-general`（默认） |

Profile 首次使用时自动创建，登录态通过 `--login` 模式建立后长期保持。

## 首次登录（建立登录态）

```bash
python3 ~/.wxpub/commands/fetch.py <url> --login --profile wxpub-zhihu
```

浏览器打开后，告知用户：
> "请在浏览器中完成登录，完成后关闭浏览器窗口，然后回到对话继续。"

用户关闭浏览器后即可正常抓取（该 profile 已保存登录 cookie）。

## 其他选项

```bash
# 更快但可能抓不到动态渲染内容
--wait domcontentloaded

# 指定超时（默认 30 秒）
--timeout 60

# 手动指定 CSS 选择器（override 自动检测）
--selector "#article-body"
```

## 与深度撰稿工作流集成

在资料收集阶段，用户提供 URL 时：

```bash
# 1. 抓取
python3 ~/.wxpub/commands/fetch.py <url>

# 2. 追加到语料库
cat ~/.wxpub/.fetch_result.txt >> ~/.wxpub/.compose_corpus.txt
```

告知用户：「已抓取 N 个链接，共 XXXX 字，已追加到语料库。」

## 常见问题

| 问题 | 解决 |
|------|------|
| 内容为空或极短 | 尝试 `--wait domcontentloaded`，或手动 `--selector` |
| 页面需要登录 | 先用 `--login` 模式建立该 profile 的登录态 |
| 遇到 CAPTCHA | 浏览器打开后告知用户手动完成验证，刷新后再抓 |
| 动态内容（SPA） | 增大 `--timeout`，默认 networkidle 模式会等待网络静止 |
