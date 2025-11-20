# 🚀 Инструкция по деплою LawTech CRM

## Содержание
1. [Подготовка к деплою](#подготовка)
2. [Деплой на VPS (Ubuntu/Debian)](#деплой-на-vps)
3. [Деплой с Docker](#деплой-с-docker)
4. [Настройка домена и SSL](#настройка-домена)
5. [Мониторинг и обслуживание](#мониторинг)

---

## Подготовка

### Требования к серверу
- **ОС**: Ubuntu 20.04+ / Debian 11+
- **RAM**: минимум 2GB (рекомендуется 4GB)
- **CPU**: 2 ядра
- **Диск**: минимум 20GB
- **Порты**: 80 (HTTP), 443 (HTTPS), 3001 (API), 5174 (Frontend dev)

### Необходимое ПО
```bash
# Node.js 18+
# MySQL 8.0+
# Nginx
# PM2 (для управления процессами)
# Docker и Docker Compose (опционально)
```

---

## Деплой на VPS (Ubuntu/Debian)

### Шаг 1: Подключение к серверу
```bash
ssh root@your-server-ip
```

### Шаг 2: Установка необходимого ПО

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Установка MySQL
apt install -y mysql-server

# Установка Nginx
apt install -y nginx

# Установка PM2
npm install -g pm2

# Установка Git
apt install -y git
```

### Шаг 3: Настройка MySQL

```bash
# Запуск безопасной установки MySQL
mysql_secure_installation

# Создание базы данных и пользователя
mysql -u root -p
```

```sql
CREATE DATABASE lawtech_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lawtech_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON lawtech_crm.* TO 'lawtech_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Шаг 4: Клонирование проекта

```bash
# Создание директории для проекта
mkdir -p /var/www
cd /var/www

# Клонирование репозитория
git clone https://github.com/your-username/lawtech-crm.git
cd lawtech-crm
```

### Шаг 5: Настройка Backend

```bash
cd server

# Установка зависимостей
npm install --production

# Создание .env файла
cat > .env << EOF
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=lawtech_user
DB_PASSWORD=your_strong_password
DB_NAME=lawtech_crm

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# GigaChat API (если используется)
GIGACHAT_CLIENT_ID=your_client_id
GIGACHAT_CLIENT_SECRET=your_client_secret

# CORS
CORS_ORIGIN=https://your-domain.com
EOF

# Запуск миграций
npm run migrate

# Создание тестовых данных (опционально)
npm run seed
```

### Шаг 6: Настройка Frontend

```bash
cd ../frontend

# Установка зависимостей
npm install

# Создание .env файла
cat > .env << EOF
VITE_API_URL=https://api.your-domain.com
VITE_APP_NAME=LawTech CRM
EOF

# Сборка production версии
npm run build
```

### Шаг 7: Настройка PM2

```bash
cd /var/www/lawtech-crm

# Создание ecosystem файла для PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'lawtech-backend',
      cwd: './server',
      script: 'index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF

# Создание директории для логов
mkdir -p server/logs

# Запуск приложения
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save

# Автозапуск PM2 при перезагрузке
pm2 startup
```

### Шаг 8: Настройка Nginx

```bash
# Создание конфигурации для backend
cat > /etc/nginx/sites-available/lawtech-backend << EOF
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Увеличение таймаутов для длинных запросов
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
EOF

# Создание конфигурации для frontend
cat > /etc/nginx/sites-available/lawtech-frontend << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/lawtech-crm/frontend/dist;
    index index.html;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Активация конфигураций
ln -s /etc/nginx/sites-available/lawtech-backend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/lawtech-frontend /etc/nginx/sites-enabled/

# Проверка конфигурации
nginx -t

# Перезапуск Nginx
systemctl restart nginx
```

---

## Деплой с Docker

### Шаг 1: Установка Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
apt install -y docker-compose

# Добавление пользователя в группу docker
usermod -aG docker $USER
```

### Шаг 2: Подготовка проекта

```bash
cd /var/www/lawtech-crm

# Создание production docker-compose файла
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: lawtech-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: lawtech_crm
      MYSQL_USER: lawtech_user
      MYSQL_PASSWORD: \${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./server/database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"
    networks:
      - lawtech-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: lawtech-backend
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: lawtech_user
      DB_PASSWORD: \${MYSQL_PASSWORD}
      DB_NAME: lawtech_crm
      JWT_SECRET: \${JWT_SECRET}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - lawtech-network
    volumes:
      - ./server/logs:/app/logs

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://api.your-domain.com
    container_name: lawtech-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - lawtech-network

volumes:
  mysql_data:

networks:
  lawtech-network:
    driver: bridge
EOF

# Создание .env файла для Docker
cat > .env << EOF
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
MYSQL_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

### Шаг 3: Создание Dockerfile для Backend

```bash
cat > server/Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

# Копирование package файлов
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Открытие порта
EXPOSE 3001

# Запуск приложения
CMD ["node", "index.js"]
EOF
```

### Шаг 4: Создание Dockerfile для Frontend

```bash
cat > frontend/Dockerfile << EOF
# Этап сборки
FROM node:18-alpine as build

WORKDIR /app

# Копирование package файлов
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Аргументы сборки
ARG VITE_API_URL
ENV VITE_API_URL=\$VITE_API_URL

# Сборка приложения
RUN npm run build

# Этап production
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Создание конфигурации Nginx для контейнера
cat > frontend/nginx.conf << EOF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### Шаг 5: Запуск Docker Compose

```bash
# Сборка и запуск контейнеров
docker-compose -f docker-compose.prod.yml up -d --build

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

---

## Настройка домена и SSL

### Установка Certbot для SSL

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Автоматическое обновление сертификата
certbot renew --dry-run
```

### Настройка автообновления SSL

```bash
# Добавление задачи в cron
crontab -e

# Добавить строку:
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## Мониторинг и обслуживание

### Мониторинг PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs lawtech-backend

# Мониторинг в реальном времени
pm2 monit

# Перезапуск приложения
pm2 restart lawtech-backend

# Остановка приложения
pm2 stop lawtech-backend
```

### Мониторинг Docker

```bash
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f backend

# Просмотр статуса контейнеров
docker-compose -f docker-compose.prod.yml ps

# Перезапуск контейнера
docker-compose -f docker-compose.prod.yml restart backend

# Обновление контейнеров
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Резервное копирование базы данных

```bash
# Создание скрипта для бэкапа
cat > /usr/local/bin/backup-lawtech.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/lawtech"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

# Бэкап базы данных
mysqldump -u lawtech_user -p'your_password' lawtech_crm | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# Удаление старых бэкапов (старше 7 дней)
find \$BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: \$DATE"
EOF

chmod +x /usr/local/bin/backup-lawtech.sh

# Добавление в cron (ежедневно в 2:00)
crontab -e
# Добавить: 0 2 * * * /usr/local/bin/backup-lawtech.sh
```

### Обновление приложения

```bash
# Без Docker
cd /var/www/lawtech-crm
git pull origin main
cd server && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart lawtech-backend

# С Docker
cd /var/www/lawtech-crm
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Проверка работоспособности

### Проверка Backend
```bash
curl http://localhost:3001/api/health
```

### Проверка Frontend
```bash
curl http://localhost
```

### Проверка MySQL
```bash
mysql -u lawtech_user -p -e "SELECT 1"
```

---

## Troubleshooting

### Проблемы с подключением к БД
```bash
# Проверка статуса MySQL
systemctl status mysql

# Проверка логов MySQL
tail -f /var/log/mysql/error.log

# Проверка подключения
mysql -u lawtech_user -p lawtech_crm
```

### Проблемы с Nginx
```bash
# Проверка конфигурации
nginx -t

# Просмотр логов
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Перезапуск
systemctl restart nginx
```

### Проблемы с PM2
```bash
# Просмотр логов ошибок
pm2 logs lawtech-backend --err

# Полная перезагрузка
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## Безопасность

### Настройка файрвола (UFW)
```bash
# Установка UFW
apt install -y ufw

# Разрешение необходимых портов
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Включение файрвола
ufw enable

# Проверка статуса
ufw status
```

### Настройка fail2ban
```bash
# Установка
apt install -y fail2ban

# Создание конфигурации
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
EOF

# Запуск
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Полезные команды

```bash
# Просмотр использования ресурсов
htop

# Просмотр использования диска
df -h

# Просмотр использования памяти
free -h

# Просмотр активных подключений
netstat -tulpn

# Просмотр процессов Node.js
ps aux | grep node

# Очистка логов
truncate -s 0 /var/log/nginx/access.log
truncate -s 0 /var/log/nginx/error.log
```

---

## Контакты и поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Проверьте логи Nginx
3. Проверьте логи MySQL
4. Проверьте статус всех сервисов

Удачного деплоя! 🚀
