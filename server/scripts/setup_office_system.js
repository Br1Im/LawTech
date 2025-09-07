const db = require('../db');

/**
 * Скрипт для настройки полной системы офисов с сотрудниками и статистикой
 */
const setupOfficeSystem = async () => {
  try {
    console.log('Настройка системы офисов...');
    
    // Создание таблицы офисов
    await db.query(`
      CREATE TABLE IF NOT EXISTS offices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        contact_phone TEXT,
        website TEXT,
        revenue REAL DEFAULT 0.00,
        orders INTEGER DEFAULT 0,
        employee_count INTEGER DEFAULT 0,
        work_phone TEXT,
        work_phone2 TEXT,
        ip_surname TEXT,
        ip_name TEXT,
        ip_middle_name TEXT,
        inn TEXT,
        ogrn TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица офисов создана успешно');
    
    // Создание таблицы сотрудников
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_id INTEGER NOT NULL,
        surname TEXT NOT NULL,
        name TEXT NOT NULL,
        middle_name TEXT,
        position TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        daily_contracts INTEGER DEFAULT 0,
        total_revenue_14days REAL DEFAULT 0.00,
        period_revenue REAL DEFAULT 0.00,
        close_rate REAL DEFAULT 0.00,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица сотрудников создана успешно');
    
    // Создание таблицы статистики офисов по периодам
    await db.query(`
      CREATE TABLE IF NOT EXISTS office_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_id INTEGER NOT NULL,
        period_type TEXT NOT NULL, -- 'day', '2weeks', 'month'
        visits INTEGER DEFAULT 0,
        orders INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0.00,
        pending INTEGER DEFAULT 0,
        date DATE NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица статистики офисов создана успешно');
    
    // Создание таблицы данных для графиков
    await db.query(`
      CREATE TABLE IF NOT EXISTS chart_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_id INTEGER NOT NULL,
        chart_type TEXT NOT NULL, -- 'pie', 'bar', 'line'
        data_key TEXT NOT NULL,
        data_value REAL NOT NULL,
        label TEXT,
        date DATE NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица данных графиков создана успешно');
    
    // Обновление таблицы пользователей для связи с офисами
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        office_id INTEGER,
        role TEXT DEFAULT 'user',
        last_active DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
      )
    `);
    console.log('Таблица пользователей обновлена успешно');
    
    console.log('Система офисов настроена успешно');
    
    // Добавляем тестовые данные
    await seedTestData();
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при настройке системы офисов:', error);
    process.exit(1);
  }
};

/**
 * Заполнение тестовыми данными
 */
const seedTestData = async () => {
  try {
    console.log('Добавление тестовых данных...');
    
    // Проверяем, есть ли уже офисы
    const [existingOffices] = await db.query('SELECT COUNT(*) as count FROM offices');
    if (existingOffices[0].count > 0) {
      console.log('Офисы уже существуют, пропускаем добавление тестовых данных');
      return;
    }
    
    // Создаем тестовый офис
    const [officeResult] = await db.query(`
      INSERT INTO offices (name, address, contact_phone, website, revenue, orders, employee_count, work_phone, inn, ogrn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'ЮрКонсалт Центр',
      'г. Москва, ул. Тверская, д. 15, оф. 301',
      '+7 (495) 123-45-67',
      'https://yurkonsalt.ru',
      850000,
      45,
      8,
      '+7 (495) 123-45-68',
      '7701234567',
      '1027700123456'
    ]);
    
    const officeId = officeResult.insertId;
    console.log(`Создан офис с ID: ${officeId}`);
    
    // Добавляем сотрудников
    const employees = [
      {
        surname: 'Иванов',
        name: 'Александр',
        middle_name: 'Петрович',
        position: 'lawyer',
        phone: '+7 (905) 123-45-01',
        email: 'ivanov@yurkonsalt.ru',
        daily_contracts: 3,
        total_revenue_14days: 180000,
        period_revenue: 165000,
        close_rate: 0.85
      },
      {
        surname: 'Петрова',
        name: 'Елена',
        middle_name: 'Сергеевна',
        position: 'expert',
        phone: '+7 (905) 123-45-02',
        email: 'petrova@yurkonsalt.ru',
        daily_contracts: 2,
        total_revenue_14days: 120000,
        period_revenue: 110000,
        close_rate: 0.78
      },
      {
        surname: 'Сидоров',
        name: 'Михаил',
        middle_name: 'Андреевич',
        position: 'admin',
        phone: '+7 (905) 123-45-03',
        email: 'sidorov@yurkonsalt.ru',
        daily_contracts: 4,
        total_revenue_14days: 200000,
        period_revenue: 185000,
        close_rate: 0.82
      },
      {
        surname: 'Козлова',
        name: 'Анна',
        middle_name: 'Владимировна',
        position: 'lawyer',
        phone: '+7 (905) 123-45-04',
        email: 'kozlova@yurkonsalt.ru',
        daily_contracts: 3,
        total_revenue_14days: 155000,
        period_revenue: 140000,
        close_rate: 0.75
      },
      {
        surname: 'Морозов',
        name: 'Дмитрий',
        middle_name: 'Игоревич',
        position: 'expert',
        phone: '+7 (905) 123-45-05',
        email: 'morozov@yurkonsalt.ru',
        daily_contracts: 2,
        total_revenue_14days: 95000,
        period_revenue: 88000,
        close_rate: 0.72
      },
      {
        surname: 'Волкова',
        name: 'Ольга',
        middle_name: 'Николаевна',
        position: 'admin',
        phone: '+7 (905) 123-45-06',
        email: 'volkova@yurkonsalt.ru',
        daily_contracts: 1,
        total_revenue_14days: 65000,
        period_revenue: 60000,
        close_rate: 0.68
      },
      {
        surname: 'Новиков',
        name: 'Сергей',
        middle_name: 'Алексеевич',
        position: 'lawyer',
        phone: '+7 (905) 123-45-07',
        email: 'novikov@yurkonsalt.ru',
        daily_contracts: 4,
        total_revenue_14days: 220000,
        period_revenue: 205000,
        close_rate: 0.88
      },
      {
        surname: 'Федорова',
        name: 'Мария',
        middle_name: 'Викторовна',
        position: 'expert',
        phone: '+7 (905) 123-45-08',
        email: 'fedorova@yurkonsalt.ru',
        daily_contracts: 2,
        total_revenue_14days: 105000,
        period_revenue: 98000,
        close_rate: 0.76
      }
    ];
    
    for (const employee of employees) {
      await db.query(`
        INSERT INTO employees (office_id, surname, name, middle_name, position, phone, email, daily_contracts, total_revenue_14days, period_revenue, close_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        officeId,
        employee.surname,
        employee.name,
        employee.middle_name,
        employee.position,
        employee.phone,
        employee.email,
        employee.daily_contracts,
        employee.total_revenue_14days,
        employee.period_revenue,
        employee.close_rate
      ]);
    }
    
    console.log(`Добавлено ${employees.length} сотрудников`);
    
    // Добавляем статистику офиса
    const today = new Date().toISOString().split('T')[0];
    await db.query(`
      INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, 'day', 125, 45, 850000, 12, today]);
    
    await db.query(`
      INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, '2weeks', 1750, 630, 11900000, 168, today]);
    
    await db.query(`
      INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, 'month', 3800, 1350, 25500000, 360, today]);
    
    console.log('Добавлена статистика офиса');
    
    // Добавляем данные для графиков
    const chartData = [
      // Данные для круговой диаграммы (распределение по типам дел)
      { chart_type: 'pie', data_key: 'civil', data_value: 45, label: 'Гражданские дела' },
      { chart_type: 'pie', data_key: 'corporate', data_value: 30, label: 'Корпоративное право' },
      { chart_type: 'pie', data_key: 'family', data_value: 15, label: 'Семейное право' },
      { chart_type: 'pie', data_key: 'criminal', data_value: 10, label: 'Уголовные дела' },
      
      // Данные для столбчатой диаграммы (выручка по месяцам)
      { chart_type: 'bar', data_key: 'jan', data_value: 2100000, label: 'Январь' },
      { chart_type: 'bar', data_key: 'feb', data_value: 2350000, label: 'Февраль' },
      { chart_type: 'bar', data_key: 'mar', data_value: 2800000, label: 'Март' },
      { chart_type: 'bar', data_key: 'apr', data_value: 2650000, label: 'Апрель' },
      { chart_type: 'bar', data_key: 'may', data_value: 2900000, label: 'Май' },
      { chart_type: 'bar', data_key: 'jun', data_value: 3100000, label: 'Июнь' }
    ];
    
    for (const data of chartData) {
      await db.query(`
        INSERT INTO chart_data (office_id, chart_type, data_key, data_value, label, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [officeId, data.chart_type, data.data_key, data.data_value, data.label, today]);
    }
    
    console.log('Добавлены данные для графиков');
    
    console.log('Тестовые данные успешно добавлены');
  } catch (error) {
    console.error('Ошибка при добавлении тестовых данных:', error);
    throw error;
  }
};

setupOfficeSystem();