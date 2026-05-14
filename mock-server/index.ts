import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

const normalizeBookmarkUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${hostname}${pathname}`;
  } catch {
    return rawUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  }
};

const mockData = {
  user: {
    id: 'mock-user-1',
    username: 'testuser',
    isAdmin: true
  },
  workspaces: [
    { id: 'ws-1', user_id: 'mock-user-1', name: '支付产品', description: '支付相关项目', icon: '💳', sort_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'ws-2', user_id: 'mock-user-1', name: '网站站长', description: '网站管理', icon: '🌐', sort_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'ws-3', user_id: 'mock-user-1', name: '个人', description: '个人事务', icon: '👤', sort_order: 3, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'ws-4', user_id: 'mock-user-1', name: '外包项目', description: '外包工作', icon: '💼', sort_order: 4, created_at: '2024-01-01', updated_at: '2024-01-01' }
  ],
  bookmarks: [
    { id: 'bm-1', user_id: 'mock-user-1', title: 'GitHub', url: 'https://github.com', description: '代码托管平台', icon: 'https://github.com/favicon.ico', tags: ['开发', '代码'], is_frequent: 1, frequent_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'bm-2', user_id: 'mock-user-1', title: '支付宝开放平台', url: 'https://open.alipay.com', description: '支付宝开发文档', icon: '', tags: ['支付', '文档'], is_frequent: 1, frequent_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'bm-3', user_id: 'mock-user-1', title: '腾讯云', url: 'https://cloud.tencent.com', description: '云服务控制台', icon: '', tags: ['服务器', '云'], is_frequent: 0, frequent_order: 0, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'bm-4', user_id: 'mock-user-1', title: '掘金', url: 'https://juejin.cn', description: '技术社区', icon: '', tags: ['技术', '社区'], is_frequent: 0, frequent_order: 0, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 'bm-5', user_id: 'mock-user-1', title: '百度统计', url: 'https://tongji.baidu.com', description: '网站统计', icon: '', tags: ['统计', '分析'], is_frequent: 0, frequent_order: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }
  ],
  groups: {
    'ws-1': [
      { id: 'g-1', workspace_id: 'ws-1', user_id: 'mock-user-1', name: '开发文档', description: '', sort_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 'g-2', workspace_id: 'ws-1', user_id: 'mock-user-1', name: '测试环境', description: '', sort_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01' }
    ]
  },
  pinnedCards: {
    'ws-1-null': [
      { id: 'pc-1', workspace_id: 'ws-1', bookmark_id: 'bm-2', user_id: 'mock-user-1', group_id: null, sort_order: 1, title: '支付宝开放平台', url: 'https://open.alipay.com', description: '支付宝开发文档', icon: '', tags: ['支付', '文档'] }
    ],
    'ws-3-null': [
      { id: 'pc-2', workspace_id: 'ws-3', bookmark_id: 'bm-1', user_id: 'mock-user-1', group_id: null, sort_order: 1, title: 'GitHub', url: 'https://github.com', description: '代码托管平台', icon: 'https://github.com/favicon.ico', tags: ['开发', '代码'] },
      { id: 'pc-3', workspace_id: 'ws-3', bookmark_id: 'bm-4', user_id: 'mock-user-1', group_id: null, sort_order: 2, title: '掘金', url: 'https://juejin.cn', description: '技术社区', icon: '', tags: ['技术', '社区'] }
    ]
  },
  sessions: [
    { id: 'session-1', device_name: 'MacBook Pro', last_active: new Date().toISOString(), active_workspace_id: 'ws-1' },
    { id: 'session-2', device_name: 'iPhone 15', last_active: new Date(Date.now() - 3600000).toISOString(), active_workspace_id: 'ws-3' }
  ]
};

// Auth routes
app.get('/api/auth/registration-status', (req, res) => {
  res.json({ enabled: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ token: 'mock-jwt-token', user: mockData.user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  res.status(201).json({ token: 'mock-jwt-token', user: mockData.user });
});

app.get('/api/auth/me', (req, res) => {
  res.json(mockData.user);
});

// Workspace routes
app.get('/api/workspaces', (req, res) => {
  res.json(mockData.workspaces);
});

app.post('/api/workspaces', (req, res) => {
  const newWorkspace = {
    id: `ws-${Date.now()}`,
    user_id: 'mock-user-1',
    ...req.body,
    sort_order: mockData.workspaces.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockData.workspaces.push(newWorkspace);
  res.status(201).json(newWorkspace);
});

app.put('/api/workspaces/:id', (req, res) => {
  const index = mockData.workspaces.findIndex(w => w.id === req.params.id);
  if (index !== -1) {
    mockData.workspaces[index] = { ...mockData.workspaces[index], ...req.body, updated_at: new Date().toISOString() };
    res.json(mockData.workspaces[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/workspaces/:id', (req, res) => {
  mockData.workspaces = mockData.workspaces.filter(w => w.id !== req.params.id);
  res.json({ success: true });
});

// Group routes
app.get('/api/groups/workspace/:workspaceId', (req, res) => {
  const { workspaceId } = req.params;
  res.json(mockData.groups[workspaceId] || []);
});

app.post('/api/groups', (req, res) => {
  const { workspace_id, name, description } = req.body;
  const newGroup = {
    id: `g-${Date.now()}`,
    workspace_id,
    user_id: 'mock-user-1',
    name,
    description: description || '',
    sort_order: (mockData.groups[workspace_id] || []).length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (!mockData.groups[workspace_id]) {
    mockData.groups[workspace_id] = [];
  }
  mockData.groups[workspace_id].push(newGroup);
  res.status(201).json(newGroup);
});

app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  for (const wsId in mockData.groups) {
    mockData.groups[wsId] = mockData.groups[wsId].filter(g => g.id !== id);
  }
  res.json({ success: true });
});

// Pinned cards
app.get('/api/workspaces/:id/cards', (req, res) => {
  const { id } = req.params;
  const { group_id } = req.query;
  const key = `${id}-${group_id || 'null'}`;
  res.json(mockData.pinnedCards[key] || []);
});

app.post('/api/workspaces/:id/cards', (req, res) => {
  const { id } = req.params;
  const { bookmark_id, group_id } = req.body;
  const bookmark = mockData.bookmarks.find(b => b.id === bookmark_id);
  const key = `${id}-${group_id || 'null'}`;
  
  const newCard = {
    id: `pc-${Date.now()}`,
    workspace_id: id,
    bookmark_id,
    user_id: 'mock-user-1',
    group_id: group_id || null,
    sort_order: (mockData.pinnedCards[key] || []).length + 1,
    title: bookmark?.title,
    url: bookmark?.url,
    description: bookmark?.description,
    icon: bookmark?.icon,
    tags: bookmark?.tags
  };
  
  if (!mockData.pinnedCards[key]) {
    mockData.pinnedCards[key] = [];
  }
  mockData.pinnedCards[key].push(newCard);
  res.status(201).json(newCard);
});

app.delete('/api/workspaces/:workspaceId/cards/:cardId', (req, res) => {
  const { workspaceId, cardId } = req.params;
  for (const key in mockData.pinnedCards) {
    if (key.startsWith(workspaceId)) {
      mockData.pinnedCards[key] = mockData.pinnedCards[key].filter(c => c.id !== cardId);
    }
  }
  res.json({ success: true });
});

// Bookmark routes
app.get('/api/bookmarks', (req, res) => {
  res.json(mockData.bookmarks);
});

app.get('/api/bookmarks/frequent', (req, res) => {
  res.json(mockData.bookmarks.filter(b => b.is_frequent).sort((a, b) => a.frequent_order - b.frequent_order));
});

app.get('/api/bookmarks/tags', (req, res) => {
  const tags = new Set<string>();
  mockData.bookmarks.forEach(b => b.tags.forEach((t: string) => tags.add(t)));
  res.json(Array.from(tags));
});

app.post('/api/bookmarks', async (req, res) => {
  console.log('\n=== MOCK: CREATE BOOKMARK REQUEST ===');
  console.log('Received body:', JSON.stringify(req.body, null, 2));
  
  let { title, url, description, icon, tags, is_frequent } = req.body;
  
  // Ensure URL has protocol
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const normalizedInputUrl = normalizeBookmarkUrl(url || '');
  const duplicate = mockData.bookmarks.find((bookmark) => normalizeBookmarkUrl(bookmark.url) === normalizedInputUrl);
  if (duplicate) {
    return res.status(409).json({
      error: 'Bookmark already exists',
      bookmark: {
        id: duplicate.id,
        title: duplicate.title,
        url: duplicate.url,
      },
    });
  }
  
  console.log('After normalization:');
  console.log('  URL:', url);
  console.log('  Title before fetch:', title);
  console.log('  Icon before fetch:', icon);
  
  // Auto-fetch metadata if title or icon is empty
  const needsTitle = !title || title.trim() === '';
  const needsIcon = !icon || icon.trim() === '';
  
  if (needsTitle || needsIcon) {
    console.log('Need to fetch metadata:', { needsTitle, needsIcon });
    try {
      console.log('Fetching:', url);
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        maxRedirects: 10,
      });
      
      const $ = cheerio.load(response.data, { decodeEntities: true });
      
      // Extract title
      if (needsTitle) {
        const titleText = $('title').first().text().trim();
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const twitterTitle = $('meta[name="twitter:title"]').attr('content');
        
        title = titleText || ogTitle || twitterTitle || '';
        console.log('Title extraction:');
        console.log('  <title>:', titleText);
        console.log('  og:title:', ogTitle);
        console.log('  twitter:title:', twitterTitle);
        console.log('  Final:', title);
      }
      
      // Extract icon
      if (needsIcon) {
        const iconSelectors = [
          'link[rel="apple-touch-icon"][sizes="180x180"]',
          'link[rel="apple-touch-icon"][sizes="152x152"]',
          'link[rel="apple-touch-icon"][sizes="144x144"]',
          'link[rel="apple-touch-icon"][sizes="120x120"]',
          'link[rel="apple-touch-icon"][sizes="72x72"]',
          'link[rel="apple-touch-icon"]',
          'link[rel="icon"][type="image/png"]',
          'link[rel="icon"][sizes="32x32"]',
          'link[rel="icon"][sizes="16x16"]',
          'link[rel="shortcut icon"]',
          'link[rel="icon"]',
        ];
        
        for (const selector of iconSelectors) {
          const href = $(selector).attr('href');
          if (href) {
            icon = href;
            console.log('Icon found:', icon);
            break;
          }
        }
        
        // Convert relative icon URL to absolute
        if (icon && !icon.startsWith('http')) {
          try {
            const urlObj = new URL(url);
            if (icon.startsWith('/')) {
              icon = `${urlObj.protocol}//${urlObj.host}${icon}`;
            } else {
              icon = `${urlObj.protocol}//${urlObj.host}/${icon}`;
            }
            console.log('Icon converted to absolute:', icon);
          } catch (e) {
            console.log('Failed to convert icon URL');
          }
        }
        
        // Fallback to Google favicon
        if (!icon) {
          const urlObj = new URL(url);
          icon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
          console.log('Using Google favicon:', icon);
        }
      }
      
      // Extract description
      if (!description) {
        description = $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') ||
                     '';
        console.log('Description:', description);
      }
      
    } catch (error) {
      console.log('Failed to fetch metadata:', (error as Error).message);
    }
    
    // Set fallback values
    if (!title) {
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname.replace(/^www\./, '');
      } catch {
        title = url;
      }
      console.log('Using fallback title:', title);
    }
  }
  
  let frequentOrder = 0;
  if (is_frequent) {
    frequentOrder = mockData.bookmarks.filter(b => b.is_frequent).length + 1;
  }
  
  const newBookmark = {
    id: `bm-${Date.now()}`,
    user_id: 'mock-user-1',
    title,
    url,
    description: description || '',
    icon: icon || '',
    tags: tags || [],
    is_frequent: is_frequent ? 1 : 0,
    frequent_order: frequentOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log('=== FINAL BOOKMARK ===');
  console.log('Title:', newBookmark.title);
  console.log('URL:', newBookmark.url);
  console.log('Icon:', newBookmark.icon);
  console.log('======================\n');
  
  mockData.bookmarks.push(newBookmark);
  res.status(201).json(newBookmark);
});

app.put('/api/bookmarks/:id', (req, res) => {
  const index = mockData.bookmarks.findIndex(b => b.id === req.params.id);
  if (index !== -1) {
    const { is_frequent } = req.body;
    let frequentOrder = mockData.bookmarks[index].frequent_order;
    
    if (is_frequent !== undefined) {
      if (is_frequent && !mockData.bookmarks[index].is_frequent) {
        frequentOrder = mockData.bookmarks.filter(b => b.is_frequent).length + 1;
      }
    }
    
    mockData.bookmarks[index] = { 
      ...mockData.bookmarks[index], 
      ...req.body, 
      frequent_order: frequentOrder,
      updated_at: new Date().toISOString() 
    };
    res.json(mockData.bookmarks[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/bookmarks/:id', (req, res) => {
  mockData.bookmarks = mockData.bookmarks.filter(b => b.id !== req.params.id);
  res.json({ success: true });
});

// Session routes
app.get('/api/sessions', (req, res) => {
  res.json(mockData.sessions);
});

app.post('/api/sessions', (req, res) => {
  res.json({ id: 'session-1', ...req.body });
});

app.delete('/api/sessions/:id', (req, res) => {
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: 'mock' });
});

app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log('Try login with: admin / admin123');
});
