# Архитектура проекта LawTech

## Общая структура

LawTech построен на микросервисной архитектуре с использованием Docker для оркестрации сервисов.

## Компоненты системы

### 1. Frontend (React + TypeScript)

**Технологии:**
- React 18
- TypeScript
- Vite (сборщик)
- Ant Design (UI библиотека)
- Recharts (графики)

**Структура:**
```
frontend/src/
├── components/        # UI компоненты
│   ├── Office.tsx    # Управление офисами
│   ├── Clients.tsx   # CRM клиентов
│   ├── Calendar.tsx  # Календарь
│   └── Chat.tsx      # AI-ассистент
├── shared/           # Общие модули
│   ├── api/         # API клиенты
│   ├── utils/       # Утилиты
│   └── contexts/    # React контексты
└── App.tsx          # Главный компонент
```

### 2. Backend (Node.js + Express)

**Технологии:**
- Node.js 18
- Express
- MySQL
- JWT для аутентификации

**Структура:**
```
server/
├── controllers/      # Бизнес-логика
├── routes/          # API маршруты
├── middleware/      # Middleware (auth, validation)
├── database/        # Миграции и схемы
├── services/        # Сервисы (email, storage)
└── utils/           # Утилиты
```

**Основные модули:**
- `auth` — аутентификация и авторизация
- `office` — управление офисами
- `client` — CRM клиентов
- `employee` — управление сотрудниками
- `calendar` — календарь и события
- `chat` — интеграция с AI

### 3. Database (MySQL)

**Основные таблицы:**
- `users` — пользователи системы
- `offices` — офисы компании
- `clients` — клиенты
- `employees` — сотрудники
- `calendar_events` — события календаря
- `legal_documents` — юридические документы
- `chat_history` — история чата с AI

### 4. AI Service (Python + FAISS)

**Технологии:**
- Python 3.8
- FAISS (векторный поиск)
- Flask (API)

**Функции:**
- Векторизация документов
- Семантический поиск
- Ответы на вопросы по документам

## Потоки данных

### Аутентификация
```
Client → POST /api/auth/login → Backend → JWT Token → Client
```

### Работа с офисами
```
Client → GET /api/offices → Backend → MySQL → Response
Client → POST /api/office → Backend → MySQL → Response
```

### AI-ассистент
```
Client → POST /api/chat → Backend → FAISS Service → Response
```

## Безопасность

1. **JWT токены** для аутентификации
2. **Middleware** для проверки прав доступа
3. **Валидация** входных данных
4. **CORS** настройки
5. **Rate limiting** для API

## Масштабирование

- Горизонтальное масштабирование через Docker Swarm/Kubernetes
- Кэширование через Redis (планируется)
- CDN для статических файлов
- Балансировка нагрузки через Nginx

## Мониторинг

- Логирование через Winston
- Метрики через Prometheus (планируется)
- Трейсинг через Jaeger (планируется)
