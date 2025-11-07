# 🚀 Полное руководство по развертыванию LawTech

## 📚 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Способы развертывания](#способы-развертывания)
3. [Архитектура](#архитектура)
4. [Требования](#требования)
5. [Подготовка](#подготовка)
6. [Развертывание](#развертывание)
7. [Проверка](#проверка)
8. [Обслуживание](#обслуживание)

---

## 🎯 Быстрый старт

### Проверка готовности
```bash
bash check-deploy-ready.sh
```

### Выбор способа деплоя

| Способ | Сложность | Время | Рекомендация |
|--------|-----------|-------|--------------|
| 🐳 Docker | ⭐ Легко | 10 мин | ✅ Рекомендуется |
| 🤖 Автоматический скрипт | ⭐⭐ Средне | 15 мин | ✅ Хорошо |
| 🔧 Ручная установка | ⭐⭐⭐ Сложно | 30 мин | Для опытных |

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 80)                      │
│                  Reverse Proxy + Static                 │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────────┬──────────────────────────┐
             │                 │                          │
    ┌────────▼────────┐ ┌─────▼──────┐        ┌─────────▼────────┐
    │   Frontend      │ │  Backend   │        │  FAISS Service   │
    │  React + TS     │ │  Node.js   │◄───────┤  Python + AI     │
    │  (Static)       │ │  (Port     │        │  (Port 5000)     │
    └─────────────────┘ │   3001)    │        └──────────────────┘
                        └──────┬─────┘
                               │
                        ┌──────▼──────┐
                        │   MySQL     │
                        │  Database   │
                        │ (Port 3306) │
                        └─────────────┘
```

### Компоненты:

1. **Frontend** - React + TypeScript + Vite
   - Статические файлы отдаются через Nginx
   - Адаптивный дизайн
   - Роутинг на клиенте

2. **Backend** - Node.js + Express
   - REST API
   - JWT аутентификация
   - Работа с файлами
   - Интеграция с FAISS

3. **FAISS Service** - Python + Flask
   - Векторный поиск
   - AI обработка документов
   - Семантический анализ

4. **Database** - MySQL 8.0
   - Хранение данных
   - Транзакции
   - Индексы для быстрого поиска

---

## 📋 Требования

### Минимальные требования сервера:
- **CPU**: 2 ядра
- **RAM**: 4 GB
- **Диск**: 20 GB свободного места
- **ОС**: Ubuntu 20.04+ / Debian 10+

### Необходимое ПО:

#### Для Docker деплоя:
- Docker 20.10+
- Docker Compose 1.29+

#### Для ручной установки:
- Node.js 18+
- Python 3.8+
- MySQL 8.0+
- PM2
- Nginx

---

## 🔧 Подготовка

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/lawtech.git
cd lawtech
```

### 2. Проверка готовности

```bash
bash check-deploy-ready.sh
```

### 3. Настройка переменных окружения

#### Backend (.env в папке server/)
```bash
cp .env.production.example server/.env
nano server/.env
```

Измените:
- `DB_PASSWORD` - пароль базы данных
- `JWT_SECRET` - секретный ключ JWT (используйте `openssl rand -base64 32`)
- `CORS_ORIGIN` - адрес вашего сервера

#### Frontend (.env.production в папке frontend/)
```bash
nano frontend/.env.production
```

Добавьте:
```env
VITE_API_URL=http://217.26.31.98:3001/api
```

---

## 🚀 Развертывание

### Способ 1: Docker (Рекомендуется)

#### Преимущества:
- ✅ Быстрое развертывание
- ✅ Изолированная среда
- ✅ Легкое обновление
- ✅ Одинаковая работа везде

#### Шаги:

1. **Подключение к серверу**
```bash
ssh root@217.26.31.98
```

2. **Установка Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose
```

3. **Клонирование проекта**
```bash
cd /var/www
git clone <URL_репозитория> lawtech
cd lawtech
```

4. **Настройка переменных окружения**
```bash
# Отредактируйте docker-compose.yml
nano docker-compose.yml
# Измените пароли в секции environment
```

5. **Запуск**
```bash
docker-compose up -d
```

6. **Проверка**
```bash
docker-compose ps
docker-compose logs -f
```

✅ **Готово!** Откройте http://217.26.31.98

---

### Способ 2: Автоматический скрипт

#### Преимущества:
- ✅ Автоматическая установка всего ПО
- ✅ Настройка всех компонентов
- ✅ Проверка работоспособности

#### Шаги:

1. **На локальной машине**
```bash
# Убедитесь, что у вас настроен SSH доступ
bash deploy.sh
```

Скрипт автоматически:
- Установит все необходимое ПО
- Настроит базу данных
- Развернет все сервисы
- Настроит Nginx
- Запустит приложение

2. **Проверка**
```bash
ssh root@217.26.31.98 "pm2 status"
```

✅ **Готово!** Откройте http://217.26.31.98

---

### Способ 3: Ручная установка

Подробная инструкция: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Краткая версия: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

---

## ✅ Проверка работы

### 1. Проверка процессов (для ручной установки)
```bash
pm2 status
```

Должны работать:
- `lawtech-faiss` (Python)
- `lawtech-backend` (Node.js)

### 2. Проверка сервисов

```bash
# FAISS Service
curl http://localhost:5000/health

# Backend API
curl http://localhost:3001/api/health

# Frontend
curl http://localhost
```

### 3. Проверка в браузере

Откройте: http://217.26.31.98

Должна открыться главная страница LawTech.

### 4. Тестовые аккаунты

После деплоя доступны тестовые аккаунты:

| Email | Пароль | Роль |
|-------|--------|------|
| admin@lawtech.com | admin123 | Администратор |
| lawyer@lawtech.com | lawyer123 | Юрист |

---

## 🛠️ Обслуживание

### Просмотр логов

#### Docker:
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f faiss-service
```

#### PM2:
```bash
pm2 logs
pm2 logs lawtech-backend
pm2 logs lawtech-faiss
```

### Перезапуск сервисов

#### Docker:
```bash
docker-compose restart
docker-compose restart backend
```

#### PM2:
```bash
pm2 restart all
pm2 restart lawtech-backend
pm2 restart lawtech-faiss
```

### Обновление проекта

#### Docker:
```bash
cd /var/www/lawtech
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

#### PM2:
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
```

### Резервное копирование

#### База данных:
```bash
# Создание бэкапа
docker-compose exec db mysqldump -u root -p lawtech_crm > backup_$(date +%Y%m%d).sql

# Или для ручной установки:
mysqldump -u lawtech_user -p lawtech_crm > backup_$(date +%Y%m%d).sql
```

#### Загруженные файлы:
```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz server/uploads/
```

### Мониторинг

#### Использование ресурсов:
```bash
# Docker
docker stats

# PM2
pm2 monit
```

#### Проверка здоровья:
```bash
# Создайте cron задачу для проверки
crontab -e
```

Добавьте:
```cron
*/5 * * * * curl -f http://localhost:3001/api/health || systemctl restart lawtech-backend
```

---

## 🐛 Решение проблем

### Проблема: FAISS сервис не запускается

**Решение:**
```bash
# Docker
docker-compose logs faiss-service

# PM2
pm2 logs lawtech-faiss
cd /var/www/lawtech/server/scripts
pip3 install -r requirements.txt
pm2 restart lawtech-faiss
```

### Проблема: Backend не подключается к БД

**Решение:**
```bash
# Проверить статус MySQL
systemctl status mysql

# Проверить подключение
mysql -u lawtech_user -p lawtech_crm -e "SHOW TABLES;"

# Проверить .env файл
cat /var/www/lawtech/server/.env
```

### Проблема: Frontend показывает ошибки API

**Решение:**
```bash
# Проверить логи Nginx
tail -f /var/log/nginx/lawtech_error.log

# Проверить CORS настройки в backend
cat /var/www/lawtech/server/.env | grep CORS

# Пересобрать frontend
cd /var/www/lawtech/frontend
npm run build
```

### Проблема: Порты заняты

**Решение:**
```bash
# Проверить занятые порты
netstat -tulpn | grep -E ':(80|3001|5000|3306)'

# Остановить конфликтующие процессы
systemctl stop apache2  # Если установлен Apache
```

---

## 🔒 Безопасность

### Обязательные шаги:

1. **Смените все пароли**
   - MySQL root пароль
   - MySQL пользователь lawtech_user
   - JWT_SECRET

2. **Настройте Firewall**
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

3. **Установите SSL сертификат**
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

4. **Регулярные обновления**
```bash
apt update && apt upgrade -y
```

5. **Резервное копирование**
   - Настройте автоматические бэкапы БД
   - Храните бэкапы в безопасном месте

---

## 📞 Поддержка

### Документация:
- [README.md](./README.md) - Общая информация
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Детальное руководство
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Быстрый деплой
- [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) - Docker инструкции

### Полезные ссылки:
- Docker: https://docs.docker.com/
- PM2: https://pm2.keymetrics.io/
- Nginx: https://nginx.org/ru/docs/

---

## 📊 Чеклист деплоя

- [ ] Сервер подготовлен (ОС обновлена)
- [ ] Необходимое ПО установлено
- [ ] Проект клонирован на сервер
- [ ] Переменные окружения настроены
- [ ] Пароли изменены
- [ ] База данных создана
- [ ] Миграции применены
- [ ] FAISS сервис запущен
- [ ] Backend запущен
- [ ] Frontend собран
- [ ] Nginx настроен
- [ ] Firewall настроен
- [ ] SSL установлен (опционально)
- [ ] Тестовые аккаунты работают
- [ ] Все проверки пройдены
- [ ] Резервное копирование настроено

---

**Удачи с развертыванием! 🚀**

Если возникли вопросы, проверьте раздел "Решение проблем" или обратитесь к детальной документации.
