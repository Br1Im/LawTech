# 🎮 Шпаргалка команд для управления LawTech

## 🚀 Быстрый доступ

```bash
# Подключение к серверу
ssh root@217.26.31.98
```

---

## 🐳 Docker команды

### Основные операции
```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка всех сервисов
docker-compose down

# Перезапуск всех сервисов
docker-compose restart

# Перезапуск конкретного сервиса
docker-compose restart backend
docker-compose restart frontend
docker-compose restart faiss-service
docker-compose restart db
```

### Просмотр логов
```bash
# Все логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f faiss-service
docker-compose logs -f db

# Последние 100 строк
docker-compose logs --tail=100 backend
```

### Статус и мониторинг
```bash
# Статус всех контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Информация о контейнере
docker inspect lawtech-backend
```

### Обновление
```bash
# Обновить код и пересобрать
cd /var/www/lawtech
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Очистка
```bash
# Удалить остановленные контейнеры
docker-compose down

# Удалить с volumes (ОСТОРОЖНО! Удалит БД)
docker-compose down -v

# Очистить неиспользуемые образы
docker system prune -a
```

---

## 🔧 PM2 команды (для ручной установки)

### Основные операции
```bash
# Список всех процессов
pm2 list
pm2 status

# Запуск сервисов
pm2 start server.js --name lawtech-backend
pm2 start faiss_service.py --name lawtech-faiss --interpreter python3

# Остановка
pm2 stop lawtech-backend
pm2 stop lawtech-faiss
pm2 stop all

# Перезапуск
pm2 restart lawtech-backend
pm2 restart lawtech-faiss
pm2 restart all

# Удаление процесса
pm2 delete lawtech-backend
pm2 delete lawtech-faiss
pm2 delete all
```

### Просмотр логов
```bash
# Все логи в реальном времени
pm2 logs

# Логи конкретного процесса
pm2 logs lawtech-backend
pm2 logs lawtech-faiss

# Последние 100 строк
pm2 logs lawtech-backend --lines 100

# Очистить логи
pm2 flush
```

### Мониторинг
```bash
# Интерактивный мониторинг
pm2 monit

# Информация о процессе
pm2 show lawtech-backend
pm2 show lawtech-faiss

# Использование памяти
pm2 list
```

### Сохранение и автозапуск
```bash
# Сохранить текущие процессы
pm2 save

# Настроить автозапуск
pm2 startup

# Удалить автозапуск
pm2 unstartup
```

---

## 🗄️ MySQL команды

### Подключение
```bash
# Подключение к БД
mysql -u lawtech_user -p lawtech_crm

# Подключение как root
mysql -u root -p
```

### Основные операции
```sql
-- Показать все базы данных
SHOW DATABASES;

-- Выбрать базу данных
USE lawtech_crm;

-- Показать все таблицы
SHOW TABLES;

-- Показать структуру таблицы
DESCRIBE users;
DESCRIBE clients;
DESCRIBE contracts;

-- Показать количество записей
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM clients;

-- Показать последние записи
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

### Резервное копирование
```bash
# Создать бэкап
mysqldump -u lawtech_user -p lawtech_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Создать бэкап с сжатием
mysqldump -u lawtech_user -p lawtech_crm | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Восстановить из бэкапа
mysql -u lawtech_user -p lawtech_crm < backup_20241107.sql

# Восстановить из сжатого бэкапа
gunzip < backup_20241107.sql.gz | mysql -u lawtech_user -p lawtech_crm
```

### Управление пользователями
```sql
-- Показать пользователей
SELECT User, Host FROM mysql.user;

-- Показать права пользователя
SHOW GRANTS FOR 'lawtech_user'@'localhost';

-- Создать нового пользователя
CREATE USER 'newuser'@'localhost' IDENTIFIED BY 'password';

-- Дать права
GRANT ALL PRIVILEGES ON lawtech_crm.* TO 'newuser'@'localhost';
FLUSH PRIVILEGES;
```

---

## 🌐 Nginx команды

### Основные операции
```bash
# Проверить конфигурацию
nginx -t

# Перезагрузить конфигурацию
systemctl reload nginx

# Перезапустить Nginx
systemctl restart nginx

# Остановить Nginx
systemctl stop nginx

# Запустить Nginx
systemctl start nginx

# Статус Nginx
systemctl status nginx
```

### Просмотр логов
```bash
# Логи доступа
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/lawtech_access.log

# Логи ошибок
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/lawtech_error.log

# Последние 100 строк
tail -n 100 /var/log/nginx/lawtech_error.log
```

### Управление конфигурацией
```bash
# Редактировать конфигурацию
nano /etc/nginx/sites-available/lawtech

# Включить сайт
ln -s /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/

# Отключить сайт
rm /etc/nginx/sites-enabled/lawtech

# Проверить и перезагрузить
nginx -t && systemctl reload nginx
```

---

## 📦 NPM команды

### Backend
```bash
cd /var/www/lawtech/server

# Установить зависимости
npm install

# Установить только production зависимости
npm install --production

# Обновить зависимости
npm update

# Проверить устаревшие пакеты
npm outdated

# Запустить в dev режиме
npm run dev

# Запустить в production
npm start
```

