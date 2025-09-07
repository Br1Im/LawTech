# Универсальный менеджер базы данных

## Описание

Универсальный менеджер базы данных - это мощный инструмент для автоматической проверки, обновления структуры базы данных и создания тестовых данных. Скрипт легко расширяется для добавления новых таблиц и функциональности.

## Файлы системы

### Основные файлы
- `universal_setup.js` - Базовый скрипт для создания основной структуры БД и аккаунта юриста
- `universal_database_manager.js` - **Главный универсальный менеджер** (рекомендуется к использованию)
- `add_new_data_example.js` - Пример расширения базового скрипта

### Документация
- `README_UNIVERSAL_SETUP.md` - Документация по базовому скрипту
- `README_UNIVERSAL_DATABASE_MANAGER.md` - Данная документация

## Возможности универсального менеджера

### 🔧 Автоматическая проверка и обновление БД
- Проверяет существование всех необходимых таблиц
- Автоматически создает недостающие таблицы
- Добавляет недостающие колонки в существующие таблицы
- Поддерживает внешние ключи и ограничения

### 📊 Создание тестовых данных
- Создает аккаунт юриста с офисом и сотрудником
- Генерирует тестовых клиентов
- Создает тестовые дела для клиентов
- Добавляет статистику и данные для графиков

### 🚀 Легкое расширение
- Простое добавление новых таблиц через схему
- Модульная архитектура
- Переиспользование функций

## Структура базы данных

### Базовые таблицы (из universal_setup.js)
- `offices` - Офисы
- `users` - Пользователи
- `employees` - Сотрудники
- `office_stats` - Статистика офисов
- `chart_data` - Данные для графиков

### Расширенные таблицы (добавляются менеджером)
- `clients` - Клиенты
- `cases` - Дела/кейсы

## Использование

### Базовое использование

```bash
# Запуск с настройками по умолчанию
node scripts/universal_database_manager.js
```

### Программное использование

```javascript
const { createCompleteDataSet } = require('./scripts/universal_database_manager');

// Создание с настройками по умолчанию
const result = await createCompleteDataSet();

// Создание с кастомными настройками
const result = await createCompleteDataSet({
  officeName: 'Моя юридическая фирма',
  username: 'Иван Петров',
  email: 'ivan@mylaw.ru',
  password: 'mypassword123',
  clientsCount: 5
});

// Создание с дополнительными таблицами
const customSchema = {
  documents: {
    columns: [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'case_id INTEGER NOT NULL',
      'title TEXT NOT NULL',
      'file_path TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    foreignKeys: [
      'FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE'
    ]
  }
};

const result = await createCompleteDataSet({}, customSchema);
```

## Параметры функции createCompleteDataSet

### options (объект)
- `officeName` - Название офиса
- `officeAddress` - Адрес офиса
- `username` - Имя пользователя
- `email` - Email для входа (если не указан, генерируется автоматически)
- `password` - Пароль (по умолчанию: 'lawyer123')
- `role` - Роль пользователя (по умолчанию: 'admin')
- `clientsCount` - Количество тестовых клиентов (по умолчанию: 3)

### extensionsSchema (объект)
Схема дополнительных таблиц в формате:
```javascript
{
  table_name: {
    columns: ['колонка1', 'колонка2', ...],
    foreignKeys: ['FOREIGN KEY ...', ...] // опционально
  }
}
```

## Результат выполнения

Функция возвращает объект с полной информацией:

```javascript
{
  lawyerAccount: {
    officeId: 1,
    userId: 1,
    employeeId: 1,
    credentials: {
      email: 'lawyer123@example.com',
      password: 'lawyer123',
      role: 'admin'
    }
  },
  clients: [
    { id: 1, full_name: 'Иванов Иван', ... },
    // ...
  ],
  cases: [
    { id: 1, title: 'Взыскание долга', ... },
    // ...
  ],
  summary: {
    officeId: 1,
    userId: 1,
    employeeId: 1,
    clientsCount: 3,
    casesCount: 3,
    credentials: { ... }
  }
}
```

