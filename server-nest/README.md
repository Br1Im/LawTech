# LawTech NestJS Backend

Это бэкенд-сервер для приложения LawTech, разработанный с использованием NestJS.

## Требования

- Node.js (версия 18 или выше)
- MySQL (версия 8.0 или выше)

## Установка

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd server-nest
```

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` в корне проекта и настройте переменные окружения:

```
# Настройки сервера
PORT=3001
NODE_ENV=development

# Настройки JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Настройки базы данных
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=lawtech
```

## Запуск приложения

### Режим разработки

```bash
npm run start:dev
```

### Режим отладки

```bash
npm run start:debug
```

### Режим продакшн

```bash
npm run build
npm run start:prod
```

## Docker

Для запуска приложения в Docker:

```bash
docker build -t lawtech-nest .
docker run -p 3001:3001 lawtech-nest
```

Или с использованием Docker Compose:

```bash
docker-compose up -d
```

## API Endpoints

### Аутентификация

- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/register` - Регистрация нового пользователя
- `GET /api/auth/me` - Получение информации о текущем пользователе

### Пользователи

- `GET /api/users` - Получение списка всех пользователей
- `GET /api/users/:id` - Получение информации о пользователе по ID
- `PATCH /api/users/:id` - Обновление информации о пользователе
- `DELETE /api/users/:id` - Удаление пользователя

### Офисы

- `GET /api/offices` - Получение списка всех офисов
- `GET /api/offices/:id` - Получение информации об офисе по ID
- `POST /api/offices` - Создание нового офиса
- `PATCH /api/offices/:id` - Обновление информации об офисе
- `DELETE /api/offices/:id` - Удаление офиса
- `GET /api/offices/:id/employees` - Получение списка сотрудников офиса

### Юридические запросы

- `POST /api/legal/chat` - Отправка запроса в юридический чат
- `GET /api/legal/documents` - Получение списка юридических документов
- `GET /api/legal/documents/:id` - Получение информации о документе по ID
- `POST /api/legal/documents` - Создание нового юридического документа
- `PATCH /api/legal/documents/:id` - Обновление юридического документа
- `DELETE /api/legal/documents/:id` - Удаление юридического документа

### Файлы

- `POST /api/files/upload` - Загрузка файла

### Чат

- `GET /api/chat/office/:officeId` - Получение сообщений для офиса
- `POST /api/chat/message` - Отправка нового сообщения
- `PATCH /api/chat/message/:id/read` - Отметка сообщения как прочитанного