# ❓ FAQ по деплою LawTech CRM

## Общие вопросы

### Какой хостинг выбрать?

**Рекомендуемые варианты:**
- **VPS/VDS**: DigitalOcean, Linode, Vultr, Hetzner (от $5/месяц)
- **Облачные**: AWS, Google Cloud, Azure (гибкое масштабирование)
- **Российские**: Yandex Cloud, VK Cloud, Selectel

**Минимальные требования:**
- 2GB RAM
- 2 CPU cores
- 20GB SSD
- Ubuntu 20.04+

### PM2 или Docker - что выбрать?

**PM2** (проще для начала):
- ✅ Проще настроить
- ✅ Меньше overhead
- ✅ Легче отлаживать
- ❌ Нужно настраивать MySQL отдельно

**Docker** (лучше для масштабирования):
- ✅ Изолированная среда
- ✅ Легко масштабировать
- ✅ Все в одном месте
- ❌ Больше потребление ресурсов

**Рекомендация**: Начните с PM2, переходите на Docker при росте.

---

## Проблемы при установке

### Ошибка: "Cannot connect to MySQL"

**Решение:**
```bash
# Проверка статуса MySQL
systemctl status mysql

# Проверка подключения
mysql -u lawtech_user -p

# Проверка прав пользователя
mysql -u root -p
SHOW GRANTS FOR 'lawtech_user'@'localhost';

# Если нужно пересоздать пользователя
DROP USER 'lawtech_user'@'localhost';
CREATE USER 'lawtech_user'@'localhost' IDENTIFIED BY 'new_password';
GRANT ALL PRIVILEGES ON lawtech_crm.* TO 'lawtech_user'@'localhost';
FLUSH PRIVILEGES;
```

### Ошибка: "Port 3001 already in use"

**Решение:**
```bash
# Найти процесс на порту 3001
lsof -i :3001

# Убить процесс
kill -9 <PID>

# Или изменить порт в server/.env
PORT=3002
```

### Ошибка: "npm install fails"

**Решение:**
```bash
# Очистка кэша npm
npm cache clean --force

# Удаление node_modules
rm -rf node_modules package-lock.json

# Переустановка
npm install

# Если не помогает, обновите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

---

## Проблемы с Nginx

### Ошибка: "502 Bad Gateway"

**Причины и решения:**

1. **Backend не запущен**
```bash
pm2 status
pm2 restart lawtech-backend
```

2. **Неправильный proxy_pass**
```nginx
# Должно быть
proxy_pass http://localhost:3001;
# А не
proxy_pass http://localhost:3001/;  # Лишний слэш!
```

3. **SELinux блокирует**
```bash
# Проверка
getenforce

# Временное отключение
setenforce 0

# Постоянное разрешение
setsebool -P httpd_can_network_connect 1
```

### Ошибка: "nginx: [emerg] bind() to 0.0.0.0:80 failed"

**Решение:**
```bash
# Проверка что занимает порт 80
lsof -i :80

# Если Apache
systemctl stop apache2
systemctl disable apache2

# Перезапуск Nginx
systemctl restart nginx
```

---

## Проблемы с SSL

### Certbot не может получить сертификат

**Решение:**
```bash
# Проверка DNS
dig your-domain.com

# Проверка доступности порта 80
curl http://your-domain.com

# Временная остановка Nginx
systemctl stop nginx

# Получение сертификата standalone
certbot certonly --standalone -d your-domain.com

# Запуск Nginx
systemctl start nginx
```

### Сертификат не обновляется автоматически

**Решение:**
```bash
# Тест обновления
certbot renew --dry-run

# Проверка cron
crontab -l

# Добавление задачи если нет
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
```

---

## Проблемы с производительностью

### Сайт работает медленно

**Решения:**

1. **Включить gzip в Nginx**
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

2. **Настроить кэширование**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

3. **Увеличить PM2 instances**
```javascript
// ecosystem.config.js
instances: 4,  // Вместо 2
```

4. **Оптимизировать MySQL**
```sql
-- Добавить индексы
CREATE INDEX idx_contracts_date ON contracts(contract_date);
CREATE INDEX idx_clients_name ON clients(name);
```

### Высокое использование памяти

**Решения:**

1. **Ограничить память PM2**
```bash
pm2 start ecosystem.config.js --max-memory-restart 500M
```

2. **Настроить swap**
```bash
# Создание swap файла 2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Автомонтирование
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Проблемы с Docker

### Контейнер постоянно перезапускается

**Решение:**
```bash
# Просмотр логов
docker-compose logs backend

# Проверка здоровья контейнера
docker inspect lawtech-backend

# Запуск в интерактивном режиме для отладки
docker-compose run --rm backend sh
```

### Ошибка: "no space left on device"

**Решение:**
```bash
# Очистка неиспользуемых образов
docker system prune -a

# Очистка volumes
docker volume prune

# Проверка использования
docker system df
```

---

