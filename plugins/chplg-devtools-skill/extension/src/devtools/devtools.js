// 创建 DevTools 面板
chrome.devtools.panels.create(
  'Chplg DevTools',
  '',  // 图标可选，空字符串避免路径问题
  'src/devtools/panel.html',
  (panel) => {
    if (chrome.runtime.lastError) {
      console.error('[Chplg DevTools] Panel creation failed:', chrome.runtime.lastError);
    } else {
      console.log('[Chplg DevTools] Panel created successfully');
    }
  }
);
