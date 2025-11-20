# 🏛️ LawTech

Интеллектуальная CRM-система для юридических компаний с AI-ассистентом и векторным поиском.

## 🚀 Быстрый старт

```bash
# Клонирование репозитория
git clone https://github.com/Br1Im/LawTech.git
cd LawTech

# Запуск проекта
docker-compose up -d --build
```

Приложение будет доступно по адресу: http://localhost

## 📋 Основные возможности

- 👥 **CRM для клиентов** — управление клиентской базой
- 🏢 **Управление офисами** — мультиофисная структура
- 📊 **Аналитика и отчеты** — статистика по офисам и сотрудникам
- 🤖 **AI-ассистент** — помощник для работы с документами
- 🔍 **Векторный поиск** — семантический поиск по документам
- 📄 **База знаний** — хранение и поиск юридических документов
- 📅 **Календарь** — планирование встреч и задач

## 🏗️ Архитектура

```
LawTech/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # UI компоненты
│   │   ├── shared/        # Общие утилиты и API
│   │   └── App.tsx        # Главный компонент
│   └── Dockerfile
│
├── server/                # Node.js + Express
│   ├── controllers/       # Контроллеры API
│   ├── routes/            # Маршруты
│   ├── middleware/        # Middleware
│   ├── database/          # Миграции БД
│   ├── scripts/           # Python FAISS сервис
│   └── Dockerfile
│
├── scripts/               # Утилиты для разработки
│   ├── dev.sh            # Запуск в dev режиме
│   ├── restart.sh        # Перезапуск контейнеров
│   ├── stop.sh           # Остановка
│
├── deploy.sh             # Скрипт автоматического деплоя
├── DEPLOYMENT.md         # Подробная инструкция по деплою
├── QUICK_START_HOSTING.md # Быстрый старт на хостинге
├── DEPLOYMENT_CHECKLIST.md # Чеклист для деплоя
└── DATABASE.md           # Документация по работе с БД
│   ├── logs.sh           # Просмотр логов
│   └── clean.sh          # Полная очистка
│
└── docker-compose.yml     # Конфигурация Docker
```

## 🛠️ Технологии

**Frontend:**
- React 18 + TypeScript
- Vite
- Ant Design
- Recharts

**Backend:**
- Node.js + Express
- MySQL
- JWT Authentication

**AI Service:**
- Python + FAISS
- Векторный поиск

## 📦 Скрипты для разработки

```bash
# Запуск в режиме разработки
./scripts/dev.sh

# Перезапуск контейнеров
./scripts/restart.sh

# Остановка контейнеров
./scripts/stop.sh

# Просмотр логов
./scripts/logs.sh [service_name]

# Полная очистка (volumes, images)
./scripts/clean.sh
```

## 🔧 Конфигурация

### Переменные окружения

**Backend (.env):**
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your_secret_key
DB_HOST=db
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lawtech
FAISS_SERVICE_URL=http://faiss-service:5000
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001
```

## 📊 API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/login` | Авторизация |
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/profile` | Профиль пользователя |
| GET | `/api/offices` | Список офисов |
| POST | `/api/office` | Создание офиса |
| GET | `/api/clients` | Список клиентов |
| POST | `/api/client` | Создание клиента |
| POST | `/api/chat` | AI-ассистент |
| POST | `/api/upload` | Загрузка документов |

## 🐳 Docker Services

- **frontend** — React приложение (порт 80)
- **backend** — Node.js API (порт 3001)
- **db** — MySQL база данных (порт 3306)
- **faiss-service** — Python FAISS сервис (порт 5000)

## 📝 Лицензия

MIT License

---

Разработано с ❤️ для юридического сообщества


---

## 🚀 Деплой на хостинг

### Быстрый старт (3 команды)

```bash
# 1. Клонирование и настройка
git clone https://github.com/your-username/lawtech-crm.git /var/www/lawtech-crm
cd /var/www/lawtech-crm

# 2. Настройка окружения
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
# Отредактируйте .env файлы с вашими настройками

# 3. Автоматический деплой
chmod +x deploy.sh
./deploy.sh production
```

### Документация по деплою

- 📖 **[QUICK_START_HOSTING.md](QUICK_START_HOSTING.md)** - Быстрый старт на хостинге
- 📚 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Подробная инструкция по деплою
- ✅ **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Чеклист для деплоя

### Требования к серверу

- **ОС**: Ubuntu 20.04+ / Debian 11+
- **RAM**: минимум 2GB (рекомендуется 4GB)
- **CPU**: 2 ядра
- **Диск**: минимум 20GB
- **Node.js**: 18+
- **MySQL**: 8.0+
- **Nginx**: latest

### Варианты деплоя

#### Вариант 1: PM2 (рекомендуется)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

#### Вариант 2: Docker
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Мониторинг

```bash
# PM2
pm2 status
pm2 logs lawtech-backend
pm2 monit

# Docker
docker-compose ps
docker-compose logs -f backend

# Nginx
tail -f /var/log/nginx/error.log
```

### Обновление на продакшене

```bash
cd /var/www/lawtech-crm
./deploy.sh production
```

---

## 🔒 Безопасность

- Все пароли должны быть сгенерированы случайным образом
- JWT_SECRET генерируется через `openssl rand -base64 32`
- Настройте файрвол (UFW) и fail2ban
- Используйте SSL сертификаты (Let's Encrypt)
- Регулярно обновляйте зависимости

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Проверьте логи Nginx
3. Проверьте логи MySQL
4. Обратитесь к документации по деплою

---

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

---

**Разработано с ❤️ для юридических компаний**
