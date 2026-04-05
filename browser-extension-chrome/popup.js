/**
 * Popup Script - 弹出窗口逻辑
 */

(function() {
  'use strict';

  // DOM 元素
  const elements = {
    loading: document.getElementById('loading'),
    notConfigured: document.getElementById('not-configured'),
    addForm: document.getElementById('add-form'),
    result: document.getElementById('result'),
    error: document.getElementById('error'),
    
    // 表单元素
    favicon: document.getElementById('favicon'),
    title: document.getElementById('title'),
    url: document.getElementById('url'),
    description: document.getElementById('description'),
    tags: document.getElementById('tags'),
    suggestedTags: document.getElementById('suggested-tags'),
    workspace: document.getElementById('workspace'),
    pinCard: document.getElementById('pin-card'),
    isFrequent: document.getElementById('is-frequent'),
    
    // 按钮
    btnOpenOptions: document.getElementById('btn-open-options'),
    btnSave: document.getElementById('btn-save'),
    btnRetry: document.getElementById('btn-retry'),
    
    // 链接
    linkOpenNavigator: document.getElementById('link-open-navigator'),
    linkSettings: document.getElementById('link-settings'),
    
    // 结果
    resultIcon: document.getElementById('result-icon'),
    resultMessage: document.getElementById('result-message'),
    errorMessage: document.getElementById('error-message')
  };

  // 状态
  let currentPageInfo = null;
  let savedBookmarkId = null;

  // 初始化
  async function init() {
    try {
      // 检查配置
      const config = await sendMessage('getConfig');
      
      if (!config.success || !config.data.token) {
        showNotConfigured();
        return;
      }

      // 测试连接
      const testResult = await sendMessage('testConnection');
      if (!testResult.success) {
        showNotConfigured();
        return;
      }

      // 获取当前页面信息
      const pageInfo = await getCurrentPageInfo();
      if (!pageInfo) {
        showError('无法获取页面信息');
        return;
      }

      currentPageInfo = pageInfo;

      // 加载工作空间
      await loadWorkspaces();

      // 填充表单
      fillForm(pageInfo);

      // 显示表单
      showAddForm();

    } catch (err) {
      console.error('Init error:', err);
      showError(err.message);
    }
  }

  // 发送消息到 background script
  function sendMessage(action, data = {}) {
    return chrome.runtime.sendMessage({ action, ...data });
  }

  // 获取当前页面信息
  async function getCurrentPageInfo() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) return null;

    const tab = tabs[0];
    
    // 特殊页面无法注入 content script
    if (tab.url.startsWith('about:') || tab.url.startsWith('moz-extension:')) {
      return {
        title: tab.title || '',
        url: tab.url,
        description: '',
        favicon: tab.favIconUrl || '',
        suggestedTags: []
      };
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
      return response;
    } catch (e) {
      // 如果 content script 未加载，返回基本信息
      return {
        title: tab.title || '',
        url: tab.url,
        description: '',
        favicon: tab.favIconUrl || '',
        suggestedTags: []
      };
    }
  }

  // 加载工作空间列表
  async function loadWorkspaces() {
    const result = await sendMessage('getWorkspaces');
    if (!result.success) return;

    const workspaces = result.data;
    
    // 清空并添加选项
    elements.workspace.innerHTML = '<option value="">-- 仅保存到书签 --</option>';
    
    workspaces.forEach(ws => {
      const option = document.createElement('option');
      option.value = ws.id;
      option.textContent = ws.name;
      elements.workspace.appendChild(option);
    });
  }

  // 填充表单
  function fillForm(pageInfo) {
    elements.title.value = pageInfo.title || '';
    elements.url.value = pageInfo.url || '';
    elements.description.value = pageInfo.description || '';
    
    if (pageInfo.favicon) {
      elements.favicon.src = pageInfo.favicon;
      elements.favicon.onerror = () => {
        elements.favicon.src = 'icons/icon16.png';
      };
    }

    // 显示推荐标签
    if (pageInfo.suggestedTags && pageInfo.suggestedTags.length > 0) {
      renderSuggestedTags(pageInfo.suggestedTags);
    }
  }

  // 渲染推荐标签
  function renderSuggestedTags(tags) {
    elements.suggestedTags.innerHTML = '';
    
    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-suggestion';
      btn.textContent = `+ ${tag}`;
      btn.type = 'button';
      btn.onclick = () => addTag(tag);
      elements.suggestedTags.appendChild(btn);
    });
  }

  // 添加标签到输入框
  function addTag(tag) {
    const currentTags = elements.tags.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t);
    
    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
      elements.tags.value = currentTags.join(', ');
    }
  }

  // 保存书签
  async function saveBookmark() {
    const btnText = elements.btnSave.querySelector('.btn-text');
    const btnLoading = elements.btnSave.querySelector('.btn-loading');
    
    try {
      // 禁用按钮
      elements.btnSave.disabled = true;
      btnText.classList.add('hidden');
      btnLoading.classList.remove('hidden');

      // 构建书签数据
      const bookmark = {
        title: elements.title.value.trim(),
        url: elements.url.value.trim(),
        description: elements.description.value.trim(),
        tags: elements.tags.value
          .split(',')
          .map(t => t.trim())
          .filter(t => t),
        is_frequent: elements.isFrequent.checked ? 1 : 0
      };

      // 验证
      if (!bookmark.title) {
        throw new Error('请输入标题');
      }
      if (!bookmark.url) {
        throw new Error('URL 不能为空');
      }

      // 创建书签
      const result = await sendMessage('createBookmark', { bookmark });
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }

      savedBookmarkId = result.data.id;

      // 如果选择了工作空间并勾选了固定
      const workspaceId = elements.workspace.value;
      if (workspaceId && elements.pinCard.checked && savedBookmarkId) {
        const pinResult = await sendMessage('pinCard', {
          workspaceId,
          bookmarkId: savedBookmarkId
        });
        
        if (!pinResult.success) {
          console.warn('固定卡片失败:', pinResult.error);
        }
      }

      // 显示成功
      showSuccess();

    } catch (err) {
      console.error('Save error:', err);
      showError(err.message);
    } finally {
      // 恢复按钮
      elements.btnSave.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  // 显示配置页面
  function openOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  // 打开导航页
  async function openNavigator() {
    const config = await sendMessage('getConfig');
    if (config.success) {
      chrome.tabs.create({ url: config.data.baseUrl });
      window.close();
    }
  }

  // UI 切换函数
  function showLoading() {
    hideAll();
    elements.loading.classList.remove('hidden');
  }

  function showNotConfigured() {
    hideAll();
    elements.notConfigured.classList.remove('hidden');
  }

  function showAddForm() {
    hideAll();
    elements.addForm.classList.remove('hidden');
    elements.addForm.classList.add('fade-in');
  }

  function showSuccess() {
    hideAll();
    elements.result.classList.remove('hidden');
    elements.result.classList.add('fade-in');
    
    // 2秒后自动关闭
    setTimeout(() => window.close(), 2000);
  }

  function showError(message) {
    hideAll();
    elements.errorMessage.textContent = message;
    elements.error.classList.remove('hidden');
  }

  function hideAll() {
    elements.loading.classList.add('hidden');
    elements.notConfigured.classList.add('hidden');
    elements.addForm.classList.add('hidden');
    elements.result.classList.add('hidden');
    elements.error.classList.add('hidden');
  }

  // 事件绑定
  function bindEvents() {
    elements.btnOpenOptions.addEventListener('click', openOptions);
    elements.btnSave.addEventListener('click', saveBookmark);
    elements.btnRetry.addEventListener('click', () => {
      showLoading();
      init();
    });
    elements.linkOpenNavigator.addEventListener('click', (e) => {
      e.preventDefault();
      openNavigator();
    });
    elements.linkSettings.addEventListener('click', (e) => {
      e.preventDefault();
      openOptions();
    });

    // 工作空间选择变化时，自动勾选固定选项
    elements.workspace.addEventListener('change', () => {
      if (elements.workspace.value) {
        elements.pinCard.checked = true;
      }
    });

    // 快捷键支持
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        saveBookmark();
      }
    });
  }

  // 启动
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    init();
  });
})();
