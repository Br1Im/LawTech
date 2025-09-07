const db = require('../db');
const { query } = require('../db');
const bcrypt = require('bcrypt');

// Схема базы данных с таблицами и их структурой
const DATABASE_SCHEMA = {
  offices: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT NOT NULL',
      address: 'TEXT',
      contact_phone: 'TEXT',
      website: 'TEXT',
      revenue: 'INTEGER DEFAULT 0',
      orders: 'INTEGER DEFAULT 0',
      employee_count: 'INTEGER DEFAULT 0',
      work_phone: 'TEXT',
      work_phone2: 'TEXT',
      ip_surname: 'TEXT',
      ip_name: 'TEXT',
      ip_middle_name: 'TEXT',
      inn: 'TEXT',
      ogrn: 'TEXT',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    }
  },
  users: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      username: 'TEXT NOT NULL',
      email: 'TEXT UNIQUE NOT NULL',
      password: 'TEXT NOT NULL',
      office_id: 'INTEGER',
      role: 'TEXT DEFAULT "user"',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id)'
    ]
  },
  employees: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      office_id: 'INTEGER NOT NULL',
      surname: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      middle_name: 'TEXT',
      position: 'TEXT',
      phone: 'TEXT',
      email: 'TEXT',
      daily_contracts: 'INTEGER DEFAULT 0',
      total_revenue_14days: 'INTEGER DEFAULT 0',
      period_revenue: 'INTEGER DEFAULT 0',
      close_rate: 'REAL DEFAULT 0',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id)'
    ]
  },
  office_stats: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      office_id: 'INTEGER NOT NULL',
      period_type: 'TEXT NOT NULL',
      visits: 'INTEGER DEFAULT 0',
      orders: 'INTEGER DEFAULT 0',
      revenue: 'INTEGER DEFAULT 0',
      pending: 'INTEGER DEFAULT 0',
      date: 'DATE NOT NULL',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id)'
    ]
  },
  chart_data: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      office_id: 'INTEGER NOT NULL',
      chart_type: 'TEXT NOT NULL',
      data_key: 'TEXT NOT NULL',
      data_value: 'INTEGER DEFAULT 0',
      label: 'TEXT',
      date: 'DATE NOT NULL',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id)'
    ]
  }
};

// Функция для проверки существования таблицы
async function tableExists(tableName) {
  try {
    const result = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result.length > 0;
  } catch (error) {
    console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
    return false;
  }
}

// Функция для получения структуры таблицы
async function getTableStructure(tableName) {
  try {
    const result = await query(`PRAGMA table_info(${tableName})`);
    return result.map(col => ({
      name: col.name,
      type: col.type,
      notnull: col.notnull,
      dflt_value: col.dflt_value,
      pk: col.pk
    }));
  } catch (error) {
    console.error(`Ошибка при получении структуры таблицы ${tableName}:`, error);
    return [];
  }
}

// Функция для создания таблицы
async function createTable(tableName, schema) {
  try {
    const columns = Object.entries(schema.columns)
      .map(([name, definition]) => `${name} ${definition}`)
      .join(', ');
    
    const foreignKeys = schema.foreignKeys ? schema.foreignKeys.join(', ') : '';
    const tableDefinition = foreignKeys ? `${columns}, ${foreignKeys}` : columns;
    
    const createQuery = `CREATE TABLE ${tableName} (${tableDefinition})`;
    
    console.log(`Создание таблицы ${tableName}...`);
    await db.query(createQuery);
    console.log(`✅ Таблица ${tableName} создана успешно`);
  } catch (error) {
    console.error(`❌ Ошибка при создании таблицы ${tableName}:`, error);
    throw error;
  }
}

// Функция для добавления недостающих колонок
async function addMissingColumns(tableName, schema, existingColumns) {
  const existingColumnNames = existingColumns.map(col => col.name);
  const requiredColumns = Object.keys(schema.columns);
  
  for (const columnName of requiredColumns) {
    if (!existingColumnNames.includes(columnName)) {
      try {
        const columnDefinition = schema.columns[columnName];
        console.log(`Добавление колонки ${columnName} в таблицу ${tableName}...`);
        await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
        console.log(`✅ Колонка ${columnName} добавлена в таблицу ${tableName}`);
      } catch (error) {
        if (error.message && error.message.includes('duplicate column name')) {
          console.log(`⚠️  Колонка ${columnName} уже существует в таблице ${tableName}`);
        } else {
          console.error(`❌ Ошибка при добавлении колонки ${columnName} в таблицу ${tableName}:`, error);
        }
      }
    }
  }
}

