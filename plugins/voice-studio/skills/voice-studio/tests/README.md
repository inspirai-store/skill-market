# 离线验收

从此 skill 根目录运行：

```text
python3 -m unittest discover -s tests -p test_voice_studio.py -v
```

需要 Python 3.10+、FFmpeg、ffprobe。测试使用临时数据目录、假 Key 和 FFmpeg 生成的正弦波；不读取用户实际资源库，不连接百炼或 MiniMax，不产生供应商合成费用。

覆盖首次目录、CLI 状态和筛选、服务复用、常用声线保存和清除、文稿参数缓存、错误音色拒绝、凭据格式和脱敏、进程身份、私有文件与路径访问边界、预构建前端、音频 Range、缓存复用，以及 MP3/WAV/M4A 导出。

其中的音频只是测试信号，不能作为真实声线或供应商合成效果的验收证据。真实音色可用性、实际播放体验、供应商权限和额度需在用户已配置并授权使用的账号中分别验证。

macOS 的密钥弹窗可先用以下命令检查语法，不会弹窗或写入凭据：

```text
swiftc -typecheck scripts/configure_keys.swift
```
