const db = require('./db');
const bcrypt = require('bcryptjs');

async function initializeSQLiteDatabase() {
  console.log('🚀 Начинаем инициализацию SQLite базы данных...');

  try {
    // Создание таблиц
    await createTables();
    
    // Создание тестовых данных
    await createTestData();
    
    console.log('🎉 SQLite база данных успешно инициализирована!');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error.message);
    throw error;
  }
}

async function createTables() {
  console.log('🔧 Создание таблиц...');

  const tables = [
    // Таблица офисов
    `CREATE TABLE IF NOT EXISTS offices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_phone TEXT,
      email TEXT,
      website TEXT,
      employee_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица пользователей
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      office_id INTEGER,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      position TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id)
    )`,

    // Таблица сотрудников
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      position TEXT,
      email TEXT,
      phone TEXT,
      hire_date DATE,
      salary DECIMAL(10,2),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id)
    )`,

    // Таблица клиентов
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id)
    )`,

    // Таблица контрактов
    `CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount DECIMAL(12,2),
      status TEXT DEFAULT 'draft',
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )`,

    // Таблица статистики офисов
    `CREATE TABLE IF NOT EXISTS office_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      revenue DECIMAL(12,2) DEFAULT 0,
      expenses DECIMAL(12,2) DEFAULT 0,
      profit DECIMAL(12,2) DEFAULT 0,
      cases_count INTEGER DEFAULT 0,
      clients_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id)
    )`,

    // Таблица событий календаря
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      user_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      event_type TEXT DEFAULT 'meeting',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Таблица сообщений
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Таблица юридических документов
    `CREATE TABLE IF NOT EXISTS legal_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      client_id INTEGER,
      contract_id INTEGER,
      title TEXT NOT NULL,
      document_type TEXT,
      file_path TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (contract_id) REFERENCES contracts(id)
    )`
  ];

  for (const tableSQL of tables) {
    await db.query(tableSQL);
  }

  console.log('✅ Все таблицы созданы');
}

async function createTestData() {
  console.log('🌱 Создание тестовых данных...');

  // Создание тестового офиса
  const officeResult = await db.query(`
    INSERT INTO offices (name, address, contact_phone, email, website, employee_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    'Главный офис LawTech',
    'г. Москва, ул. Тверская, д. 1',
    '+7 (495) 123-45-67',
    'info@lawtech.ru',
    'https://lawtech.ru',
    5
  ]);

  const officeId = officeResult[0].insertId;
  console.log('✅ Тестовый офис создан');

  // Создание тестового администратора
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.query(`
    INSERT INTO users (email, password, role, office_id, first_name, last_name, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'admin@lawtech.ru',
    hashedPassword,
    'admin',
    officeId,
    'Администратор',
    'Системы',
    'Системный администратор'
  ]);

  console.log('✅ Тестовый администратор создан');

  // Создание тестового юриста
  const lawyerPassword = await bcrypt.hash('lawyer123', 10);
  await db.query(`
    INSERT INTO users (email, password, role, office_id, first_name, last_name, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'lawyer@lawtech.ru',
    lawyerPassword,
    'lawyer',
    officeId,
    'Иван',
    'Петров',
    'Старший юрист'
  ]);

  console.log('✅ Тестовый юрист создан');

  // Создание тестовых сотрудников
  const employees = [
    ['Анна', 'Иванова', 'Юрист', 'anna@lawtech.ru', '+7 (495) 123-45-68', '2023-01-15', 80000],
    ['Петр', 'Сидоров', 'Помощник юриста', 'petr@lawtech.ru', '+7 (495) 123-45-69', '2023-03-01', 50000],
    ['Мария', 'Козлова', 'Секретарь', 'maria@lawtech.ru', '+7 (495) 123-45-70', '2023-02-10', 40000]
  ];

  for (const employee of employees) {
    await db.query(`
      INSERT INTO employees (office_id, first_name, last_name, position, email, phone, hire_date, salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [officeId, ...employee]);
  }

  console.log('✅ Тестовые сотрудники созданы');

  // Создание тестовых клиентов
  const clients = [
    ['ООО "Рога и Копыта"', 'Василий', 'Пупкин', 'vasily@rogaikopyta.ru', '+7 (495) 987-65-43', 'г. Москва, ул. Ленина, д. 10'],
    ['ИП Сидоров', 'Иван', 'Сидоров', 'ivan@sidorov.ru', '+7 (495) 987-65-44', 'г. Москва, ул. Пушкина, д. 20'],
    ['ЗАО "Светлое будущее"', 'Елена', 'Светлова', 'elena@svetloe.ru', '+7 (495) 987-65-45', 'г. Москва, ул. Гагарина, д. 30']
  ];

  for (const client of clients) {
    await db.query(`
      INSERT INTO clients (office_id, company, first_name, last_name, email, phone, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, ...client]);
  }

  console.log('✅ Тестовые клиенты созданы');

  // Создание тестовой статистики
  const currentYear = new Date().getFullYear();
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  
  for (const month of months) {
    const revenue = Math.floor(Math.random() * 500000) + 100000;
    const expenses = Math.floor(revenue * 0.6);
    const profit = revenue - expenses;
    const casesCount = Math.floor(Math.random() * 20) + 5;
    const clientsCount = Math.floor(Math.random() * 10) + 3;

    await db.query(`
      INSERT INTO office_stats (office_id, month, year, revenue, expenses, profit, cases_count, clients_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [officeId, month, currentYear, revenue, expenses, profit, casesCount, clientsCount]);
  }

  console.log('✅ Тестовая статистика создана');
}

// Запуск инициализации, если файл запущен напрямую
if (require.main === module) {
  initializeSQLiteDatabase()
    .then(() => {
      console.log('✅ Инициализация завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка инициализации:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeSQLiteDatabase,
  createTables,
  createTestData
};