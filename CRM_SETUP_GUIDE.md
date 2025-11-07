# Руководство по настройке CRM-системы

## ✅ Что уже сделано

### Backend (Сервер)

1. **Модели данных:**
   - ✅ `Contract` - управление договорами
   - ✅ `Client` - управление клиентами
   - ✅ Автоматическая синхронизация с календарем
   - ✅ Автоматическое обновление статистики офиса

2. **API Endpoints:**
   - ✅ `/api/contracts` - CRUD операции с договорами
   - ✅ `/api/clients` - CRUD операции с клиентами
   - ✅ `/api/contracts/stats` - статистика по договорам
   - ✅ `/api/clients/search` - поиск клиентов

3. **База данных:**
   - ✅ Таблица `payments` для платежей
   - ✅ Таблица `expenses` для расходов
   - ✅ Индексы для оптимизации запросов

4. **Автоматическая синхронизация:**
   - ✅ При создании договора → обновляется статистика + создается событие в календаре
   - ✅ При обновлении договора → пересчитывается статистика + обновляется календарь
   - ✅ При удалении договора → уменьшается статистика + удаляется из календаря

## 🚀 Как использовать

### 1. Создание клиента

```bash
POST /api/clients
{
  "first_name": "Иван",
  "last_name": "Иванов",
  "company": "ООО Компания",
  "phone": "+7 999 123-45-67",
  "email": "ivan@example.com",
  "address": "Москва, ул. Ленина, 1"
}
```

### 2. Создание договора

```bash
POST /api/contracts
{
  "id_employee": 1,      # ID сотрудника
  "id_client": 1,        # ID клиента
  "contract_date": "2025-11-05",
  "amount": 50000.00,
  "status": "active"
}
```

**Что происходит автоматически:**
- ✅ Выручка офиса увеличивается на 50,000 ₽
- ✅ Количество заказов увеличивается на 1
- ✅ В календаре появляется событие на дату договора
- ✅ Обновляется статистика для всех периодов (день, неделя, месяц, год)

### 3. Просмотр статистики

```bash
GET /api/contracts/stats?period=month
```

Ответ:
```json
{
  "total_contracts": 15,
  "total_revenue": 750000.00,
  "avg_contract_value": 50000.00,
  "unique_clients": 12
}
```

### 4. Просмотр календаря

```bash
GET /api/office/1/calendar-events
```

Календарь автоматически включает:
- Обычные события
- События из договоров

## 📊 Что нужно добавить на Frontend

### 1. Страница "Договоры"

Создайте компонент для отображения списка договоров:

```typescript
// frontend/src/pages/ContractsPage.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select } from 'antd';

export const ContractsPage = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    const response = await fetch('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setContracts(data.data);
    setLoading(false);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Клиент', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Сотрудник', dataIndex: 'employee_name', key: 'employee_name' },
    { title: 'Дата', dataIndex: 'contract_date', key: 'contract_date' },
    { title: 'Сумма', dataIndex: 'amount', key: 'amount', render: (amount) => `${amount} ₽` },
    { title: 'Статус', dataIndex: 'status', key: 'status' },
  ];

  return (
    <div>
      <h1>Договоры</h1>
      <Button type="primary" onClick={() => {/* открыть модальное окно создания */}}>
        Создать договор
      </Button>
      <Table 
        dataSource={contracts} 
        columns={columns} 
        loading={loading}
        rowKey="id"
      />
    </div>
  );
};
```

### 2. Страница "Клиенты"

```typescript
// frontend/src/pages/ClientsPage.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Input } from 'antd';

export const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const response = await fetch('/api/clients', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setClients(data.data);
    setLoading(false);
  };

  const columns = [
    { title: 'Имя', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Фамилия', dataIndex: 'last_name', key: 'last_name' },
    { title: 'Компания', dataIndex: 'company', key: 'company' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Договоров', dataIndex: 'contracts_count', key: 'contracts_count' },
    { title: 'Потрачено', dataIndex: 'total_spent', key: 'total_spent', render: (amount) => `${amount} ₽` },
  ];

  return (
    <div>
      <h1>Клиенты</h1>
      <Button type="primary" onClick={() => {/* открыть модальное окно создания */}}>
        Добавить клиента
      </Button>
      <Table 
        dataSource={clients} 
        columns={columns} 
        loading={loading}
        rowKey="id"
      />
    </div>
  );
};
```

### 3. Обновление Dashboard

Добавьте виджеты статистики на главную страницу:

```typescript
// frontend/src/components/ContractStats.tsx
import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col } from 'antd';

export const ContractStats = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const response = await fetch('/api/contracts/stats?period=month', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setStats(data.data);
  };

  if (!stats) return null;

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="Договоров" value={stats.total_contracts} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Выручка" value={stats.total_revenue} suffix="₽" />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Средний чек" value={stats.avg_contract_value} suffix="₽" />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Клиентов" value={stats.unique_clients} />
        </Card>
      </Col>
    </Row>
  );
};
```

### 4. Обновление календаря

Календарь уже автоматически показывает договоры! Просто убедитесь, что используете endpoint:
```
GET /api/office/:officeId/calendar-events
```

## 🔧 Дополнительные возможности

### Платежи (Payments)

Таблица уже создана, нужно добавить:
1. Модель `Payment` в `server/models/payment.js`
2. Контроллер `PaymentController`
3. Маршруты `/api/payments`
4. Frontend компоненты

### Расходы (Expenses)

Таблица уже создана, нужно добавить:
1. Модель `Expense` в `server/models/expense.js`
2. Контроллер `ExpenseController`
3. Маршруты `/api/expenses`
4. Frontend компоненты

## 📝 Примеры запросов

### Создать договор и увидеть синхронизацию

```bash
# 1. Создаем договор
curl -X POST http://localhost:3001/api/contracts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_employee": 1,
    "id_client": 1,
    "contract_date": "2025-11-05",
    "amount": 50000,
    "status": "active"
  }'

# 2. Проверяем статистику офиса
curl http://localhost:3001/api/offices/1/stats?period=day \
  -H "Authorization: Bearer YOUR_TOKEN"
# Выручка увеличилась на 50,000 ₽

# 3. Проверяем календарь
curl http://localhost:3001/api/office/1/calendar-events \
  -H "Authorization: Bearer YOUR_TOKEN"
# Появилось новое событие на дату договора
```

## 🎯 Итог

Вы получили полноценную CRM-систему с:
- ✅ Автоматической синхронизацией данных
- ✅ Динамическим расчетом статистики
- ✅ Интеграцией с календарем
- ✅ REST API для всех операций
- ✅ Безопасностью на уровне офисов

Все работает в реальном времени - создаете договор, и сразу видите изменения в статистике и календаре!
