#!/bin/bash
# Оптимизированный скрипт установки LawTech на сервер с другими проектами
# Сервер: 147.45.42.62 (8GB RAM, 120GB диск)

set -e

SERVER="root@147.45.42.62"
PROJECT_DIR="/var/www/lawtech"
DB_NAME="lawtech_crm"
DB_USER="lawtech_user"
DB_PASSWORD=$(openssl rand -base64 32)
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

echo "========================================="
echo " LawTech Deployment Script"
echo " Server: 147.45.42.62"
echo "========================================="

# Генерация .env файлов
echo "📝 Generating environment files..."

# Создаём server/.env
cat > server/.env << EOF
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

# Создаём frontend/.env
cat > frontend/.env << EOF
VITE_API_URL=/api
EOF

# Создаём оптимизированный docker-compose
cat > docker-compose.prod.yml << 'DOCKEREOF'
version: '3.8'

services:
  # MySQL Database - с ограничением ресурсов
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

  # FAISS AI Service - с ограничением ресурсов
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

  # Backend API - с ограничением ресурсов
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

  # Frontend - с ограничением ресурсов
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

# Создаём .env для docker-compose
cat > .env.production << EOF
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
EOF

echo "✅ Environment files generated"
echo ""
echo "📋 Сохраните эти данные (они нужны для подключения к БД):"
echo "   DB_USER: ${DB_USER}"
echo "   DB_PASSWORD: ${DB_PASSWORD}"
echo "   DB_NAME: ${DB_NAME}"
echo "   DB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}"
echo ""
echo "📦 Следующие шаги для выполнения на сервере:"
echo "   1. Скопировать проект на сервер:"
echo "      scp -r . ${SERVER}:${PROJECT_DIR}"
echo ""
echo "   2. Подключиться к серверу:"
echo "      ssh ${SERVER}"
echo ""
echo "   3. Установить Docker и Docker Compose:"
echo "      curl -fsSL https://get.docker.com | sh"
echo "      apt install -y docker-compose-plugin"
echo ""
echo "   4. Перейти в директорию проекта:"
echo "      cd ${PROJECT_DIR}"
echo ""
echo "   5. Запустить проект:"
echo "      docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "   6. Проверить статус:"
echo "      docker compose ps"
echo "      docker compose logs -f"
echo ""
echo "   7. Установить Nginx (если не установлен):"
echo "      apt install -y nginx"
echo ""
echo "   8. Настроить Nginx как reverse proxy (конфиг в nginx-lawtech.conf)"