## Проблемы с базой данных

### Миграции не применяются

**Решение:**
```bash
# Проверка текущей версии
mysql -u lawtech_user -p lawtech_crm -e "SELECT * FROM migrations"

# Ручное применение миграции
mysql -u lawtech_user -p lawtech_crm < server/database/migrations/001_migration.sql

# Пересоздание БД (ОСТОРОЖНО!)
mysql -u root -p << EOF
DROP DATABASE lawtech_crm;
CREATE DATABASE lawtech_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

cd server && npm run migrate
```

### Ошибка: "Too many connections"

**Решение:**
```sql
-- Увеличение лимита подключений
SET GLOBAL max_connections = 200;

-- Постоянное изменение в /etc/mysql/my.cnf
[mysqld]
max_connections = 200
```

---

## Проблемы с фронтендом

### API запросы не работают (CORS)

**Решение:**
```bash
# Проверка CORS_ORIGIN в server/.env
CORS_ORIGIN=https://your-domain.com

# Перезапуск backend
pm2 restart lawtech-backend

# Проверка в браузере
# Откройте DevTools -> Network -> проверьте заголовки
```

### Белый экран после деплоя

**Решение:**
```bash
# Проверка сборки
cd frontend
npm run build

# Проверка путей в Nginx
# root должен указывать на frontend/dist

# Проверка консоли браузера
# F12 -> Console -> смотрим ошибки

# Проверка VITE_API_URL
cat frontend/.env
# Должно быть: VITE_API_URL=https://api.your-domain.com
```

---

## Мониторинг и логи

### Где смотреть логи?

**PM2:**
```bash
pm2 logs lawtech-backend
pm2 logs lawtech-backend --err
pm2 logs lawtech-backend --lines 100
```

**Docker:**
```bash
docker-compose logs -f backend
docker-compose logs --tail=100 backend
```

**Nginx:**
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

**MySQL:**
```bash
tail -f /var/log/mysql/error.log
```

### Как настроить алерты?

**Простой вариант - email при падении:**
```bash
# Создание скрипта мониторинга
cat > /usr/local/bin/check-lawtech.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "LawTech Backend is DOWN!" | mail -s "ALERT: LawTech Down" admin@your-domain.com
fi
EOF

chmod +x /usr/local/bin/check-lawtech.sh

# Добавление в cron (каждые 5 минут)
(crontab -l; echo "*/5 * * * * /usr/local/bin/check-lawtech.sh") | crontab -
```

---

## Резервное копирование

### Как восстановить из бэкапа?

**Восстановление БД:**
```bash
# Распаковка и восстановление
gunzip < backup_20231120.sql.gz | mysql -u lawtech_user -p lawtech_crm

# Или без распаковки
zcat backup_20231120.sql.gz | mysql -u lawtech_user -p lawtech_crm
```

**Восстановление файлов:**
```bash
tar -xzf backup_files_20231120.tar.gz -C /
```

### Как настроить бэкап на внешнее хранилище?

**S3/Yandex Object Storage:**
```bash
# Установка s3cmd
apt install -y s3cmd

# Настройка
s3cmd --configure

# Скрипт бэкапа
cat > /usr/local/bin/backup-to-s3.sh << 'EOF'
#!/bin/bash
BACKUP_FILE="/tmp/lawtech_$(date +%Y%m%d).sql.gz"
mysqldump -u lawtech_user -p'password' lawtech_crm | gzip > $BACKUP_FILE
s3cmd put $BACKUP_FILE s3://your-bucket/backups/
rm $BACKUP_FILE
EOF

chmod +x /usr/local/bin/backup-to-s3.sh
```

---

## Безопасность

### Как защититься от DDoS?

**Cloudflare (бесплатно):**
1. Зарегистрируйтесь на cloudflare.com
2. Добавьте свой домен
3. Измените NS записи у регистратора
4. Включите "Under Attack Mode" при атаке

**Nginx rate limiting:**
```nginx
# В http блоке
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# В location блоке
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3001;
}
```

### Как скрыть версию Nginx?

```nginx
# В /etc/nginx/nginx.conf
http {
    server_tokens off;
}
```

---

## Обновление

### Как обновить Node.js?

```bash
# Обновление до Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка версии
node --version
npm --version

# Переустановка зависимостей
cd /var/www/lawtech-crm/server
rm -rf node_modules package-lock.json
npm install --production
```

### Как обновить MySQL?

```bash
# Бэкап перед обновлением!
mysqldump --all-databases > all_databases_backup.sql

# Обновление
apt update
apt upgrade mysql-server

# Проверка
mysql --version
```

---

## Дополнительные вопросы?

Если вы не нашли ответ на свой вопрос:
1. Проверьте [DEPLOYMENT.md](DEPLOYMENT.md)
2. Проверьте логи приложения
3. Создайте Issue на GitHub
4. Напишите в поддержку

---

**Последнее обновление**: 20.11.2025
