// Chplg DevTools - Service Worker
// 负责：管理调试连接、收集数据、与 Native Host 通信

import { DataCollector } from '../lib/collector.js';
import { NativeMessenger } from '../lib/native-messenger.js';

// 数据收集器
const collector = new DataCollector();

// Native Messaging 连接
let nativePort = null;

// 初始化 Native Messaging 连接
function connectToNativeHost() {
  try {
    nativePort = chrome.runtime.connectNative('com.chplg.devtools');

    nativePort.onMessage.addListener((message) => {
      handleNativeMessage(message);
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('[Chplg DevTools] Native host disconnected');
      nativePort = null;
      // 尝试重连
      setTimeout(connectToNativeHost, 5000);
    });

    console.log('[Chplg DevTools] Connected to native host');

    // 发送初始化消息
    nativePort.postMessage({ type: 'INIT', version: '1.0.0' });
  } catch (error) {
    console.error('[Chplg DevTools] Failed to connect to native host:', error);
  }
}

// 处理来自 Native Host 的消息（Claude Code 的查询）
function handleNativeMessage(message) {
  console.log('[Chplg DevTools] Received from native:', message);

  switch (message.type) {
    case 'QUERY_LOGS':
      nativePort?.postMessage({
        type: 'LOGS_RESULT',
        requestId: message.requestId,
        data: collector.getLogs(message.params)
      });
      break;

    case 'QUERY_ERRORS':
      nativePort?.postMessage({
        type: 'ERRORS_RESULT',
        requestId: message.requestId,
        data: collector.getErrors(message.params)
      });
      break;

    case 'QUERY_STATUS':
      nativePort?.postMessage({
        type: 'STATUS_RESULT',
        requestId: message.requestId,
        data: collector.getStatus()
      });
      break;

    case 'CLEAR_LOGS':
      collector.clearLogs();
      nativePort?.postMessage({
        type: 'CLEAR_RESULT',
        requestId: message.requestId,
        success: true
      });
      break;
  }
}

// 发送数据到 Native Host
function sendToNativeHost(type, data) {
  if (nativePort) {
    nativePort.postMessage({ type, data, timestamp: Date.now() });
  }
}

// 当前正在调试的目标
const debugTargets = new Map();

// 附加调试器到扩展
async function attachDebugger(extensionId) {
  const target = { extensionId };

  try {
    await chrome.debugger.attach(target, '1.3');
    debugTargets.set(extensionId, target);

    // 启用需要的域
    await chrome.debugger.sendCommand(target, 'Runtime.enable');
    await chrome.debugger.sendCommand(target, 'Network.enable');

    console.log(`[Chplg DevTools] Attached to extension: ${extensionId}`);
    return true;
  } catch (error) {
    console.error(`[Chplg DevTools] Failed to attach to ${extensionId}:`, error);
    return false;
  }
}

// 分离调试器
async function detachDebugger(extensionId) {
  const target = debugTargets.get(extensionId);
  if (target) {
    try {
      await chrome.debugger.detach(target);
      debugTargets.delete(extensionId);
      console.log(`[Chplg DevTools] Detached from extension: ${extensionId}`);
    } catch (error) {
      console.error(`[Chplg DevTools] Failed to detach from ${extensionId}:`, error);
    }
  }
}