// Функция для проверки и обновления структуры базы данных
async function ensureDatabaseStructure() {
  console.log('🔍 Проверка структуры базы данных...');
  
  for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
    console.log(`\n📋 Проверка таблицы: ${tableName}`);
    
    const exists = await tableExists(tableName);
    
    if (!exists) {
      console.log(`⚠️  Таблица ${tableName} не существует`);
      await createTable(tableName, schema);
    } else {
      console.log(`✅ Таблица ${tableName} существует`);
      
      // Проверяем структуру таблицы
      const existingColumns = await getTableStructure(tableName);
      await addMissingColumns(tableName, schema, existingColumns);
    }
  }
  
  console.log('\n✅ Проверка структуры базы данных завершена');
}

// Функция для создания офиса
async function createOffice(officeData) {
  try {
    const [result] = await db.query(`
      INSERT INTO offices (
        name, address, contact_phone, website, revenue, orders, employee_count,
        work_phone, work_phone2, ip_surname, ip_name, ip_middle_name, inn, ogrn,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      officeData.name,
      officeData.address,
      officeData.contact_phone,
      officeData.website,
      officeData.revenue || 0,
      officeData.orders || 0,
      officeData.employee_count || 0,
      officeData.work_phone,
      officeData.work_phone2,
      officeData.ip_surname,
      officeData.ip_name,
      officeData.ip_middle_name,
      officeData.inn,
      officeData.ogrn
    ]);
    
    console.log(`✅ Создан офис с ID: ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Ошибка при создании офиса:', error);
    throw error;
  }
}

// Функция для создания пользователя
async function createUser(userData) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const [result] = await db.query(`
      INSERT INTO users (
        username, email, password, office_id, role,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      userData.username,
      userData.email,
      hashedPassword,
      userData.office_id,
      userData.role || 'user'
    ]);
    
    console.log(`✅ Создан пользователь с ID: ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error);
    throw error;
  }
}

