#!/bin/bash
# Полный скрипт установки LawTech на сервер
# Запускать на сервере: bash /var/www/lawtech/scripts/install_on_server.sh

set -e

PROJECT_DIR="/var/www/lawtech"
DB_NAME="lawtech_crm"
DB_USER="lawtech_user"
DB_PASSWORD=$(openssl rand -base64 24)
DB_ROOT_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)

echo "========================================="
echo " LawTech Installation Script"
echo "========================================="
echo ""

# Шаг 1: Установка Docker
echo "📦 Шаг 1: Установка Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker уже установлен: $(docker --version)"
else
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker установлен: $(docker --version)"
fi
echo ""

# Шаг 2: Установка Docker Compose
echo "📦 Шаг 2: Установка Docker Compose..."
if command -v docker compose &> /dev/null; then
    echo "✅ Docker Compose уже установлен"
else
    echo "Установка Docker Compose plugin..."
    apt-get update
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose установлен: $(docker compose version)"
fi
echo ""

# Шаг 3: Установка Nginx
echo "📦 Шаг 3: Установка Nginx..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx уже установлен: $(nginx -v 2>&1)"
else
    echo "Установка Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo "✅ Nginx установлен: $(nginx -v 2>&1)"
fi
echo ""

# Шаг 4: Генерация .env файлов
echo "📝 Шаг 4: Генерация конфигурации..."

# server/.env
cat > ${PROJECT_DIR}/server/.env << EOF
# Database
DB_HOST=db
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Uploads
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# FAISS
FAISS_SERVICE_URL=http://faiss-service:5000
EOF

# frontend/.env
cat > ${PROJECT_DIR}/frontend/.env << EOF
VITE_API_URL=/api
EOF

# .env.production для docker-compose
cat > ${PROJECT_DIR}/.env.production << EOF
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
EOF

echo "✅ Конфигурация сгенерирована"
echo ""

# Шаг 5: Создание docker-compose.prod.yml
echo "📝 Шаг 5: Создание docker-compose.prod.yml..."
cat > ${PROJECT_DIR}/docker-compose.prod.yml << 'DOCKEREOF'
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: lawtech-db
    restart: unless-stopped
    ports:
      - "3307:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./server/database/migrations:/docker-entrypoint-initdb.d
    networks:
      - lawtech-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  faiss-service:
    build:
      context: ./server/scripts
      dockerfile: Dockerfile
    container_name: lawtech-faiss
    restart: unless-stopped
    environment:
      PYTHONUNBUFFERED=1
      PORT=5000
    networks:
      - lawtech-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: lawtech-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      FAISS_SERVICE_URL: http://faiss-service:5000
      DB_HOST: db
      DB_PORT: 3306
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: '*'
      UPLOAD_DIR: /app/uploads
      MAX_FILE_SIZE: 10485760
    depends_on:
      db:
        condition: service_healthy
      faiss-service:
        condition: service_started
    networks:
      - lawtech-network
    volumes:
      - ./server/uploads:/app/uploads
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lawtech-frontend
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - lawtech-network
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

volumes:
  mysql-data:
    driver: local

networks:
  lawtech-network:
    driver: bridge
DOCKEREOF
echo "✅ docker-compose.prod.yml создан"
echo ""

# Шаг 6: Настройка Nginx
echo "📝 Шаг 6: Настройка Nginx..."
cat > /etc/nginx/sites-available/lawtech << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    location / {
        proxy_pass http://lawtech-frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://lawtech-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    location /uploads/ {
        proxy_pass http://lawtech-backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Активация конфигурации
ln -sf /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
echo "✅ Nginx настроен"
echo ""

# Шаг 7: Запуск Docker Compose
echo "🚀 Шаг 7: Запуск LawTech..."
cd ${PROJECT_DIR}
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
echo "✅ LawTech запущен"
echo ""

# Шаг 8: Проверка
echo "🔍 Шаг 8: Проверка..."
sleep 10
docker compose -f docker-compose.prod.yml ps
echo ""

# Проверка API
echo "🔍 Проверка API..."
curl -s http://localhost/api/health || echo "API пока не готов, подождите 30 секунд..."
echo ""

# Сохранение учётных данных
echo "========================================="
echo "✅ LawTech успешно установлен!"
echo "========================================="
echo ""
echo "📋 URL: http://147.45.42.62"
echo "📋 API: http://147.45.42.62/api/health"
echo ""
echo "🔐 Сохраните данные для подключения к БД:"
echo "   DB_USER: ${DB_USER}"
echo "   DB_PASSWORD: ${DB_PASSWORD}"
echo "   DB_NAME: ${DB_NAME}"
echo "   DB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}"
echo "   JWT_SECRET: ${JWT_SECRET}"
echo ""
echo "📊 Управление:"
echo "   docker compose -f docker-compose.prod.yml ps"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo "   docker compose -f docker-compose.prod.yml restart"
echo ""
echo "📝 Тестовые аккаунты (создаются автоматически):"
echo "   Директор: director@lawtech.ru / Director123!"
echo "   Юрист: lawyer@lawtech.ru / Lawyer123!"
echo ""
