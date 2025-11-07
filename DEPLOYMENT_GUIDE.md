# 🚀 Руководство по деплою LawTech CRM на хостинг

## 📋 Предварительные требования

На сервере должны быть установлены:
- Node.js (v18+)
- npm или yarn
- MySQL (v8.0+)
- Python 3.8+ (для FAISS сервиса)
- PM2 (для управления процессами)
- Nginx (для проксирования)

## 🐳 Быстрый деплой через Docker (Рекомендуется)

Если на сервере установлен Docker и Docker Compose, можно развернуть всё одной командой:

```bash
# Подключение к серверу
ssh root@217.26.31.98

# Установка Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
apt install -y docker-compose

# Клонирование проекта
cd /var/www
git clone <URL_вашего_репозитория> lawtech
cd lawtech

# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps
docker-compose logs -f
```

Готово! Приложение доступно на http://217.26.31.98

---

## 📝 Ручная установка (Детальная инструкция)

---

## 🔧 Шаг 1: Подключение к серверу

```bash
ssh root@217.26.31.98
# Пароль: ay*k!8WK5dYB
```

---

## 📦 Шаг 2: Установка необходимого ПО

### 2.1 Обновление системы
```bash
apt update && apt upgrade -y
```

### 2.2 Установка Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
npm --version
```

### 2.3 Установка Python и pip
```bash
apt install -y python3 python3-pip python3-venv
python3 --version
pip3 --version
```

### 2.4 Установка MySQL
```bash
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Настройка безопасности MySQL
mysql_secure_installation
```

### 2.5 Установка PM2
```bash
npm install -g pm2
```

### 2.6 Установка Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

---

## 📁 Шаг 3: Загрузка проекта на сервер

### Вариант 1: Через Git (рекомендуется)
```bash
cd /var/www
git clone <URL_вашего_репозитория> lawtech
cd lawtech
```

### Вариант 2: Через SCP (с локальной машины)
```bash
# На локальной машине (Windows)
# Установите WinSCP или используйте scp команду
scp -r C:\path\to\LawTech-new root@217.26.31.98:/var/www/lawtech
```

---

## 🗄️ Шаг 4: Настройка базы данных

### 4.1 Создание базы данных
```bash
mysql -u root -p
```

```sql
CREATE DATABASE lawtech_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lawtech_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON lawtech_crm.* TO 'lawtech_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.2 Импорт схемы базы данных
```bash
cd /var/www/lawtech/server
mysql -u lawtech_user -p lawtech_crm < database/migrations/001_crm_sync_mysql.sql
```

---

## ⚙️ Шаг 5: Настройка Backend

### 5.1 Установка зависимостей
```bash
cd /var/www/lawtech/server
npm install
```

### 5.2 Создание .env файла
```bash
nano .env
```

