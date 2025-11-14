# API Документация

## Базовый URL

```
http://localhost:3001/api
```

## Аутентификация

Все защищенные эндпоинты требуют JWT токен в заголовке:

```
Authorization: Bearer <token>
```

## Стандартный формат ответов

### Успешный ответ

```json
{
  "success": true,
  "message": "Успешно",
  "data": { ... }
}
```

### Ответ с ошибкой

```json
{
  "success": false,
  "message": "Описание ошибки",
  "errors": [ ... ] // опционально
}
```

## Эндпоинты

### Аутентификация

#### POST /api/auth/register
Регистрация нового пользователя

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "surname": "Иванов",
  "name": "Иван",
  "middle_name": "Иванович"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Пользователь успешно зарегистрирован",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "surname": "Иванов",
      "name": "Иван"
    }
  }
}
```

#### POST /api/auth/login
Вход в систему

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Успешный вход",
  "data": {
    "token": "jwt_token_here",
    "user": { ... }
  }
}
```

### Офисы

#### GET /api/offices
Получить список офисов (требует авторизации)

**Query параметры:**
- `period` - период для статистики (day, 2weeks, month)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Офис 1",
      "address": "ул. Примерная, 1",
      "employee_count": 5,
      "stats": {
        "visits": 100,
        "orders": 50,
        "revenue": 500000
      }
    }
  ]
}
```

#### POST /api/office
Создать новый офис (требует авторизации)

**Body:**
```json
{
  "officeName": "Новый офис",
  "officeAddress": "ул. Примерная, 1",
  "contactPhone": "+7 (999) 123-45-67",
  "inn": "1234567890",
  "ogrn": "1234567890123",
  "ipSurname": "Иванов",
  "ipName": "Иван",
  "ipMiddleName": "Иванович"
}
```

#### PUT /api/office
Обновить офис (требует авторизации)

**Body:**
```json
{
  "id": "1",
  "officeName": "Обновленное название",
  "officeAddress": "Новый адрес"
}
```

### Клиенты

#### GET /api/clients
Получить список клиентов (требует авторизации)

**Query параметры:**
- `office_id` - ID офиса (обязательно)
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество на странице (по умолчанию 20)
- `search` - поиск по ФИО или телефону

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### POST /api/client
Создать клиента (требует авторизации)

**Body:**
```json
{
  "surname": "Петров",
  "name": "Петр",
  "middle_name": "Петрович",
  "phone": "+7 (999) 123-45-67",
  "email": "petrov@example.com",
  "office_id": "1"
}
```

#### PUT /api/client/:id
Обновить клиента (требует авторизации)

#### DELETE /api/client/:id
Удалить клиента (требует авторизации)

### AI Ассистент

#### POST /api/chat
Отправить сообщение AI ассистенту (требует авторизации)

**Body:**
```json
{
  "message": "Как составить договор?",
  "context": "legal_documents"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Ответ от AI...",
    "sources": [ ... ]
  }
}
```

### Документы

#### POST /api/upload
Загрузить документ (требует авторизации)

**Form Data:**
- `file` - файл документа
- `type` - тип документа
- `description` - описание

#### GET /api/legal-documents
Получить список документов (требует авторизации)

#### GET /api/legal-documents/:id
Получить документ по ID (требует авторизации)

## Коды ошибок

- `200` - Успешно
- `201` - Создано
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера

## Примеры использования

### JavaScript (Fetch)

```javascript
// Вход
const login = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  return data;
};

// Получение офисов
const getOffices = async (token) => {
  const response = await fetch('http://localhost:3001/api/offices', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data;
};
```

### cURL

```bash
# Вход
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Получение офисов
curl -X GET http://localhost:3001/api/offices \
  -H "Authorization: Bearer <token>"
```
