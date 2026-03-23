import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

app.post('/api/bookmarks', (req, res) => {
  const { is_frequent } = req.body;
  let frequentOrder = 0;
  if (is_frequent) {
    frequentOrder = mockData.bookmarks.filter(b => b.is_frequent).length + 1;
  }
  
  const newBookmark = {
    id: `bm-${Date.now()}`,
    user_id: 'mock-user-1',
    ...req.body,
    is_frequent: is_frequent ? 1 : 0,
    frequent_order: frequentOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
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
