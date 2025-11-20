# 🚀 Быстрый старт на хостинге

## Вариант 1: Автоматический деплой (рекомендуется)

### Шаг 1: Подготовка сервера (один раз)

```bash
# Подключение к серверу
ssh root@your-server-ip

# Установка необходимого ПО
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt update && apt install -y nodejs mysql-server nginx git
npm install -g pm2

# Настройка MySQL
mysql_secure_installation
mysql -u root -p << EOF
CREATE DATABASE lawtech_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lawtech_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON lawtech_crm.* TO 'lawtech_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### Шаг 2: Клонирование и настройка проекта

```bash
# Клонирование
cd /var/www
git clone https://github.com/your-username/lawtech-crm.git
cd lawtech-crm

# Настройка Backend
cd server
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=lawtech_user
DB_PASSWORD=your_strong_password
DB_NAME=lawtech_crm
PORT=3001
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://your-domain.com
EOF

npm install --production
npm run migrate

# Настройка Frontend
cd ../frontend
cat > .env << EOF
VITE_API_URL=https://api.your-domain.com
EOF

npm install
npm run build
```

### Шаг 3: Запуск через PM2

```bash
cd /var/www/lawtech-crm

# Создание конфигурации PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'lawtech-backend',
    cwd: './server',
    script: 'index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3001 }
  }]
};
EOF

# Запуск
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Шаг 4: Настройка Nginx

```bash
# Backend
cat > /etc/nginx/sites-available/lawtech-backend << 'EOF'
server {
    listen 80;
    server_name api.your-domain.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Frontend
cat > /etc/nginx/sites-available/lawtech-frontend << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/lawtech-crm/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Активация
ln -s /etc/nginx/sites-available/lawtech-backend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/lawtech-frontend /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### Шаг 5: SSL сертификат

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com
```

### Шаг 6: Автоматические обновления

```bash
# Сделать скрипт деплоя исполняемым
chmod +x /var/www/lawtech-crm/deploy.sh

# Использование
cd /var/www/lawtech-crm
./deploy.sh production
```

---

## Вариант 2: Docker (проще)

### Шаг 1: Установка Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose
```

### Шаг 2: Подготовка проекта

```bash
cd /var/www
git clone https://github.com/your-username/lawtech-crm.git
cd lawtech-crm

# Создание .env
cat > .env << EOF
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
MYSQL_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

### Шаг 3: Запуск

```bash
# Используем готовый docker-compose.yml
docker-compose up -d --build

# Проверка
docker-compose ps
docker-compose logs -f
```

### Шаг 4: Обновление

```bash
cd /var/www/lawtech-crm
git pull origin main
docker-compose up -d --build
```

---

## Проверка работоспособности

```bash
# Backend
curl http://localhost:3001/api/health

# Frontend
curl http://localhost

# Логи PM2
pm2 logs lawtech-backend

# Логи Docker
docker-compose logs -f backend

# Логи Nginx
tail -f /var/log/nginx/error.log
```

---

## Частые проблемы

### Backend не запускается

```bash
# Проверка логов
pm2 logs lawtech-backend --err

# Проверка .env файла
cat server/.env

# Проверка подключения к БД
mysql -u lawtech_user -p lawtech_crm
```

### Frontend показывает ошибки API

```bash
# Проверка CORS в server/.env
# Должно быть: CORS_ORIGIN=https://your-domain.com

# Проверка VITE_API_URL в frontend/.env
# Должно быть: VITE_API_URL=https://api.your-domain.com

# Пересборка frontend
cd frontend
npm run build
```

### Nginx ошибки

```bash
# Проверка конфигурации
nginx -t

# Просмотр ошибок
tail -f /var/log/nginx/error.log

# Перезапуск
systemctl restart nginx
```

---

## Резервное копирование

### Ручной бэкап

```bash
# База данных
mysqldump -u lawtech_user -p lawtech_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Файлы
tar -czf backup_files_$(date +%Y%m%d).tar.gz /var/www/lawtech-crm
```

### Автоматический бэкап

```bash
# Создание скрипта
cat > /usr/local/bin/backup-lawtech.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/lawtech"
mkdir -p $BACKUP_DIR
mysqldump -u lawtech_user -p'your_password' lawtech_crm | gzip > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-lawtech.sh

# Добавление в cron (ежедневно в 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-lawtech.sh") | crontab -
```

---

## Мониторинг

### PM2 мониторинг

```bash
# Статус
pm2 status

# Логи в реальном времени
pm2 logs lawtech-backend

# Мониторинг ресурсов
pm2 monit
```

### Docker мониторинг

```bash
# Статус контейнеров
docker-compose ps

# Логи
docker-compose logs -f

# Использование ресурсов
docker stats
```

---

## Полезные команды

```bash
# Перезапуск всего
pm2 restart all && systemctl restart nginx

# Очистка логов
pm2 flush

# Просмотр использования ресурсов
htop

# Проверка портов
netstat -tulpn | grep -E ':(80|443|3001|3306)'

# Проверка дискового пространства
df -h
```

---

## Контакты поддержки

- **Документация**: См. `DEPLOYMENT.md` для подробностей
- **Чеклист**: См. `DEPLOYMENT_CHECKLIST.md`
- **Скрипт деплоя**: `./deploy.sh production`

Удачи! 🚀
