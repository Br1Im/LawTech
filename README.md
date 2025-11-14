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
