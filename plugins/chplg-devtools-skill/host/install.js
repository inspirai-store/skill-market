// 安装脚本 - 注册 Native Messaging Host 和配置 MCP

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOST_NAME = 'com.chplg.devtools';

// 获取 Native Messaging Host 配置路径
function getNativeHostConfigPath() {
  const platform = os.platform();

  switch (platform) {
    case 'darwin':
      return path.join(
        os.homedir(),
        'Library/Application Support/Google/Chrome/NativeMessagingHosts'
      );
    case 'linux':
      return path.join(os.homedir(), '.config/google-chrome/NativeMessagingHosts');
    case 'win32':
      // Windows 使用注册表，这里返回配置文件路径
      return path.join(os.homedir(), 'AppData/Local/Google/Chrome/User Data/NativeMessagingHosts');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// 获取可执行文件路径
function getExecutablePath() {
  // 获取当前脚本的目录
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  return path.join(scriptDir, 'src', 'index.js');
}

// 安装 Native Messaging Host
export async function install() {
  console.log('[Install] Installing Native Messaging Host...');

  const configDir = getNativeHostConfigPath();
  const executablePath = getExecutablePath();

  // 确保目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 创建 manifest 文件
  const manifest = {
    name: HOST_NAME,
    description: 'Chplg DevTools Native Messaging Host',
    path: executablePath,
    type: 'stdio',
    allowed_origins: [
      // 扩展 ID 在安装后需要更新
      'chrome-extension://EXTENSION_ID_PLACEHOLDER/'
    ]
  };

  const manifestPath = path.join(configDir, `${HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`[Install] Manifest written to: ${manifestPath}`);
  console.log('[Install] ');
  console.log('[Install] IMPORTANT: Update the allowed_origins with your extension ID:');
  console.log(`[Install]   1. Load the extension in Chrome`);
  console.log(`[Install]   2. Copy the extension ID from chrome://extensions`);
  console.log(`[Install]   3. Edit ${manifestPath}`);
  console.log(`[Install]   4. Replace EXTENSION_ID_PLACEHOLDER with your actual ID`);
  console.log('[Install] ');

  // Windows 需要额外的注册表操作
  if (os.platform() === 'win32') {
    console.log('[Install] On Windows, you also need to add a registry key:');
    console.log(`[Install]   HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`);
    console.log(`[Install]   Value: ${manifestPath}`);
  }

  console.log('[Install] Done!');
}

// 配置 Claude Code MCP
export async function setupMCP() {
  console.log('[Setup] Configuring Claude Code MCP...');

  // Claude Desktop 配置文件路径
  const platform = os.platform();
  let configPath;

  switch (platform) {
    case 'darwin':
      configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
      break;
    case 'win32':
      configPath = path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json');
      break;
    case 'linux':
      configPath = path.join(os.homedir(), '.config/Claude/claude_desktop_config.json');
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // 读取现有配置
  let config = {};
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  }

  // 添加 MCP Server 配置
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers['chplg-devtools'] = {
    command: 'node',
    args: [getExecutablePath(), '--mcp']
  };

  // 确保目录存在
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 写入配置
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`[Setup] MCP configuration written to: ${configPath}`);
  console.log('[Setup] Restart Claude Desktop to apply changes.');
  console.log('[Setup] Done!');
}

// 如果直接运行此脚本
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const command = process.argv[2];

  if (command === 'install' || command === '--install') {
    install();
  } else if (command === 'setup-mcp' || command === '--setup-mcp') {
    setupMCP();
  } else {
    console.log('Usage:');
    console.log('  node install.js install     - Install Native Messaging Host');
    console.log('  node install.js setup-mcp   - Configure Claude Code MCP');
  }
}
