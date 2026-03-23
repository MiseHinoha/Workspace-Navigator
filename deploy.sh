#!/bin/bash

# Workspace Navigator Deployment Script for Ubuntu/Debian
# This script helps you deploy the application to a fresh Ubuntu server

set -e

echo "🚀 Workspace Navigator 部署脚本"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# Configuration
APP_DIR="/opt/workspace-navigator"
DOMAIN=""
USE_HTTPS="n"

# Get user input
echo ""
read -p "请输入域名（可选，留空则使用 IP 访问）: " DOMAIN
if [ ! -z "$DOMAIN" ]; then
    read -p "是否配置 HTTPS? (y/n): " USE_HTTPS
fi

# Update system
echo -e "${YELLOW}正在更新系统...${NC}"
apt-get update
apt-get upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}正在安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $SUDO_USER
else
    echo -e "${GREEN}Docker 已安装${NC}"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}正在安装 Docker Compose...${NC}"
    apt-get install -y docker-compose-plugin
fi

# Create app directory
echo -e "${YELLOW}创建应用目录...${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/data

# Copy files
echo -e "${YELLOW}复制项目文件...${NC}"
cp -r . $APP_DIR/
cd $APP_DIR

# Create .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}创建环境配置文件...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    cat > .env << EOF
JWT_SECRET=$JWT_SECRET
PORT=3000
NODE_ENV=production
DATA_DIR=/app/data
EOF
fi

# Start the application
echo -e "${YELLOW}启动应用...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d

# Install and configure Nginx if domain is provided
if [ ! -z "$DOMAIN" ]; then
    echo -e "${YELLOW}安装 Nginx...${NC}"
    apt-get install -y nginx

    # Create Nginx config
    cat > /etc/nginx/sites-available/workspace-navigator << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/workspace-navigator /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl restart nginx

    # Configure HTTPS if requested
    if [ "$USE_HTTPS" = "y" ] || [ "$USE_HTTPS" = "Y" ]; then
        echo -e "${YELLOW}配置 HTTPS...${NC}"
        apt-get install -y certbot python3-certbot-nginx
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    fi
fi

# Print success message
echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "================================"
if [ ! -z "$DOMAIN" ]; then
    echo -e "应用地址: ${GREEN}http://$DOMAIN${NC}"
    if [ "$USE_HTTPS" = "y" ] || [ "$USE_HTTPS" = "Y" ]; then
        echo -e "HTTPS地址: ${GREEN}https://$DOMAIN${NC}"
    fi
else
    IP=$(hostname -I | awk '{print $1}')
    echo -e "应用地址: ${GREEN}http://$IP:3000${NC}"
fi
echo ""
echo "默认管理员账号:"
echo "  用户名: ${GREEN}admin${NC}"
echo "  密码: ${GREEN}admin123${NC}"
echo ""
echo "常用命令:"
echo "  查看日志: ${YELLOW}docker-compose logs -f${NC}"
echo "  重启应用: ${YELLOW}docker-compose restart${NC}"
echo "  停止应用: ${YELLOW}docker-compose down${NC}"
echo "  备份数据: ${YELLOW}cp -r data data-backup-$(date +%Y%m%d)${NC}"
