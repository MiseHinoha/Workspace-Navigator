/**
 * Content Script - 获取页面信息
 * 注入到每个页面中，响应 popup 的请求
 */

(function() {
  'use strict';

  // 获取页面信息
  function getPageInfo() {
    // 获取标题
    const title = document.title || '';
    
    // 获取 URL
    const url = window.location.href || '';
    
    // 获取描述
    const description = (
      document.querySelector('meta[name="description"]')?.content ||
      document.querySelector('meta[property="og:description"]')?.content ||
      document.querySelector('meta[name="twitter:description"]')?.content ||
      ''
    ).substring(0, 500); // 限制长度
    
    // 获取关键词
    const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
    
    // 获取网站图标（尝试多种方式）
    let favicon = '';
    const faviconSelectors = [
      'link[rel="icon"][sizes="32x32"]',
      'link[rel="icon"][sizes="16x16"]',
      'link[rel="shortcut icon"]',
      'link[rel="icon"]',
      'link[rel="apple-touch-icon"]'
    ];
    
    for (const selector of faviconSelectors) {
      const link = document.querySelector(selector);
      if (link?.href) {
        favicon = link.href;
        break;
      }
    }
    
    // 如果没有找到，使用默认路径
    if (!favicon && url) {
      try {
        const urlObj = new URL(url);
        favicon = `${urlObj.origin}/favicon.ico`;
      } catch (e) {
        favicon = '';
      }
    }
    
    // 获取页面主要内容（用于智能标签推荐）
    const h1Text = document.querySelector('h1')?.textContent?.trim() || '';
    
    return {
      title: title.trim(),
      url: url,
      description: description.trim(),
      keywords: keywords,
      favicon: favicon,
      h1: h1Text
    };
  }

  // 智能推荐标签
  function suggestTags(pageInfo) {
    const suggestions = new Set();
    const url = pageInfo.url.toLowerCase();
    const title = pageInfo.title.toLowerCase();
    const h1 = pageInfo.h1.toLowerCase();
    const keywords = pageInfo.keywords.toLowerCase();
    
    // 根据域名推荐
    const domainTags = {
      'github.com': ['代码', 'GitHub', '开源'],
      'stackoverflow.com': ['问答', '编程', 'StackOverflow'],
      'juejin.cn': ['掘金', '技术', '前端'],
      'zhihu.com': ['知乎', '问答', '知识'],
      'csdn.net': ['CSDN', '技术', '博客'],
      'bilibili.com': ['B站', '视频', '学习'],
      'youtube.com': ['YouTube', '视频', '学习'],
      'developer.mozilla.org': ['MDN', '文档', 'Web'],
      'docs.microsoft.com': ['微软', '文档', '技术'],
      'cloud.tencent.com': ['腾讯云', '云计算', '文档'],
      'aliyun.com': ['阿里云', '云计算', '文档'],
      'aws.amazon.com': ['AWS', '云计算', '文档'],
      'docker.com': ['Docker', '容器', '工具'],
      'kubernetes.io': ['K8s', '容器', '编排'],
      'npmjs.com': ['NPM', '包管理', 'Node.js'],
      'react.dev': ['React', '前端', '框架'],
      'vuejs.org': ['Vue', '前端', '框架'],
      'angular.io': ['Angular', '前端', '框架']
    };
    
    for (const [domain, tags] of Object.entries(domainTags)) {
      if (url.includes(domain)) {
        tags.forEach(tag => suggestions.add(tag));
      }
    }
    
    // 根据关键词推荐
    const keywordTags = [
      { keywords: ['react', 'vue', 'angular', 'svelte'], tags: ['前端', '框架'] },
      { keywords: ['node', 'express', 'koa', 'nestjs'], tags: ['后端', 'Node.js'] },
      { keywords: ['python', 'django', 'flask', 'fastapi'], tags: ['后端', 'Python'] },
      { keywords: ['docker', 'kubernetes', 'container'], tags: ['DevOps', '容器'] },
      { keywords: ['mysql', 'postgresql', 'mongodb', 'redis'], tags: ['数据库'] },
      { keywords: ['git', 'github', 'gitlab'], tags: ['版本控制', 'Git'] },
      { keywords: ['api', 'rest', 'graphql'], tags: ['API', '接口'] },
      { keywords: ['tutorial', '指南', '教程'], tags: ['教程', '学习'] },
      { keywords: ['document', '文档', 'docs'], tags: ['文档'] },
      { keywords: ['tool', '工具', 'utility'], tags: ['工具'] }
    ];
    
    const combinedText = `${title} ${h1} ${keywords}`;
    for (const { keywords, tags } of keywordTags) {
      if (keywords.some(kw => combinedText.includes(kw))) {
        tags.forEach(tag => suggestions.add(tag));
      }
    }
    
    return Array.from(suggestions).slice(0, 5); // 最多返回 5 个推荐
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageInfo') {
      const pageInfo = getPageInfo();
      const suggestedTags = suggestTags(pageInfo);
      sendResponse({ ...pageInfo, suggestedTags });
    }
    return true;
  });

  console.log('[Workspace Navigator] Content script loaded');
})();
