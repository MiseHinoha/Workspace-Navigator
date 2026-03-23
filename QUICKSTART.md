# 快速开始指南

## 方式一：一键部署脚本（推荐）

```bash
# 1. 将代码上传到服务器
scp -r workspace-navigator root@your-server-ip:/root/

# 2. SSH 登录服务器
ssh root@your-server-ip

# 3. 运行部署脚本
cd workspace-navigator
chmod +x deploy.sh
./deploy.sh
```

按照提示输入域名和是否启用 HTTPS 即可。

## 方式二：手动 Docker 部署

```bash
# 1. 克隆代码
git clone <your-repo>
cd workspace-navigator

# 2. 创建环境配置
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

## 方式三：本地开发

### 方法 A：使用 Mock 服务器

```bash
# 1. 启动 Mock 服务器
cd mock-server
npm install
npm run dev

# 2. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173，使用 admin/admin123 登录。

### 方法 B：完整本地开发

```bash
# 1. 启动后端
cd backend
npm install
npm run dev

# 2. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

## 首次使用

1. 打开应用
2. 使用管理员账号登录：`admin` / `admin123`
3. 创建工作空间（如：支付产品、网站站长、个人、外包项目）
4. 添加书签并拖拽到工作空间
5. 使用顶部搜索栏快速搜索

## 默认账号

- **管理员账号**: admin / admin123
- **建议**: 登录后立即修改密码（需要数据库操作）

## 数据备份

数据存储在 `./data/app.db`，定期备份该目录：

```bash
# 备份
cp -r data data-backup-$(date +%Y%m%d)

# 或 Docker 方式
docker cp workspace-navigator:/app/data/app.db ./backup.db
```

## 常见问题

### 端口被占用
修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8080:3000"  # 使用 8080 端口
```

### 修改管理员密码
```bash
# 进入容器
docker exec -it workspace-navigator sh

# 安装 bcrypt 工具
npm install -g bcrypt-cli

# 生成新密码哈希（例如：newpassword）
bcrypt newpassword

# 更新数据库
sqlite3 /app/data/app.db "UPDATE users SET password='GENERATED_HASH' WHERE username='admin';"
```
