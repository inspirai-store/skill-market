#!/usr/bin/env node

/**
 * WeChat DevTools Automator 连接管理
 * 提供可复用的连接逻辑
 */

const automator = require('miniprogram-automator');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 获取 HTTP API 端口
 */
function getHttpPort() {
  const ideDir = path.join(
    os.homedir(),
    'Library/Application Support/微信开发者工具'
  );

  try {
    // 查找最新的 .ide 文件
    const files = fs.readdirSync(ideDir);
    for (const file of files) {
      const ideFile = path.join(ideDir, file, 'Default/.ide');
      if (fs.existsSync(ideFile)) {
        const port = fs.readFileSync(ideFile, 'utf-8').trim();
        return parseInt(port, 10);
      }
    }
  } catch (error) {
    console.error('Failed to read port file:', error.message);
  }

  // 默认端口
  return 62070;
}

/**
 * 连接到微信开发者工具
 * @param {string} projectPath - 项目路径
 * @param {Object} options - 连接选项
 * @returns {Promise<Object>} miniProgram 实例
 */
async function connect(projectPath, options = {}) {
  const port = options.port || getHttpPort();
  const wsEndpoint = `ws://localhost:${port}`;

  try {
    // 尝试连接已启动的工具
    const miniProgram = await automator.connect({
      wsEndpoint,
      ...options
    });

    console.error(`✅ Connected to DevTools at ${wsEndpoint}`);
    return miniProgram;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    console.error('');
    console.error('请确认：');
    console.error('  1. 微信开发者工具已启动');
    console.error('  2. 项目已在工具中打开');
    console.error('  3. 已启用自动化模式（/v2/auto）');
    throw error;
  }
}

/**
 * 启动并连接微信开发者工具
 * @param {string} projectPath - 项目路径
 * @param {Object} options - 启动选项
 * @returns {Promise<Object>} miniProgram 实例
 */
async function launch(projectPath, options = {}) {
  const cliPath = options.cliPath || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
  const port = options.port || getHttpPort();

  try {
    const miniProgram = await automator.launch({
      cliPath,
      projectPath,
      port,
      ...options
    });

    console.error(`✅ Launched and connected to DevTools`);
    return miniProgram;
  } catch (error) {
    console.error(`❌ Launch failed: ${error.message}`);
    throw error;
  }
}

/**
 * 断开连接
 * @param {Object} miniProgram - miniProgram 实例
 */
async function disconnect(miniProgram) {
  try {
    await miniProgram.disconnect();
    console.error('✅ Disconnected');
  } catch (error) {
    console.error(`⚠️  Disconnect error: ${error.message}`);
  }
}

module.exports = {
  connect,
  launch,
  disconnect,
  getHttpPort
};