// Функция для создания сотрудника
async function createEmployee(employeeData) {
  try {
    const [result] = await db.query(`
      INSERT INTO employees (
        office_id, surname, name, middle_name, position, phone, email,
        daily_contracts, total_revenue_14days, period_revenue, close_rate,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      employeeData.office_id,
      employeeData.surname,
      employeeData.name,
      employeeData.middle_name,
      employeeData.position || 'employee',
      employeeData.phone,
      employeeData.email,
      employeeData.daily_contracts || 0,
      employeeData.total_revenue_14days || 0,
      employeeData.period_revenue || 0,
      employeeData.close_rate || 0
    ]);
    
    console.log(`✅ Создан сотрудник с ID: ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Ошибка при создании сотрудника:', error);
    throw error;
  }
}

// Функция для создания статистики офиса
async function createOfficeStats(officeId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const periods = ['day', '2weeks', 'month'];
    
    for (const period of periods) {
      await db.query(`
        INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [officeId, period, 0, 0, 0, 0, today]);
    }
    
    console.log(`✅ Создана базовая статистика для офиса ID: ${officeId}`);
  } catch (error) {
    console.error('❌ Ошибка при создании статистики офиса:', error);
    throw error;
  }
}

// Функция для создания данных графиков
async function createChartData(officeId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Данные для круговой диаграммы
    const pieData = [
      { key: 'civil', value: 0, label: 'Гражданские дела' },
      { key: 'criminal', value: 0, label: 'Уголовные дела' },
      { key: 'corporate', value: 0, label: 'Корпоративное право' },
      { key: 'family', value: 0, label: 'Семейное право' }
    ];
    
    // Данные для линейного графика (последние 7 дней)
    const lineData = [];
    for (let i = 1; i <= 7; i++) {
      lineData.push({ key: `day${i}`, value: 0, label: `День ${i}` });
    }
    
    // Вставляем данные круговой диаграммы
    for (const data of pieData) {
      await db.query(`
        INSERT INTO chart_data (office_id, chart_type, data_key, data_value, label, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [officeId, 'pie', data.key, data.value, data.label, today]);
    }
    
    // Вставляем данные линейного графика
    for (const data of lineData) {
      await db.query(`
        INSERT INTO chart_data (office_id, chart_type, data_key, data_value, label, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [officeId, 'line', data.key, data.value, data.label, today]);
    }
    
    console.log(`✅ Созданы базовые данные графиков для офиса ID: ${officeId}`);
  } catch (error) {
    console.error('❌ Ошибка при создании данных графиков:', error);
    throw error;
  }
}

// Основная функция для создания полного аккаунта юриста
async function createLawyerAccount(options = {}) {
  try {
    console.log('🚀 Начало создания аккаунта юриста...');
    
    // Проверяем и обновляем структуру БД
    await ensureDatabaseStructure();
    
    // Генерируем уникальный timestamp для email
    const timestamp = Date.now();
    
    // Данные офиса (можно передать через options)
    const officeData = {
      name: options.officeName || 'Юридическая консультация "Правовед"',
      address: options.officeAddress || 'г. Москва, ул. Арбат, д. 25, оф. 12',
      contact_phone: options.officePhone || '+7 (495) 987-65-43',
      website: options.officeWebsite || 'https://pravoved-law.ru',
      revenue: options.officeRevenue || 0,
      orders: options.officeOrders || 0,
      employee_count: options.employeeCount || 1,
      work_phone: options.workPhone || '+7 (495) 987-65-43',
      work_phone2: options.workPhone2 || '+7 (495) 987-65-44',
      ip_surname: options.ipSurname || 'Петров',
      ip_name: options.ipName || 'Михаил',
      ip_middle_name: options.ipMiddleName || 'Александрович',
      inn: options.inn || '123456789012',
      ogrn: options.ogrn || '1234567890123'
    };
    
    // Создаем офис
    const officeId = await createOffice(officeData);
    
    // Данные пользователя
    const userData = {
      username: options.username || 'Михаил Петров',
      email: options.email || `lawyer${timestamp}@pravoved-law.ru`,
      password: options.password || 'lawyer123',
      office_id: officeId,
      role: options.role || 'admin'
    };
    
    // Создаем пользователя
    const userId = await createUser(userData);
    
    // Создаем сотрудника
    const employeeData = {
      office_id: officeId,
      surname: officeData.ip_surname,
      name: officeData.ip_name,
      middle_name: officeData.ip_middle_name,
      position: 'lawyer',
      phone: officeData.contact_phone,
      email: userData.email
    };
    
    const employeeId = await createEmployee(employeeData);
    
    // Создаем статистику офиса
    await createOfficeStats(officeId);
    
    // Создаем данные графиков
    await createChartData(officeId);
    
    console.log('\n🎉 === АККАУНТ ЮРИСТА СОЗДАН УСПЕШНО ===');
    console.log(`🏢 Офис: ${officeData.name}`);
    console.log(`📍 Адрес: ${officeData.address}`);
    console.log(`📧 Email для входа: ${userData.email}`);
    console.log(`🔑 Пароль: ${userData.password}`);
    console.log(`👤 Роль: ${userData.role}`);
    console.log(`🆔 ID офиса: ${officeId}`);
    console.log(`🆔 ID пользователя: ${userId}`);
    console.log(`🆔 ID сотрудника: ${employeeId}`);
    console.log('=======================================\n');
    
    return {
      officeId,
      userId,
      employeeId,
      credentials: {
        email: userData.email,
        password: userData.password,
        role: userData.role
      }
    };
    
  } catch (error) {
    console.error('❌ Ошибка при создании аккаунта юриста:', error);
    throw error;
  }
}

// Экспорт функций для использования в других скриптах
module.exports = {
  ensureDatabaseStructure,
  createOffice,
  createUser,
  createEmployee,
  createOfficeStats,
  createChartData,
  createLawyerAccount,
  DATABASE_SCHEMA
};

// Если скрипт запускается напрямую
if (require.main === module) {
  createLawyerAccount()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}