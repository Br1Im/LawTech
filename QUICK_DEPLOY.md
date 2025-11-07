# ⚡ Быстрый деплой LawTech

## 🎯 Три способа развертывания

### 1️⃣ Автоматический деплой (Самый простой)

```bash
# На локальной машине
bash deploy.sh
```

Скрипт автоматически:
- Установит все необходимое ПО
- Настроит базу данных
- Развернет все сервисы
- Настроит Nginx

---

### 2️⃣ Docker деплой (Рекомендуется)

```bash
# Подключение к серверу
ssh root@217.26.31.98

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose

# Клонирование и запуск
cd /var/www
git clone <URL_репозитория> lawtech
cd lawtech
docker-compose up -d

# Проверка
docker-compose ps
```

✅ Готово! Открывайте http://217.26.31.98

---

### 3️⃣ Ручная установка

#### Шаг 1: Подключение
```bash
ssh root@217.26.31.98
```

#### Шаг 2: Установка ПО
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Python
apt install -y python3 python3-pip

# MySQL
apt install -y mysql-server
systemctl start mysql

# PM2 и Nginx
npm install -g pm2
apt install -y nginx
```

#### Шаг 3: База данных
```bash
mysql -u root -p
```
```sql
CREATE DATABASE lawtech_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lawtech_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON lawtech_crm.* TO 'lawtech_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Шаг 4: Загрузка проекта
```bash
cd /var/www
git clone <URL_репозитория> lawtech
cd lawtech
```

#### Шаг 5: Backend
```bash
cd server
npm install

# Создать .env файл
nano .env
```
Добавить:
```env
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_USER=lawtech_user
DB_PASSWORD=your_password
DB_NAME=lawtech_crm
JWT_SECRET=your_secret_key
FAISS_SERVICE_URL=http://localhost:5000
```

#### Шаг 6: FAISS сервис
```bash
cd scripts
pip3 install -r requirements.txt
pm2 start faiss_service.py --name lawtech-faiss --interpreter python3
```

#### Шаг 7: Запуск Backend
```bash
cd ..
pm2 start server.js --name lawtech-backend
pm2 save
pm2 startup
```

#### Шаг 8: Frontend
```bash
cd ../frontend
npm install

# Создать .env.production
nano .env.production
```
Добавить:
```env
VITE_API_URL=http://217.26.31.98:3001/api
```

```bash
npm run build
```

#### Шаг 9: Nginx
```bash
nano /etc/nginx/sites-available/lawtech
```
Добавить конфигурацию из DEPLOYMENT_GUIDE.md

```bash
ln -s /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### Шаг 10: Проверка
```bash
pm2 status
curl http://localhost:5000/health
curl http://localhost:3001/api/health
```

---

## 🔍 Проверка работы

После деплоя проверьте:

1. **Статус процессов:**
```bash
pm2 status
```
Должны работать: `lawtech-faiss` и `lawtech-backend`

2. **FAISS сервис:**
```bash
curl http://localhost:5000/health
```

3. **Backend API:**
```bash
curl http://localhost:3001/api/health
```

4. **Frontend:**
Откройте в браузере: http://217.26.31.98

---

## 🛠️ Быстрые команды

```bash
# Просмотр логов
pm2 logs

# Перезапуск всех сервисов
pm2 restart all

# Остановка
pm2 stop all

# Обновление проекта
cd /var/www/lawtech
git pull
cd server && npm install && pm2 restart lawtech-backend
cd ../frontend && npm install && npm run build
```

---

## 🐛 Решение проблем

### FAISS не запускается
```bash
pm2 logs lawtech-faiss
cd /var/www/lawtech/server/scripts
pip3 install -r requirements.txt
pm2 restart lawtech-faiss
```

### Backend не подключается к БД
```bash
# Проверить .env файл
cat /var/www/lawtech/server/.env

# Проверить MySQL
systemctl status mysql
mysql -u lawtech_user -p lawtech_crm -e "SHOW TABLES;"
```

### Frontend показывает ошибки
```bash
# Проверить логи Nginx
tail -f /var/log/nginx/lawtech_error.log

# Проверить сборку
cd /var/www/lawtech/frontend
npm run build
```

---

## 📞 Поддержка

Полная документация: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Архитектура проекта:
- **Frontend**: React + TypeScript (порт 80 через Nginx)
- **Backend**: Node.js + Express (порт 3001)
- **FAISS**: Python + Flask (порт 5000)
- **Database**: MySQL (порт 3306)

---

**Удачи с деплоем! 🚀**