## Расширение функциональности

### Добавление новых таблиц

1. **Через параметр extensionsSchema:**
```javascript
const newTables = {
  contracts: {
    columns: [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'case_id INTEGER NOT NULL',
      'contract_number TEXT UNIQUE',
      'amount DECIMAL(10,2)',
      'signed_date DATE'
    ],
    foreignKeys: [
      'FOREIGN KEY (case_id) REFERENCES cases(id)'
    ]
  }
};

await createCompleteDataSet({}, newTables);
```

2. **Модификация EXTENSIONS_SCHEMA в коде:**
```javascript
// В файле universal_database_manager.js
const EXTENSIONS_SCHEMA = {
  clients: { ... },
  cases: { ... },
  // Добавляем новую таблицу
  contracts: {
    columns: [...],
    foreignKeys: [...]
  }
};
```

### Добавление функций создания данных

```javascript
// Функция для создания контрактов
async function createContract(contractData) {
  try {
    const [result] = await query(`
      INSERT INTO contracts (case_id, contract_number, amount, signed_date)
      VALUES (?, ?, ?, ?)
    `, [
      contractData.case_id,
      contractData.contract_number,
      contractData.amount,
      contractData.signed_date
    ]);
    
    console.log(`✅ Создан контракт с ID: ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Ошибка при создании контракта:', error);
    throw error;
  }
}
```

## Безопасность

- Все SQL-запросы используют параметризованные запросы
- Автоматическая генерация уникальных email-адресов
- Проверка существования таблиц перед операциями
- Обработка ошибок дублирования колонок

## Обработка ошибок

- Автоматическая обработка ошибок дублирования колонок
- Детальное логирование всех операций
- Откат изменений при критических ошибках
- Информативные сообщения об ошибках

## Мониторинг

Скрипт выводит подробную информацию о выполнении:
- ✅ Успешные операции
- ⚠️ Предупреждения
- ❌ Ошибки
- 🔍 Отладочная информация (при необходимости)

## Повторное выполнение

Скрипт безопасен для повторного выполнения:
- Проверяет существование таблиц перед созданием
- Не дублирует данные
- Обновляет только недостающие элементы

## Примеры использования

### Создание базового набора данных
```bash
node scripts/universal_database_manager.js
```

### Создание с кастомным офисом
```javascript
const result = await createCompleteDataSet({
  officeName: 'ООО "Правовая помощь"',
  officeAddress: 'г. СПб, Невский пр., д. 100',
  username: 'Анна Смирнова',
  email: 'anna@legal-help.ru',
  clientsCount: 10
});
```

### Добавление таблицы документов
```javascript
const documentsSchema = {
  documents: {
    columns: [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'case_id INTEGER NOT NULL',
      'title TEXT NOT NULL',
      'file_path TEXT',
      'document_type TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    foreignKeys: [
      'FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE'
    ]
  }
};

const result = await createCompleteDataSet({}, documentsSchema);
```

## Важные замечания

1. **Порядок выполнения:** Сначала обновляется схема БД, затем создаются данные
2. **Внешние ключи:** Поддерживаются и автоматически создаются
3. **Уникальность:** Email-адреса генерируются с timestamp для уникальности
4. **Расширяемость:** Легко добавлять новые таблицы и функции
5. **Совместимость:** Работает с существующей структурой БД

## Техническая информация

- **База данных:** SQLite3
- **Node.js:** Требуется версия 14+
- **Зависимости:** sqlite3, существующие модули проекта
- **Кодировка:** UTF-8
- **Формат даты:** ISO 8601 (YYYY-MM-DD)

---

**Универсальный менеджер базы данных** - это мощный и гибкий инструмент для управления структурой БД и тестовыми данными в проекте LawTech.