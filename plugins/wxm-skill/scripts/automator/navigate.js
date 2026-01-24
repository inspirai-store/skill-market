#!/usr/bin/env node

/**
 * WeChat MiniProgram Navigation Tool
 * 使用 automator 进行小程序页面导航
 *
 * 用法:
 *   node navigate.js <project-path> <page-url> [method]
 *
 * Methods:
 *   navigateTo   - 保留当前页面，跳转到应用内某个页面（默认）
 *   redirectTo   - 关闭当前页面，跳转到应用内某个页面
 *   reLaunch     - 关闭所有页面，打开到应用内某个页面
 *   switchTab    - 跳转到 tabBar 页面
 *   navigateBack - 返回上一页面
 */

const { connect, disconnect } = require('./connect');
const fs = require('fs');
const path = require('path');

const NAVIGATION_METHODS = {
  navigateTo: 'navigateTo',
  redirectTo: 'redirectTo',
  reLaunch: 'reLaunch',
  switchTab: 'switchTab',
  navigateBack: 'navigateBack'
};

async function navigate() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ 用法: node navigate.js <project-path> <page-url> [method]');
    console.error('');
    console.error('Methods:');
    console.error('  navigateTo   - 保留当前页面，跳转到应用内某个页面（默认）');
    console.error('  redirectTo   - 关闭当前页面，跳转到应用内某个页面');
    console.error('  reLaunch     - 关闭所有页面，打开到应用内某个页面');
    console.error('  switchTab    - 跳转到 tabBar 页面');
    console.error('  navigateBack - 返回上一页面');
    process.exit(1);
  }

  const projectPath = path.resolve(args[0]);
  const pageUrl = args[1];
  const method = args[2] || 'navigateTo';

  // 验证项目路径
  if (!fs.existsSync(projectPath)) {
    console.error(`❌ 项目路径不存在: ${projectPath}`);
    process.exit(1);
  }

  // 验证导航方法
  if (!NAVIGATION_METHODS[method]) {
    console.error(`❌ 无效的导航方法: ${method}`);
    console.error(`   可用方法: ${Object.keys(NAVIGATION_METHODS).join(', ')}`);
    process.exit(1);
  }

  let miniProgram;

  try {
    console.error('📱 连接微信开发者工具...');
    miniProgram = await connect(projectPath);

    console.error(`🔀 导航到页面: ${pageUrl} (${method})`);

    // 执行导航
    if (method === 'navigateBack') {
      await miniProgram.navigateBack();
    } else {
      await miniProgram[method](pageUrl);
    }

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 获取当前页面信息
    const currentPage = await miniProgram.currentPage();
    const pagePath = currentPage.path || 'unknown';

    console.log(pagePath); // 输出当前页面路径到 stdout
    console.error(`✅ 导航完成，当前页面: ${pagePath}`);

  } catch (error) {
    console.error(`❌ 导航失败: ${error.message}`);

    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('');
      console.error('可能的原因：');
      console.error('  1. 微信开发者工具未启动');
      console.error('  2. 自动化模式未开启');
      console.error('  3. 端口配置不正确');
    } else if (error.message.includes('navigateTo')) {
      console.error('');
      console.error('可能的原因：');
      console.error('  1. 页面路径不正确');
      console.error('  2. 页面不在 pages 配置中');
      console.error('  3. 使用了错误的导航方法（tabBar 页面需要用 switchTab）');
    }

    process.exit(1);
  } finally {
    if (miniProgram) {
      await disconnect(miniProgram);
    }
  }
}

// 运行导航
navigate().catch(error => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