Добавьте следующее содержимое:
```env
# Server
PORT=3001
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=lawtech_user
DB_PASSWORD=your_strong_password_here
DB_NAME=lawtech_crm
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://217.26.31.98,http://your-domain.com

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

Сохраните: `Ctrl+X`, затем `Y`, затем `Enter`

### 5.3 Установка Python зависимостей для FAISS
```bash
cd /var/www/lawtech/server/scripts
pip3 install -r requirements.txt
```

### 5.4 Запуск FAISS сервиса через PM2
```bash
cd /var/www/lawtech/server/scripts
pm2 start faiss_service.py --name lawtech-faiss --interpreter python3
```

### 5.5 Запуск backend через PM2
```bash
cd /var/www/lawtech/server
pm2 start server.js --name lawtech-backend
pm2 save
pm2 startup
```

---

## 🎨 Шаг 6: Настройка Frontend

### 6.1 Установка зависимостей
```bash
cd /var/www/lawtech/frontend
npm install
```

### 6.2 Создание .env файла
```bash
nano .env.production
```

Добавьте:
```env
VITE_API_URL=http://217.26.31.98:3001/api
```

### 6.3 Сборка frontend
```bash
npm run build
```

Это создаст папку `dist` с готовыми файлами.

---

## 🌐 Шаг 7: Настройка Nginx

### 7.1 Создание конфигурации
```bash
nano /etc/nginx/sites-available/lawtech
```

Добавьте следующую конфигурацию:
```nginx
server {
    listen 80;
    server_name 217.26.31.98;  # Замените на ваш домен, если есть

    # Frontend
    location / {
        root /var/www/lawtech/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличиваем таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Загрузка файлов
    location /uploads {
        alias /var/www/lawtech/server/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Логи
    access_log /var/log/nginx/lawtech_access.log;
    error_log /var/log/nginx/lawtech_error.log;
}
```

### 7.2 Активация конфигурации
```bash
ln -s /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🔒 Шаг 8: Настройка SSL (опционально, но рекомендуется)

### 8.1 Установка Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 8.2 Получение SSL сертификата
```bash
# Замените your-domain.com на ваш домен
certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🔥 Шаг 9: Настройка Firewall

```bash
# Разрешаем SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 📊 Шаг 10: Проверка работы

### 10.1 Проверка всех сервисов
```bash
# Проверка статуса всех процессов
pm2 status

# Проверка FAISS сервиса
pm2 logs lawtech-faiss --lines 50
curl http://localhost:5000/health

# Проверка backend
pm2 logs lawtech-backend --lines 50
curl http://localhost:3001/api/health
```

### 10.2 Проверка frontend
Откройте в браузере: `http://217.26.31.98`

### 10.3 Проверка базы данных
```bash
mysql -u lawtech_user -p lawtech_crm -e "SHOW TABLES;"
```

---

## 🛠️ Полезные команды

### PM2
```bash
pm2 list                    # Список процессов
pm2 logs lawtech-backend    # Логи backend
pm2 logs lawtech-faiss      # Логи FAISS сервиса
pm2 restart lawtech-backend # Перезапуск backend
pm2 restart lawtech-faiss   # Перезапуск FAISS
pm2 restart all             # Перезапуск всех процессов
pm2 stop lawtech-backend    # Остановка backend
pm2 stop lawtech-faiss      # Остановка FAISS
pm2 delete lawtech-backend  # Удаление процесса backend
pm2 delete lawtech-faiss    # Удаление процесса FAISS
```

### Nginx
```bash
nginx -t                    # Проверка конфигурации
systemctl reload nginx      # Перезагрузка конфигурации
systemctl restart nginx     # Перезапуск Nginx
tail -f /var/log/nginx/lawtech_error.log  # Просмотр логов
```

### MySQL
```bash
mysql -u lawtech_user -p lawtech_crm  # Подключение к БД
mysqldump -u lawtech_user -p lawtech_crm > backup.sql  # Бэкап БД
```

---

## 🔄 Обновление проекта

### Через Git
```bash
cd /var/www/lawtech
git pull origin main

# FAISS сервис
cd server/scripts
pip3 install -r requirements.txt
pm2 restart lawtech-faiss

# Backend
cd ..
npm install
pm2 restart lawtech-backend

# Frontend
cd ../frontend
npm install
npm run build
```

### Через SCP
```bash
# На локальной машине
scp -r C:\path\to\LawTech-new\* root@217.26.31.98:/var/www/lawtech/

# На сервере
cd /var/www/lawtech/server
npm install
pm2 restart lawtech-backend

cd /var/www/lawtech/frontend
npm install
npm run build
```

---

## 🐛 Решение проблем

### FAISS сервис не запускается
```bash
pm2 logs lawtech-faiss --lines 100
# Проверьте установку Python зависимостей
cd /var/www/lawtech/server/scripts
pip3 install -r requirements.txt
pm2 restart lawtech-faiss
```

### Backend не запускается
```bash
pm2 logs lawtech-backend --lines 100
# Проверьте .env файл
# Проверьте подключение к БД
# Проверьте доступность FAISS сервиса
curl http://localhost:5000/health
```

### Frontend показывает ошибки API
```bash
# Проверьте CORS в backend
# Проверьте VITE_API_URL в frontend
# Проверьте логи Nginx
tail -f /var/log/nginx/lawtech_error.log
```

### База данных не подключается
```bash
# Проверьте статус MySQL
systemctl status mysql

# Проверьте права пользователя
mysql -u root -p
SHOW GRANTS FOR 'lawtech_user'@'localhost';
```

---

## 📝 Тестовые данные

После деплоя можно добавить тестовые данные:
```bash
cd /var/www/lawtech/server
node scripts/seed_test_data.js
```

---

## 🔐 Безопасность

1. **Смените пароли** в .env файлах
2. **Настройте firewall** (ufw)
3. **Установите SSL** сертификат
4. **Регулярно обновляйте** систему и зависимости
5. **Делайте бэкапы** базы данных

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `pm2 logs lawtech-backend`
2. Проверьте Nginx: `tail -f /var/log/nginx/lawtech_error.log`
3. Проверьте MySQL: `systemctl status mysql`

---

## ✅ Чеклист деплоя

- [ ] Сервер обновлен
- [ ] Node.js 18+ установлен
- [ ] Python 3.8+ установлен
- [ ] MySQL 8.0+ установлен и настроен
- [ ] PM2 установлен
- [ ] Nginx установлен
- [ ] Проект загружен на сервер
- [ ] База данных создана и миграции применены
- [ ] Python зависимости установлены
- [ ] FAISS сервис запущен (порт 5000)
- [ ] Backend настроен и запущен (порт 3001)
- [ ] Frontend собран
- [ ] Nginx настроен
- [ ] Firewall настроен
- [ ] SSL установлен (опционально)
- [ ] Все сервисы работают (pm2 status)
- [ ] Проект доступен через браузер!

---

**Удачи с деплоем! 🚀**