### Frontend
```bash
cd /var/www/lawtech/frontend

# Установить зависимости
npm install

# Запустить dev сервер
npm run dev

# Собрать для production
npm run build

# Предпросмотр сборки
npm run preview

# Проверить код
npm run lint
```

---

## 🐍 Python команды

### FAISS сервис
```bash
cd /var/www/lawtech/server/scripts

# Установить зависимости
pip3 install -r requirements.txt

# Обновить зависимости
pip3 install --upgrade -r requirements.txt

# Запустить сервис
python3 faiss_service.py

# Проверить установленные пакеты
pip3 list

# Показать информацию о пакете
pip3 show faiss-cpu
```

---

## 🔥 Firewall команды

### UFW (Ubuntu Firewall)
```bash
# Статус
ufw status

# Включить
ufw enable

# Отключить
ufw disable

# Разрешить порт
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

# Запретить порт
ufw deny 8080/tcp

# Удалить правило
ufw delete allow 80/tcp

# Сбросить все правила
ufw reset
```

---

## 🔍 Диагностика

### Проверка портов
```bash
# Показать все открытые порты
netstat -tulpn

# Проверить конкретный порт
netstat -tulpn | grep :3001
netstat -tulpn | grep :5000

# Альтернатива (если netstat не установлен)
ss -tulpn | grep :3001
```

### Проверка процессов
```bash
# Все процессы Node.js
ps aux | grep node

# Все процессы Python
ps aux | grep python

# Использование памяти
free -h

# Использование диска
df -h

# Использование CPU
top
htop  # если установлен
```

### Проверка сервисов
```bash
# Проверить FAISS
curl http://localhost:5000/health

# Проверить Backend
curl http://localhost:3001/api/health
curl http://localhost:3001/api/status

# Проверить Frontend
curl http://localhost

# Проверить с внешнего адреса
curl http://217.26.31.98
```

### Проверка логов системы
```bash
# Системные логи
journalctl -xe

# Логи конкретного сервиса
journalctl -u nginx
journalctl -u mysql

# Последние 100 строк
journalctl -n 100

# Логи за последний час
journalctl --since "1 hour ago"
```

---

## 🔄 Обновление проекта

### Полное обновление (Docker)
```bash
cd /var/www/lawtech
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f
```

### Полное обновление (PM2)
```bash
cd /var/www/lawtech
git pull

# Backend
cd server
npm install
pm2 restart lawtech-backend

# FAISS
cd scripts
pip3 install -r requirements.txt
pm2 restart lawtech-faiss

# Frontend
cd ../../frontend
npm install
npm run build

# Проверка
pm2 status
```

### Быстрое обновление (только код)
```bash
cd /var/www/lawtech
git pull
pm2 restart all
```

---

## 🛡️ Безопасность

### Обновление системы
```bash
# Обновить список пакетов
apt update

# Обновить все пакеты
apt upgrade -y

# Обновить систему полностью
apt dist-upgrade -y

# Очистить старые пакеты
apt autoremove -y
apt autoclean
```

### Проверка безопасности
```bash
# Показать неудачные попытки входа
grep "Failed password" /var/log/auth.log

# Показать успешные входы
grep "Accepted password" /var/log/auth.log

# Проверить открытые порты
nmap localhost
```

---

## 📊 Мониторинг

### Быстрая проверка всего
```bash
# Статус всех сервисов
systemctl status nginx mysql
pm2 status

# Использование ресурсов
df -h
free -h
uptime

# Проверка API
curl http://localhost:3001/api/health
curl http://localhost:5000/health
```

### Автоматическая проверка (cron)
```bash
# Редактировать cron
crontab -e

# Добавить проверку каждые 5 минут
*/5 * * * * curl -f http://localhost:3001/api/health || pm2 restart lawtech-backend
```

---

## 🆘 Экстренное восстановление

### Если всё упало
```bash
# 1. Проверить статус
pm2 status
systemctl status nginx mysql

# 2. Перезапустить всё
pm2 restart all
systemctl restart nginx mysql

# 3. Проверить логи
pm2 logs --lines 50
tail -n 50 /var/log/nginx/error.log

# 4. Если не помогло - перезагрузить сервер
reboot
```

### Если база данных не работает
```bash
# Проверить статус
systemctl status mysql

# Перезапустить
systemctl restart mysql

# Проверить логи
tail -f /var/log/mysql/error.log

# Восстановить из бэкапа (если нужно)
mysql -u lawtech_user -p lawtech_crm < backup_latest.sql
```

---

## 📝 Полезные алиасы

Добавьте в `~/.bashrc` для быстрого доступа:

```bash
# Алиасы для LawTech
alias lt-status='pm2 status && systemctl status nginx mysql'
alias lt-logs='pm2 logs'
alias lt-restart='pm2 restart all && systemctl restart nginx'
alias lt-update='cd /var/www/lawtech && git pull && pm2 restart all'
alias lt-backup='mysqldump -u lawtech_user -p lawtech_crm > ~/backup_$(date +%Y%m%d).sql'
```

После добавления:
```bash
source ~/.bashrc
```

---

**Сохраните эту шпаргалку для быстрого доступа к командам! 📋**