// 监听调试事件
chrome.debugger.onEvent.addListener((source, method, params) => {
  const extensionId = source.extensionId;
  const extensionName = getExtensionName(extensionId);

  switch (method) {
    case 'Runtime.consoleAPICalled':
      const logEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        level: params.type,  // log, warn, error, info, debug
        message: params.args.map(arg => formatArg(arg)).join(' '),
        source: params.stackTrace?.callFrames?.[0]?.url || 'unknown',
        line: params.stackTrace?.callFrames?.[0]?.lineNumber,
        extensionId,
        extensionName
      };

      collector.addLog(logEntry);
      sendToNativeHost('LOG', logEntry);
      break;

    case 'Runtime.exceptionThrown':
      const errorEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        level: 'error',
        message: params.exceptionDetails.text,
        type: params.exceptionDetails.exception?.className || 'Error',
        stack: formatStackTrace(params.exceptionDetails.stackTrace),
        source: params.exceptionDetails.url || 'unknown',
        line: params.exceptionDetails.lineNumber,
        extensionId,
        extensionName
      };

      collector.addError(errorEntry);
      sendToNativeHost('ERROR', errorEntry);
      break;

    case 'Network.requestWillBeSent':
      const networkEntry = {
        id: params.requestId,
        timestamp: Date.now(),
        method: params.request.method,
        url: params.request.url,
        requestHeaders: params.request.headers,
        extensionId
      };

      collector.addNetworkRequest(networkEntry);
      break;

    case 'Network.responseReceived':
      collector.updateNetworkRequest(params.requestId, {
        status: params.response.status,
        responseHeaders: params.response.headers
      });
      break;

    case 'Network.loadingFinished':
      const request = collector.getNetworkRequest(params.requestId);
      if (request) {
        request.duration = Date.now() - request.timestamp;
        sendToNativeHost('NETWORK', request);
      }
      break;
  }
});

// 格式化参数
function formatArg(arg) {
  if (arg.type === 'string') return arg.value;
  if (arg.type === 'number') return String(arg.value);
  if (arg.type === 'boolean') return String(arg.value);
  if (arg.type === 'undefined') return 'undefined';
  if (arg.type === 'object') {
    if (arg.subtype === 'null') return 'null';
    return arg.description || '[Object]';
  }
  return arg.description || String(arg.value);
}

// 格式化堆栈
function formatStackTrace(stackTrace) {
  if (!stackTrace?.callFrames) return '';
  return stackTrace.callFrames.map(frame =>
    `    at ${frame.functionName || '(anonymous)'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`
  ).join('\n');
}

// 获取扩展名称
function getExtensionName(extensionId) {
  // 缓存扩展信息
  return extensionNameCache.get(extensionId) || extensionId;
}

const extensionNameCache = new Map();

// 加载所有扩展信息
async function loadExtensionInfo() {
  const extensions = await chrome.management.getAll();
  extensions.forEach(ext => {
    if (ext.type === 'extension') {
      extensionNameCache.set(ext.id, ext.name);
    }
  });
}

// 监听扩展安装/卸载
chrome.management.onInstalled.addListener((info) => {
  extensionNameCache.set(info.id, info.name);
});

chrome.management.onUninstalled.addListener((id) => {
  extensionNameCache.delete(id);
  detachDebugger(id);
});

// 初始化
async function initialize() {
  await loadExtensionInfo();
  connectToNativeHost();

  // 自动附加到所有已安装的扩展（可选，或等待用户手动选择）
  // const extensions = await chrome.management.getAll();
  // for (const ext of extensions) {
  //   if (ext.type === 'extension' && ext.enabled && ext.id !== chrome.runtime.id) {
  //     await attachDebugger(ext.id);
  //   }
  // }
}

// 监听来自 DevTools 面板的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'ATTACH_EXTENSION':
      attachDebugger(message.extensionId).then(sendResponse);
      return true;

    case 'DETACH_EXTENSION':
      detachDebugger(message.extensionId).then(sendResponse);
      return true;

    case 'GET_EXTENSIONS':
      chrome.management.getAll().then(extensions => {
        sendResponse(extensions.filter(ext =>
          ext.type === 'extension' && ext.id !== chrome.runtime.id
        ));
      });
      return true;

    case 'GET_LOGS':
      sendResponse(collector.getLogs(message.params));
      return true;

    case 'GET_ERRORS':
      sendResponse(collector.getErrors(message.params));
      return true;

    case 'GET_STATUS':
      sendResponse({
        nativeConnected: !!nativePort,
        attachedExtensions: Array.from(debugTargets.keys()),
        ...collector.getStatus()
      });
      return true;
  }
});

// 启动
initialize();
