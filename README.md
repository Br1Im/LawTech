# LawTech - Юридическая платформа

Платформа для работы с юридическими документами с использованием ИИ и векторного поиска.

## Архитектура

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI Service**: Python + FAISS для векторного поиска
- **База данных**: MySQL

## Развертывание на Render

### Автоматическое развертывание

1. Форкните этот репозиторий
2. Подключите ваш GitHub аккаунт к Render
3. Создайте новый сервис на Render и выберите этот репозиторий
4. Render автоматически обнаружит `render.yaml` и развернет все сервисы

### Ручное развертывание

#### 1. Backend API
- **Type**: Web Service
- **Environment**: Node
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && npm start`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=3001`

#### 2. Frontend
- **Type**: Static Site
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `./frontend/dist`

#### 3. FAISS Service
- **Type**: Web Service
- **Environment**: Python
- **Build Command**: `cd server/scripts && pip install -r requirements.txt`
- **Start Command**: `cd server/scripts && python faiss_service.py`
- **Environment Variables**:
  - `PYTHONUNBUFFERED=1`
  - `PORT=5000`

## Локальная разработка

### Требования
- Node.js 14+
- Python 3.8+
- MySQL

### Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Br1Im/LawTech.git
cd LawTech
```

2. Установите зависимости для backend:
```bash
cd server
npm install
```

3. Установите зависимости для frontend:
```bash
cd ../frontend
npm install
```

4. Установите Python зависимости:
```bash
cd ../server/scripts
pip install -r requirements.txt
```

### Запуск с Docker

```bash
docker-compose up -d
```

### Запуск без Docker

1. Запустите FAISS сервис:
```bash
cd server/scripts
python faiss_service.py
```

2. Запустите backend:
```bash
cd ../
npm run dev
```

3. Запустите frontend:
```bash
cd ../frontend
npm run dev
```

## Структура проекта

```
├── frontend/          # React приложение
│   ├── src/
│   ├── public/
│   └── package.json
├── server/            # Node.js API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/       # Python сервисы
│   └── package.json
├── render.yaml        # Конфигурация Render
└── docker-compose.yml # Docker конфигурация
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - Авторизация
- `POST /api/chat` - Чат с ИИ
- `POST /api/upload` - Загрузка файлов
- `GET /api/legal-documents` - Получение документов

## Переменные окружения

### Backend
- `NODE_ENV` - Окружение (development/production)
- `PORT` - Порт сервера
- `FAISS_SERVICE_URL` - URL FAISS сервиса
- `DB_HOST` - Хост базы данных
- `DB_USER` - Пользователь БД
- `DB_PASSWORD` - Пароль БД
- `DB_NAME` - Имя базы данных

### FAISS Service
- `PYTHONUNBUFFERED=1`
- `PORT=5000`

## Лицензия

MIT License