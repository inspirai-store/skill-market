# Browser Fetch

指纹浏览器网页抓取工具 for Claude Code。使用 Camoufox 反检测浏览器抓取有反爬保护的网站。

## 功能

- **反检测浏览器**: 基于 Camoufox（反检测 Firefox），绕过 WAF 和反爬检测
- **Profile 管理**: 独立 Profile 保持各站点登录态
- **批量抓取**: 支持单 URL 和多 URL 批量抓取
- **平台适配**: 微信、知乎、小红书、Twitter 等

## 安装

```bash
pip install camoufox && python3 -m camoufox fetch
```

## 使用

在 Claude Code 中直接说「帮我抓取这个网页」或「browser fetch URL」。

## License

MIT
