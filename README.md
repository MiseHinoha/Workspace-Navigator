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

## 部署到腾讯云轻量级服务器

### 方案一：宝塔面板部署（推荐新手）

#### 1. 购买和配置服务器

1. 登录 [腾讯云轻量应用服务器控制台](https://console.cloud.tencent.com/lighthouse)
2. 购买轻量服务器（推荐配置：2核4G，Ubuntu 22.04 LTS 镜像）
3. 开通后设置 root 密码，记录服务器公网 IP
4. 在防火墙/安全组中添加规则，开放端口：`80`, `443`, `3000`, `8888`（宝塔）

#### 2. 登录服务器并安装宝塔面板

```bash
# 通过 SSH 连接服务器（Windows 可用 PowerShell 或 XShell）
ssh root@your-server-ip

# 安装宝塔面板（Ubuntu/Debian 系统）
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec

# 安装完成后会显示面板地址、用户名和密码，请务必保存
# 示例输出：
# 外网面板地址: http://123.456.789.0:8888/abc123def
# 内网面板地址: http://10.0.0.5:8888/abc123def
# username: admin
# password: 1234567890
```

#### 3. 宝塔面板初始化设置

1. 浏览器访问宝塔面板地址，登录后按提示完成初始化
2. 一键安装 LNMP 环境，选择：
   - **Nginx 1.24**（必选）
   - MySQL（可选，本项目用 SQLite 不需要）
   - PHP（可选）
   - phpMyAdmin（可选）
3. 等待安装完成（约 3-5 分钟）

#### 4. 安装 Docker

在宝塔面板中：
1. 点击左侧「Docker」菜单
2. 点击「立即安装」，选择 Docker 版本安装
3. 或者使用命令行安装：

```bash
# 通过 SSH 登录服务器执行
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

#### 5. 部署项目

```bash
# 进入服务器，创建项目目录
mkdir -p /www/workspace-navigator
cd /www/workspace-navigator

# 方式 A：通过 Git 克隆（推荐）
git clone https://github.com/MiseHinoha/Workspace-Navigator.git .

# 方式 B：本地打包上传
# 在本地项目目录执行：
# tar czvf workspace-navigator.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .
# 然后通过宝塔面板「文件」功能上传到 /www/workspace-navigator
# 在服务器解压：tar xzvf workspace-navigator.tar.gz

# 创建环境变量文件
cp .env.example .env

# 编辑环境变量（使用宝塔面板文件管理器或 nano）
nano .env
```

`.env` 文件配置示例：
```env
# JWT 密钥（必须修改！使用随机字符串）
JWT_SECRET=your-random-secret-key-here-32chars-min

# 端口配置
BACKEND_PORT=3000
FRONTEND_PORT=80

# 其他配置保持默认
```

```bash
# 启动 Docker 容器
docker-compose up -d

# 查看运行状态
docker-compose ps
docker-compose logs -f
```

#### 6. 配置 Nginx 反向代理（宝塔面板）

**步骤 1：添加网站**
1. 登录宝塔面板
2. 点击左侧「网站」→「添加站点」
3. 填写域名（如果没有域名，填写服务器 IP）
4. 根目录可随意填写（如 `/www/wwwroot/nav`），本项目用 Docker 不需要
5. 点击「提交」

**步骤 2：配置反向代理**
1. 在网站列表中，点击刚添加的站点「设置」
2. 选择「反向代理」选项卡
3. 点击「添加反向代理」
4. 填写：
   - 代理名称：`workspace-navigator`
   - 目标 URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
5. 点击「提交」

**步骤 3：配置 Nginx 配置文件（可选优化）**

点击「配置文件」，确保包含以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或服务器 IP
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
    
    # 反向代理到 Docker 容器
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # WebSocket 支持（用于开发热更新）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # 传递真实客户端 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_cache_bypass $http_upgrade;
    }
    
    # 可选：启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

点击「保存」，然后「重载配置」。

#### 7. 配置 HTTPS（SSL 证书）

**方式 A：使用宝塔 SSL 证书（推荐有域名用户）**
1. 在网站设置中点击「SSL」选项卡
2. 选择「Let's Encrypt」
3. 勾选域名，点击「申请」
4. 申请成功后开启「强制 HTTPS」

**方式 B：手动上传证书**
1. 在「SSL」选项卡选择「其他证书」
2. 粘贴密钥(KEY)和证书(PEM)内容
3. 保存并启用

#### 8. 访问应用

- HTTP：`http://your-domain.com` 或 `http://server-ip`
- HTTPS：`https://your-domain.com`（配置 SSL 后）
- 默认管理员账号：`admin` / `admin123`

---

### 方案二：命令行部署（适合有经验用户）

#### 1. 准备工作

```bash
# 连接到腾讯云服务器
ssh root@your-server-ip

# 更新系统
apt-get update && apt-get upgrade -y

# 安装必要工具
apt-get install -y curl wget git nano

# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 安装 Docker Compose
apt-get install -y docker-compose-plugin
# 或
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 2. 部署应用

```bash
# 创建应用目录
mkdir -p /opt/workspace-navigator
cd /opt/workspace-navigator

# 克隆代码
git clone https://github.com/MiseHinoha/Workspace-Navigator.git .

# 创建环境配置
cp .env.example .env
nano .env  # 修改 JWT_SECRET 为随机字符串

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 3. 安装和配置 Nginx

```bash
# 安装 Nginx
apt-get install -y nginx

# 创建配置文件
nano /etc/nginx/sites-available/workspace-navigator
```

添加配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或服务器 IP

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

```bash
# 启用配置
ln -s /etc/nginx/sites-available/workspace-navigator /etc/nginx/sites-enabled/
nginx -t  # 测试配置
systemctl restart nginx

# 如果使用防火墙，开放 80 端口
ufw allow 80
ufw allow 443
```

#### 4. 配置 HTTPS（Let's Encrypt）

```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期已默认启用，可手动测试：
certbot renew --dry-run
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
