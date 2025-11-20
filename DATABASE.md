# 🗄️ Работа с базой данных LawTech CRM

## Структура базы данных

### Основные таблицы

1. **offices** - Офисы
2. **users** - Пользователи системы
3. **clients** - Клиенты
4. **employees** - Сотрудники офисов
5. **contracts** - Договоры
6. **calendar_events** - События календаря
7. **office_stats** - Статистика по офисам
8. **employee_stats** - Статистика по сотрудникам
9. **legal_documents** - Юридические документы

---

## Быстрые команды

### Проверка структуры БД
```bash
cd server
npm run db:check
```

### Пересоздание БД (удаляет все данные!)
```bash
cd server
npm run db:reset
```

### Применение миграций
```bash
cd server
npm run db:migrate
```

---

## Миграции

Миграции находятся в `server/database/migrations/` и применяются в алфавитном порядке:

- `000_init_schema.sql` - Основная схема БД
- `001_crm_sync.sql` - Синхронизация CRM
- `002_add_period_value_to_office_stats.sql` - Добавление period_value
- `003_add_paid_amount_to_contracts.sql` - Добавление paid_amount
- `004_create_employee_stats.sql` - Создание employee_stats

---

## Важные поля

### calendar_events
- `start_date` (DATE) - Дата события
- `time` (TIME) - Время события
- `type` (VARCHAR) - Тип: meeting, court, deadline, appointment, contract, other
- `priority` (VARCHAR) - Приоритет: low, medium, high

### contracts
- `contract_date` (DATE) - Дата заключения договора
- `amount` (DECIMAL) - Сумма договора
- `paid_amount` (DECIMAL) - Сумма внесения
- `status` (VARCHAR) - Статус: draft, active, completed, cancelled

### office_stats / employee_stats
- `period_type` (VARCHAR) - Тип периода: day, week, month, year
- `period_value` (VARCHAR) - Значение периода: 2025-11-20, 2025-W47, 2025-11, 2025
- `revenue` (DECIMAL) - Выручка
- `orders` (INT) - Количество заказов

---

## Ручное управление

### Подключение к MySQL
```bash
mysql -u lawtech_user -p lawtech_crm
```

### Просмотр таблиц
```sql
SHOW TABLES;
```

### Просмотр структуры таблицы
```sql
DESCRIBE calendar_events;
```

### Просмотр данных
```sql
SELECT * FROM calendar_events LIMIT 10;
SELECT * FROM contracts WHERE contract_date >= '2025-11-01';
SELECT * FROM office_stats WHERE period_type = 'month';
```

### Очистка таблицы (без удаления структуры)
```sql
TRUNCATE TABLE calendar_events;
```

### Удаление таблицы
```sql
DROP TABLE IF EXISTS calendar_events;
```

---

## Резервное копирование

### Создание бэкапа
```bash
# Полный бэкап
mysqldump -u lawtech_user -p lawtech_crm > backup_$(date +%Y%m%d).sql

# Бэкап с сжатием
mysqldump -u lawtech_user -p lawtech_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Только структура (без данных)
mysqldump -u lawtech_user -p --no-data lawtech_crm > schema_$(date +%Y%m%d).sql

# Только данные (без структуры)
mysqldump -u lawtech_user -p --no-create-info lawtech_crm > data_$(date +%Y%m%d).sql
```

### Восстановление из бэкапа
```bash
# Из обычного файла
mysql -u lawtech_user -p lawtech_crm < backup_20251120.sql

# Из сжатого файла
gunzip < backup_20251120.sql.gz | mysql -u lawtech_user -p lawtech_crm

# Или
zcat backup_20251120.sql.gz | mysql -u lawtech_user -p lawtech_crm
```

---

## Оптимизация

### Анализ таблиц
```sql
ANALYZE TABLE contracts;
ANALYZE TABLE calendar_events;
```

### Оптимизация таблиц
```sql
OPTIMIZE TABLE contracts;
OPTIMIZE TABLE calendar_events;
```

### Проверка индексов
```sql
SHOW INDEX FROM contracts;
SHOW INDEX FROM calendar_events;
```

### Добавление индекса
```sql
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_calendar_type ON calendar_events(type);
```

---

## Частые запросы

### Договоры за период
```sql
SELECT 
  c.id,
  c.contract_date,
  cl.name as client_name,
  c.amount,
  c.paid_amount,
  c.status
FROM contracts c
LEFT JOIN clients cl ON c.id_client = cl.id
WHERE c.contract_date BETWEEN '2025-11-01' AND '2025-11-30'
ORDER BY c.contract_date DESC;
```

### События календаря за месяц
```sql
SELECT 
  id,
  title,
  start_date,
  time,
  type,
  priority
FROM calendar_events
WHERE start_date BETWEEN '2025-11-01' AND '2025-11-30'
ORDER BY start_date, time;
```

### Статистика по офису
```sql
SELECT 
  period_type,
  period_value,
  revenue,
  orders
FROM office_stats
WHERE office_id = 2 AND period_type = 'month'
ORDER BY period_value DESC
LIMIT 12;
```

### Топ сотрудников по выручке
```sql
SELECT 
  e.first_name,
  e.last_name,
  SUM(es.revenue) as total_revenue,
  SUM(es.orders) as total_orders
FROM employee_stats es
JOIN employees e ON es.employee_id = e.id
WHERE es.period_type = 'month' 
  AND es.period_value = '2025-11'
GROUP BY e.id
ORDER BY total_revenue DESC
LIMIT 10;
```

---

## Troubleshooting

### Ошибка: "Table doesn't exist"
```bash
# Проверка структуры
npm run db:check

# Пересоздание БД
npm run db:reset
```

### Ошибка: "Unknown column 'date'"
```bash
# Проверка структуры calendar_events
mysql -u lawtech_user -p lawtech_crm -e "DESCRIBE calendar_events"

# Если нет поля start_date, пересоздайте БД
npm run db:reset
```

### Ошибка: "Duplicate entry"
```sql
-- Проверка дубликатов в office_stats
SELECT office_id, period_type, period_value, COUNT(*) as count
FROM office_stats
GROUP BY office_id, period_type, period_value
HAVING count > 1;

-- Удаление дубликатов (оставляем только последний)
DELETE t1 FROM office_stats t1
INNER JOIN office_stats t2 
WHERE t1.id < t2.id 
  AND t1.office_id = t2.office_id 
  AND t1.period_type = t2.period_type
  AND t1.period_value = t2.period_value;
```

### Медленные запросы
```sql
-- Включение логирования медленных запросов
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Просмотр медленных запросов
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

---

## Мониторинг

### Размер таблиц
```sql
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = 'lawtech_crm'
ORDER BY (data_length + index_length) DESC;
```

### Активные подключения
```sql
SHOW PROCESSLIST;
```

### Статус сервера
```sql
SHOW STATUS LIKE '%connection%';
SHOW STATUS LIKE '%thread%';
```

---

## Полезные ссылки

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQL Tutorial](https://www.w3schools.com/sql/)
- [Database Design Best Practices](https://www.vertabelo.com/blog/database-design-best-practices/)

---

**Последнее обновление**: 20.11.2025
