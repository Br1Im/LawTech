# Тестирование CRM API

## Статус: ✅ Сервер запущен и работает

Backend доступен по адресу: http://localhost:3001

## Быстрый тест через браузер

1. Откройте http://localhost в браузере
2. Войдите в систему с одним из тестовых аккаунтов:
   - Email: `admin@lawtech.ru` / Password: `admin123`
   - Email: `director@pravoved.ru` / Password: `director123`
   - Email: `lawyer1@pravoved.ru` / Password: `lawyer123`

3. После входа откройте консоль разработчика (F12) и выполните:

```javascript
// Получить токен из localStorage
const token = localStorage.getItem('token');

// Тест 1: Получить всех клиентов
fetch('/api/clients', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Клиенты:', data));

// Тест 2: Создать нового клиента
fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'Тест',
    last_name: 'Клиентов',
    company: 'ООО Тест',
    phone: '+7 999 123-45-67',
    email: 'test@example.com',
    address: 'Москва'
  })
})
.then(r => r.json())
.then(data => console.log('Создан клиент:', data));

// Тест 3: Получить все договоры
fetch('/api/contracts', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Договоры:', data));

// Тест 4: Создать договор (замените id_employee и id_client на реальные)
fetch('/api/contracts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id_employee: 1,
    id_client: 1,
    contract_date: '2025-11-05',
    amount: 50000.00,
    status: 'active'
  })
})
.then(r => r.json())
.then(data => console.log('Создан договор:', data));

// Тест 5: Получить статистику по договорам
fetch('/api/contracts/stats?period=month', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Статистика:', data));

// Тест 6: Проверить календарь (замените officeId на реальный)
fetch('/api/office/1/calendar-events', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('События календаря:', data));
```

## Проверка синхронизации

После создания договора проверьте:

1. **Статистика офиса обновилась:**
```javascript
fetch('/api/offices/1/stats?period=day', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Статистика офиса:', data));
```

2. **Событие появилось в календаре:**
```javascript
fetch('/api/office/1/calendar-events', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  const contractEvents = data.events.filter(e => e.event_type === 'contract');
  console.log('События договоров:', contractEvents);
});
```

## Ожидаемые результаты

### ✅ При создании договора на 50,000 ₽:
- Договор сохранен в базе
- Выручка офиса увеличилась на 50,000 ₽
- Количество заказов увеличилось на 1
- В календаре появилось событие на дату договора
- Статистика обновлена для всех периодов

### ✅ API Endpoints работают:
- `GET /api/clients` - список клиентов
- `POST /api/clients` - создание клиента
- `GET /api/contracts` - список договоров
- `POST /api/contracts` - создание договора (с автосинхронизацией!)
- `GET /api/contracts/stats` - статистика
- `GET /api/office/:id/calendar-events` - календарь с договорами

## Следующие шаги

1. **Frontend интеграция:**
   - Создать страницу "Договоры" (ContractsPage.tsx)
   - Создать страницу "Клиенты" (ClientsPage.tsx)
   - Добавить виджеты статистики на Dashboard
   - Обновить календарь для отображения договоров

2. **Дополнительные функции:**
   - Платежи (payments)
   - Расходы (expenses)
   - Отчеты и аналитика

## Документация

- `CRM_API_DOCUMENTATION.md` - полное описание API
- `CRM_SETUP_GUIDE.md` - руководство по настройке и примеры

## Поддержка

Все endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <your_token>
```

Токен получается при входе через `/api/auth/login`
