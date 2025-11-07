# CRM API Документация

## Обзор

Добавлена полная CRM-функциональность с автоматической синхронизацией данных между договорами, клиентами, календарем и статистикой офиса.

## Основные возможности

### 🔄 Автоматическая синхронизация

При создании/обновлении/удалении договора автоматически:
- ✅ Обновляется статистика офиса (выручка, количество заказов)
- ✅ Создается/обновляется событие в календаре
- ✅ Пересчитываются показатели для всех периодов (день, неделя, месяц, год)

### 📊 Динамический расчет

Все данные рассчитываются в реальном времени:
- Выручка офиса
- Количество договоров
- Статистика по клиентам
- События календаря

## API Endpoints

### Договоры (Contracts)

#### GET /api/contracts
Получить все договоры офиса текущего пользователя

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "id_employee": 1,
      "id_client": 1,
      "contract_date": "2025-11-05",
      "amount": 50000.00,
      "status": "active",
      "client_name": "Иван Иванов",
      "client_company": "ООО Компания",
      "employee_name": "Петр Петров"
    }
  ]
}
```

#### GET /api/contracts/:id
Получить договор по ID

#### POST /api/contracts
Создать новый договор

**Тело запроса:**
```json
{
  "id_employee": 1,
  "id_client": 1,
  "contract_date": "2025-11-05",
  "amount": 50000.00,
  "status": "active"
}
```

**Что происходит автоматически:**
1. Создается договор
2. Обновляется статистика офиса (+50000 к выручке, +1 к заказам)
3. Создается событие в календаре на дату договора
4. Обновляются показатели для всех периодов

#### PUT /api/contracts/:id
Обновить договор

**Что происходит автоматически:**
1. Обновляется договор
2. Пересчитывается статистика офиса (разница в сумме)
3. Обновляется событие в календаре

#### DELETE /api/contracts/:id
Удалить договор

**Что происходит автоматически:**
1. Удаляется договор
2. Уменьшается статистика офиса
3. Удаляется событие из календаря

#### GET /api/contracts/stats?period=month
Получить статистику по договорам

**Параметры:**
- `period`: day, week, month, year

**Ответ:**
```json
{
  "success": true,
  "data": {
    "total_contracts": 15,
    "total_revenue": 750000.00,
    "avg_contract_value": 50000.00,
    "unique_clients": 12
  }
}
```

### Клиенты (Clients)

#### GET /api/clients
Получить всех клиентов офиса

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Иван",
      "last_name": "Иванов",
      "company": "ООО Компания",
      "phone": "+7 999 123-45-67",
      "email": "ivan@example.com",
      "address": "Москва, ул. Ленина, 1",
      "contracts_count": 3,
      "total_spent": 150000.00
    }
  ]
}
```

#### GET /api/clients/:id
Получить клиента по ID

#### POST /api/clients
Создать нового клиента

**Тело запроса:**
```json
{
  "first_name": "Иван",
  "last_name": "Иванов",
  "company": "ООО Компания",
  "phone": "+7 999 123-45-67",
  "email": "ivan@example.com",
  "address": "Москва, ул. Ленина, 1"
}
```

#### PUT /api/clients/:id
Обновить клиента

#### DELETE /api/clients/:id
Удалить клиента

**Примечание:** Нельзя удалить клиента с активными договорами

#### GET /api/clients/search?q=Иван
Поиск клиентов

**Параметры:**
- `q`: поисковый запрос (ищет по имени, фамилии, компании, телефону, email)

### Календарь (Calendar)

#### GET /api/office/:officeId/calendar-events
Получить все события календаря офиса

**Ответ включает:**
- Обычные события календаря
- Автоматически созданные события из договоров

```json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "title": "Встреча с клиентом",
      "description": "Обсуждение договора",
      "start_date": "2025-11-05",
      "event_type": "meeting",
      "office_id": 1
    },
    {
      "id": "contract-1",
      "title": "consultation: Иван Иванов",
      "description": "Договор №1, статус: active",
      "start_date": "2025-11-05",
      "event_type": "contract",
      "contract_id": 1
    }
  ]
}
```

#### POST /api/calendar-events
Создать событие календаря

#### PUT /api/calendar-events/:id
Обновить событие

#### DELETE /api/calendar-events/:id
Удалить событие

### Статистика офиса (Office Stats)

#### GET /api/offices/:id/stats?period=month
Получить статистику офиса

**Параметры:**
- `period`: day, week, month, year

**Ответ:**
```json
{
  "revenue": 750000.00,
  "orders": 15,
  "clients": 12,
  "employees": 5,
  "expenses": 50000.00,
  "documents": 45,
  "visits": 120
}
```

## Структура базы данных

### Новые таблицы

#### payments
```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);
```

#### expenses
```sql
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

## Примеры использования

### Создание договора с автоматической синхронизацией

```javascript
// POST /api/contracts
const response = await fetch('/api/contracts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    id_employee: 1,
    id_client: 1,
    contract_date: '2025-11-05',
    amount: 50000.00,
    status: 'active'
  })
});

// Автоматически:
// 1. Создан договор
// 2. Статистика офиса обновлена (+50000 ₽, +1 заказ)
// 3. Событие добавлено в календарь
```

### Получение полной информации о клиенте

```javascript
// GET /api/clients/1
const response = await fetch('/api/clients/1', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Ответ включает:
// - Данные клиента
// - Количество договоров
// - Общую сумму потраченных средств
```

### Просмотр календаря с договорами

```javascript
// GET /api/office/1/calendar-events
const response = await fetch('/api/office/1/calendar-events', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Ответ включает:
// - Обычные события
// - События из договоров (автоматически)
```

## Безопасность

Все endpoints требуют аутентификации через JWT токен:
```
Authorization: Bearer <token>
```

Пользователи имеют доступ только к данным своего офиса.

## Тестирование

Для тестирования API можно использовать:
- Postman
- curl
- Встроенный фронтенд приложения

Пример с curl:
```bash
# Получить все договоры
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/contracts

# Создать договор
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id_employee":1,"id_client":1,"amount":50000,"contract_date":"2025-11-05"}' \
  http://localhost:3001/api/contracts
```
