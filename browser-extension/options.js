/**
 * Options Page Script - 设置页面逻辑
 */

(function() {
  'use strict';

  // DOM 元素
  const elements = {
    serverUrl: document.getElementById('server-url'),
    token: document.getElementById('token'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    btnSave: document.getElementById('btn-save'),
    btnTest: document.getElementById('btn-test'),
    btnLogin: document.getElementById('btn-login'),
    status: document.getElementById('status')
  };

  // 初始化
  async function init() {
    // 加载已有配置
    const config = await sendMessage('getConfig');
    if (config.success) {
      elements.serverUrl.value = config.data.baseUrl || '';
      elements.token.value = config.data.token || '';
    }

    // 绑定事件
    bindEvents();
  }

  // 发送消息到 background script
  function sendMessage(action, data = {}) {
    return browser.runtime.sendMessage({ action, ...data });
  }

  // 显示状态
  function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.classList.remove('hidden');

    // 3秒后自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        elements.status.classList.add('hidden');
      }, 3000);
    }
  }

  // 隐藏状态
  function hideStatus() {
    elements.status.classList.add('hidden');
  }

  // 保存配置
  async function saveConfig() {
    const url = elements.serverUrl.value.trim();
    const token = elements.token.value.trim();

    if (!url) {
      showStatus('请输入服务器地址', 'error');
      return;
    }

    // 确保 URL 格式正确
    let baseUrl = url;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    // 移除末尾的斜杠
    baseUrl = baseUrl.replace(/\/$/, '');

    try {
      await sendMessage('saveConfig', { url: baseUrl, token });
      showStatus('设置已保存', 'success');
      
      // 更新输入框为标准化后的 URL
      elements.serverUrl.value = baseUrl;
    } catch (err) {
      showStatus('保存失败: ' + err.message, 'error');
    }
  }

  // 测试连接
  async function testConnection() {
    hideStatus();
    showStatus('正在测试连接...', 'loading');
    elements.btnTest.disabled = true;

    try {
      // 先保存当前配置
      await saveConfig();

      // 测试连接
      const result = await sendMessage('testConnection');
      
      if (result.success) {
        const user = result.data;
        showStatus(`连接成功！当前用户: ${user.username}${user.is_admin ? ' (管理员)' : ''}`, 'success');
      } else {
        showStatus('连接失败: ' + (result.error || '未知错误'), 'error');
      }
    } catch (err) {
      showStatus('连接失败: ' + err.message, 'error');
    } finally {
      elements.btnTest.disabled = false;
    }
  }

  // 登录
  async function login() {
    const username = elements.username.value.trim();
    const password = elements.password.value;

    if (!username || !password) {
      showStatus('请输入用户名和密码', 'error');
      return;
    }

    hideStatus();
    elements.btnLogin.disabled = true;
    elements.btnLogin.textContent = '登录中...';

    try {
      // 先保存服务器地址（如果有）
      const serverUrl = elements.serverUrl.value.trim();
      if (serverUrl) {
        let baseUrl = serverUrl;
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
          baseUrl = 'http://' + baseUrl;
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        await sendMessage('saveConfig', { url: baseUrl, token: '' });
        elements.serverUrl.value = baseUrl;
      }

      const result = await sendMessage('login', { username, password });
      
      if (result.success) {
        elements.token.value = result.data.token;
        showStatus(`登录成功！欢迎 ${result.data.username}`, 'success');
        
        // 清空密码
        elements.password.value = '';
      } else {
        showStatus('登录失败: ' + (result.error || '用户名或密码错误'), 'error');
      }
    } catch (err) {
      showStatus('登录失败: ' + err.message, 'error');
    } finally {
      elements.btnLogin.disabled = false;
      elements.btnLogin.textContent = '登录';
    }
  }

  // 绑定事件
  function bindEvents() {
    elements.btnSave.addEventListener('click', saveConfig);
    elements.btnTest.addEventListener('click', testConnection);
    elements.btnLogin.addEventListener('click', login);

    // 回车键提交
    elements.token.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveConfig();
    });

    elements.password.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login();
    });
  }

  // 启动
  document.addEventListener('DOMContentLoaded', init);
})();
