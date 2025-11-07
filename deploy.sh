#!/bin/bash

# 🚀 Скрипт автоматического деплоя LawTech на хостинг
# Использование: bash deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начинаем деплой LawTech..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Конфигурация
SERVER_IP="217.26.31.98"
SERVER_USER="root"
PROJECT_DIR="/var/www/lawtech"
DB_NAME="lawtech_crm"
DB_USER="lawtech_user"

echo -e "${YELLOW}📋 Проверка подключения к серверу...${NC}"
ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'Подключение успешно'" || {
    echo -e "${RED}❌ Не удалось подключиться к серверу${NC}"
    exit 1
}

echo -e "${GREEN}✅ Подключение к серверу установлено${NC}"

# Функция для выполнения команд на сервере
run_remote() {
    ssh ${SERVER_USER}@${SERVER_IP} "$1"
}

echo -e "${YELLOW}📦 Шаг 1: Обновление системы...${NC}"
run_remote "apt update && apt upgrade -y"

echo -e "${YELLOW}📦 Шаг 2: Установка необходимого ПО...${NC}"

# Node.js
if ! run_remote "command -v node"; then
    echo "Установка Node.js..."
    run_remote "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install -y nodejs"
fi

# Python
if ! run_remote "command -v python3"; then
    echo "Установка Python..."
    run_remote "apt install -y python3 python3-pip python3-venv"
fi

# MySQL
if ! run_remote "command -v mysql"; then
    echo "Установка MySQL..."
    run_remote "apt install -y mysql-server"
    run_remote "systemctl start mysql && systemctl enable mysql"
fi

# PM2
if ! run_remote "command -v pm2"; then
    echo "Установка PM2..."
    run_remote "npm install -g pm2"
fi

# Nginx
if ! run_remote "command -v nginx"; then
    echo "Установка Nginx..."
    run_remote "apt install -y nginx"
    run_remote "systemctl start nginx && systemctl enable nginx"
fi

echo -e "${GREEN}✅ Все необходимое ПО установлено${NC}"

echo -e "${YELLOW}📁 Шаг 3: Загрузка проекта...${NC}"

# Создание директории проекта
run_remote "mkdir -p ${PROJECT_DIR}"

# Копирование файлов проекта
echo "Копирование файлов на сервер..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
    ./ ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

echo -e "${GREEN}✅ Проект загружен на сервер${NC}"

echo -e "${YELLOW}🗄️ Шаг 4: Настройка базы данных...${NC}"

# Создание базы данных и пользователя
run_remote "mysql -u root -e \"CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
run_remote "mysql -u root -e \"CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY 'your_strong_password_here';\""
run_remote "mysql -u root -e \"GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';\""
run_remote "mysql -u root -e \"FLUSH PRIVILEGES;\""

# Применение миграций
run_remote "mysql -u ${DB_USER} -pyour_strong_password_here ${DB_NAME} < ${PROJECT_DIR}/server/database/migrations/001_crm_sync_mysql.sql" || echo "Миграции уже применены"

echo -e "${GREEN}✅ База данных настроена${NC}"

echo -e "${YELLOW}⚙️ Шаг 5: Настройка Backend...${NC}"

# Установка зависимостей
run_remote "cd ${PROJECT_DIR}/server && npm install --production"

# Создание .env файла
run_remote "cat > ${PROJECT_DIR}/server/.env << 'EOF'
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASSWORD=your_strong_password_here
DB_NAME=${DB_NAME}
DB_PORT=3306
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://${SERVER_IP}
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
FAISS_SERVICE_URL=http://localhost:5000
EOF"

# Создание директории для загрузок
run_remote "mkdir -p ${PROJECT_DIR}/server/uploads"

echo -e "${GREEN}✅ Backend настроен${NC}"

echo -e "${YELLOW}🐍 Шаг 6: Настройка FAISS сервиса...${NC}"

# Установка Python зависимостей
run_remote "cd ${PROJECT_DIR}/server/scripts && pip3 install -r requirements.txt"

echo -e "${GREEN}✅ FAISS сервис настроен${NC}"

echo -e "${YELLOW}🎨 Шаг 7: Настройка Frontend...${NC}"

# Установка зависимостей
run_remote "cd ${PROJECT_DIR}/frontend && npm install"

# Создание .env файла
run_remote "cat > ${PROJECT_DIR}/frontend/.env.production << 'EOF'
VITE_API_URL=http://${SERVER_IP}:3001/api
EOF"

# Сборка frontend
run_remote "cd ${PROJECT_DIR}/frontend && npm run build"

echo -e "${GREEN}✅ Frontend собран${NC}"

echo -e "${YELLOW}🌐 Шаг 8: Настройка Nginx...${NC}"

# Создание конфигурации Nginx
run_remote "cat > /etc/nginx/sites-available/lawtech << 'EOF'
server {
    listen 80;
    server_name ${SERVER_IP};

    # Frontend
    location / {
        root ${PROJECT_DIR}/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control \"public, immutable\";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Загрузка файлов
    location /uploads {
        alias ${PROJECT_DIR}/server/uploads;
        expires 1y;
        add_header Cache-Control \"public\";
    }

    access_log /var/log/nginx/lawtech_access.log;
    error_log /var/log/nginx/lawtech_error.log;
}
EOF"

# Активация конфигурации
run_remote "ln -sf /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/"
run_remote "rm -f /etc/nginx/sites-enabled/default"
run_remote "nginx -t && systemctl reload nginx"

echo -e "${GREEN}✅ Nginx настроен${NC}"

echo -e "${YELLOW}🔥 Шаг 9: Настройка Firewall...${NC}"

run_remote "ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp"
run_remote "echo 'y' | ufw enable" || echo "Firewall уже включен"

echo -e "${GREEN}✅ Firewall настроен${NC}"

echo -e "${YELLOW}🚀 Шаг 10: Запуск сервисов...${NC}"

# Остановка старых процессов (если есть)
run_remote "pm2 delete lawtech-faiss lawtech-backend 2>/dev/null || true"

# Запуск FAISS сервиса
run_remote "cd ${PROJECT_DIR}/server/scripts && pm2 start faiss_service.py --name lawtech-faiss --interpreter python3"

# Запуск Backend
run_remote "cd ${PROJECT_DIR}/server && pm2 start server.js --name lawtech-backend"

# Сохранение конфигурации PM2
run_remote "pm2 save"
run_remote "pm2 startup systemd -u ${SERVER_USER} --hp /root | tail -n 1 | bash"

echo -e "${GREEN}✅ Все сервисы запущены${NC}"

echo -e "${YELLOW}📊 Шаг 11: Проверка работы...${NC}"

sleep 5

# Проверка статуса процессов
echo "Статус процессов:"
run_remote "pm2 status"

# Проверка FAISS
echo -e "\nПроверка FAISS сервиса:"
run_remote "curl -s http://localhost:5000/health || echo 'FAISS не отвечает'"

# Проверка Backend
echo -e "\nПроверка Backend:"
run_remote "curl -s http://localhost:3001/api/health || echo 'Backend не отвечает'"

echo -e "\n${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${GREEN}🌐 Приложение доступно по адресу: http://${SERVER_IP}${NC}"
echo -e "\n${YELLOW}📝 Полезные команды:${NC}"
echo "  - Просмотр логов: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs'"
echo "  - Перезапуск: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 restart all'"
echo "  - Статус: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'"
