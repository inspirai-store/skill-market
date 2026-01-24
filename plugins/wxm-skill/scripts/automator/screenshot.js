#!/usr/bin/env node

/**
 * WeChat MiniProgram Screenshot Tool
 * 使用 automator 截取小程序模拟器截图
 *
 * 用法:
 *   node screenshot.js <project-path> [output-file]
 *   node screenshot.js <project-path> --base64
 */

const { connect, disconnect } = require('./connect');
const fs = require('fs');
const path = require('path');

async function takeScreenshot() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('❌ 用法: node screenshot.js <project-path> [output-file|--base64]');
    process.exit(1);
  }

  const projectPath = path.resolve(args[0]);
  const outputArg = args[1];
  const useBase64 = outputArg === '--base64';

  // 验证项目路径
  if (!fs.existsSync(projectPath)) {
    console.error(`❌ 项目路径不存在: ${projectPath}`);
    process.exit(1);
  }

  const projectConfig = path.join(projectPath, 'project.config.json');
  if (!fs.existsSync(projectConfig)) {
    console.error(`❌ 项目配置文件不存在: ${projectConfig}`);
    process.exit(1);
  }

  let miniProgram;

  try {
    console.error('📱 连接微信开发者工具...');
    miniProgram = await connect(projectPath);

    console.error('📸 截图中...');

    let screenshotData;

    if (useBase64) {
      // 返回 base64 数据
      screenshotData = await miniProgram.screenshot();
      console.log(screenshotData); // 输出到 stdout
      console.error('✅ 截图完成（base64）');
    } else {
      // 保存到文件
      const outputFile = outputArg || `screenshot-${Date.now()}.png`;
      const outputPath = path.resolve(outputFile);

      screenshotData = await miniProgram.screenshot({
        path: outputPath
      });

      console.log(outputPath); // 输出文件路径到 stdout
      console.error(`✅ 截图已保存: ${outputPath}`);
    }

  } catch (error) {
    console.error(`❌ 截图失败: ${error.message}`);

    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('');
      console.error('可能的原因：');
      console.error('  1. 微信开发者工具未启动');
      console.error('  2. 自动化模式未开启');
      console.error('  3. 端口配置不正确');
      console.error('');
      console.error('解决方法：');
      console.error('  1. 启动微信开发者工具');
      console.error('  2. 在工具中打开项目');
      console.error('  3. 调用 HTTP API 启用自动化: curl "http://localhost:PORT/v2/auto?project=PATH"');
    }

    process.exit(1);
  } finally {
    if (miniProgram) {
      await disconnect(miniProgram);
    }
  }
}

// 运行截图
takeScreenshot().catch(error => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
