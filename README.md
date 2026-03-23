# Workspace Navigator - 工作空间导航

一个功能丰富的工作空间导航页，支持多工作空间管理、书签管理、拖拽固定卡片、多端同步等功能。

## 功能特性

- 🔐 **用户认证** - JWT 登录，支持注册开关控制
- 📁 **多工作空间** - 支持创建/编辑/删除多个工作空间
- 🔖 **书签管理** - 支持标签分类，快速搜索
- 📌 **拖拽固定** - 将书签拖拽到工作空间固定为卡片
- 🔍 **搜索引擎** - 支持百度、Google、必应、DuckDuckGo
- 🖥️ **多端同步** - 支持多设备会话同步
- 🐳 **Docker 部署** - 支持 Docker 一键部署到腾讯云服务器
- 🧪 **本地 Mock** - 支持本地 Mock 测试，无需后端

## 项目结构

```
workspace-navigator/
├── backend/           # Node.js + TypeScript + SQLite 后端
├── frontend/          # React + TypeScript + Tailwind CSS 前端
├── mock-server/       # Mock API 服务器
├── docker-compose.yml # Docker Compose 配置
└── Dockerfile         # 生产环境构建
```

## 快速开始

### 方式一：Docker 部署（推荐用于生产环境）

1. 克隆代码到服务器
```bash
git clone <your-repo-url>
cd workspace-navigator
```

2. 创建环境变量文件
```bash
cp .env.example .env
# 编辑 .env 文件，修改 JWT_SECRET
```

3. 启动服务
```bash
docker-compose up -d
```

4. 访问应用
- 打开浏览器访问 `http://your-server-ip:3000`
- 默认管理员账号：`admin` / `admin123`

### 方式二：本地开发

#### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install

# 安装 Mock 服务器依赖（可选）
cd ../mock-server
npm install
```

#### 2. 启动开发服务器

**选项 A：同时启动前后端**
```bash
# 后端
cd backend
npm run dev

# 前端（新终端）
cd frontend
npm run dev
```

**选项 B：使用 Docker Compose 开发模式**
```bash
docker-compose -f docker-compose.dev.yml up
```

**选项 C：使用 Mock 服务器（无需后端）**
```bash
# 启动 Mock 服务器
cd mock-server
npm run dev

# 启动前端（新终端）
cd frontend
npm run dev
```

#### 3. 访问应用
- 前端: http://localhost:5173
- 后端 API: http://localhost:3000
- Mock API: http://localhost:3001

## 部署到腾讯云服务器

### 1. 准备工作

```bash
# 连接到腾讯云服务器
ssh root@your-server-ip

# 安装 Docker 和 Docker Compose（如果尚未安装）
curl -fsSL https://get.docker.com | sh
```

### 2. 部署应用

```bash
# 创建应用目录
mkdir -p /opt/workspace-navigator
cd /opt/workspace-navigator

# 复制项目文件到服务器（在本地执行）
scp -r . root@your-server-ip:/opt/workspace-navigator/

# 或者使用 git 克隆
# git clone <your-repo-url> .

# 创建环境配置
cp .env.example .env
nano .env  # 修改 JWT_SECRET

# 启动服务
docker-compose up -d
```

### 3. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. 使用 HTTPS（Let's Encrypt）

```bash
# 安装 certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com
```

### 5. 备份数据

数据存储在 `./data` 目录中，定期备份该目录即可：

```bash
# 备份
tar czvf backup-$(date +%Y%m%d).tar.gz data/

# 恢复
tar xzvf backup-20240101.tar.gz
```

## 使用说明

### 首次使用

1. 打开应用首页
2. 使用默认管理员账号登录：`admin` / `admin123`
3. 建议立即修改管理员密码（通过数据库操作）
4. 管理员可以在设置中关闭/开启注册功能

### 创建工作空间

1. 点击左侧边栏的「新建工作空间」按钮
2. 输入名称、选择图标、添加描述
3. 点击创建

### 添加书签

1. 在左侧「书签管理」区域点击「添加书签」
2. 输入标题、URL、描述和标签
3. 标签用逗号分隔，例如：`工具, 文档, 常用`

### 固定卡片

1. 在书签列表中找到要固定的书签
2. 拖拽书签到右侧工作空间区域
3. 卡片将以网格形式展示在工作空间中

### 搜索引擎

1. 在顶部搜索栏输入关键词
2. 点击左侧下拉选择搜索引擎
3. 支持：百度、Google、必应、DuckDuckGo

## API 文档

### 认证相关

- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `GET /api/auth/me` - 获取当前用户信息
- `GET /api/auth/registration-status` - 获取注册开关状态
- `POST /api/auth/toggle-registration` - 切换注册开关（管理员）

### 工作空间

- `GET /api/workspaces` - 获取所有工作空间
- `POST /api/workspaces` - 创建工作空间
- `PUT /api/workspaces/:id` - 更新工作空间
- `DELETE /api/workspaces/:id` - 删除工作空间

### 书签

- `GET /api/bookmarks` - 获取所有书签
- `GET /api/bookmarks/tags` - 获取所有标签
- `POST /api/bookmarks` - 创建书签
- `PUT /api/bookmarks/:id` - 更新书签
- `DELETE /api/bookmarks/:id` - 删除书签

### 固定卡片

- `GET /api/workspaces/:id/cards` - 获取工作空间的固定卡片
- `POST /api/workspaces/:id/cards` - 固定书签到工作空间
- `DELETE /api/workspaces/:workspaceId/cards/:cardId` - 移除固定卡片

### 会话

- `GET /api/sessions` - 获取所有会话
- `POST /api/sessions` - 创建/更新会话
- `DELETE /api/sessions/:id` - 删除会话

## 技术栈

### 后端
- Node.js 20
- Express.js
- TypeScript
- SQLite (better-sqlite3)
- JWT 认证
- bcryptjs 密码加密

### 前端
- React 18
- TypeScript
- Tailwind CSS
- Zustand 状态管理
- React DnD 拖拽
- Lucide React 图标

### 部署
- Docker
- Docker Compose
- Nginx（可选）

## 常见问题

### 1. 如何修改管理员密码？

目前需要直接操作数据库：
```bash
docker exec -it workspace-navigator sh
sqlite3 /app/data/app.db
UPDATE users SET password = '$2a$10$newhash...' WHERE id = 'admin';
```

或使用 bcrypt 生成新密码哈希后更新。

### 2. 如何备份数据？

数据存储在 `data/app.db`，复制该文件即可：
```bash
docker cp workspace-navigator:/app/data/app.db ./backup.db
```

### 3. 如何升级应用？

```bash
cd /opt/workspace-navigator
docker-compose down
git pull  # 或重新复制代码
docker-compose up -d --build
```

## License

MIT
