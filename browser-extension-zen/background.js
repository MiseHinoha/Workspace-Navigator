/**
 * Background Script - 后台服务
 * 处理 API 调用和跨域请求
 */

(function() {
  'use strict';

  // 默认配置
  const DEFAULT_CONFIG = {
    baseUrl: 'http://localhost:3000',
    token: null
  };

  // 获取配置
  async function getConfig() {
    const result = await browser.storage.sync.get(['navigatorUrl', 'navigatorToken']);
    return {
      baseUrl: result.navigatorUrl || DEFAULT_CONFIG.baseUrl,
      token: result.navigatorToken || DEFAULT_CONFIG.token
    };
  }

  // 保存配置
  async function saveConfig(url, token) {
    await browser.storage.sync.set({
      navigatorUrl: url,
      navigatorToken: token
    });
  }

  // API 请求封装
  async function apiRequest(endpoint, options = {}) {
    const config = await getConfig();
    
    if (!config.token) {
      throw new Error('未设置 Token，请先登录');
    }

    const url = `${config.baseUrl}/api${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token 已过期，请重新登录');
      }
      const error = await response.json().catch(() => ({ message: '请求失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // 204 No Content 或空响应
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // API 方法
  const api = {
    // 登录获取 Token
    async login(username, password) {
      const config = await getConfig();
      const response = await fetch(`${config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '登录失败' }));
        throw new Error(error.message || '登录失败');
      }

      const data = await response.json();
      await saveConfig(config.baseUrl, data.token);
      return data;
    },

    // 获取当前用户信息
    async getMe() {
      return apiRequest('/auth/me');
    },

    // 获取工作空间列表
    async getWorkspaces() {
      return apiRequest('/workspaces');
    },

    // 创建书签
    async createBookmark(bookmark) {
      return apiRequest('/bookmarks', {
        method: 'POST',
        body: JSON.stringify(bookmark)
      });
    },

    // 固定卡片到工作空间
    async pinCard(workspaceId, bookmarkId) {
      return apiRequest(`/workspaces/${workspaceId}/cards`, {
        method: 'POST',
        body: JSON.stringify({ bookmark_id: bookmarkId })
      });
    },

    // 获取标签列表
    async getTags() {
      return apiRequest('/bookmarks/tags');
    }
  };

  // 监听来自 popup 的消息
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handleAsync = async () => {
      try {
        switch (request.action) {
          case 'getConfig':
            return { success: true, data: await getConfig() };
          
          case 'saveConfig':
            await saveConfig(request.url, request.token);
            return { success: true };
          
          case 'login':
            const loginData = await api.login(request.username, request.password);
            return { success: true, data: loginData };
          
          case 'getWorkspaces':
            const workspaces = await api.getWorkspaces();
            return { success: true, data: workspaces };
          
          case 'createBookmark':
            const bookmark = await api.createBookmark(request.bookmark);
            return { success: true, data: bookmark };
          
          case 'pinCard':
            await api.pinCard(request.workspaceId, request.bookmarkId);
            return { success: true };
          
          case 'getTags':
            const tags = await api.getTags();
            return { success: true, data: tags };
          
          case 'testConnection':
            // 测试连接并验证 Token
            const me = await api.getMe();
            return { success: true, data: me };
          
          default:
            return { success: false, error: '未知操作' };
        }
      } catch (error) {
        console.error('[Workspace Navigator] Error:', error);
        return { success: false, error: error.message };
      }
    };

    handleAsync().then(sendResponse);
    return true; // 保持消息通道开放
  });

  // 右键菜单（可选功能）
  browser.contextMenus.create({
    id: 'add-to-navigator',
    title: '添加到 Workspace Navigator',
    contexts: ['page', 'link'],
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png'
    }
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'add-to-navigator') {
      // 打开 popup
      browser.browserAction.openPopup();
    }
  });

  console.log('[Workspace Navigator] Background script loaded');
})();
