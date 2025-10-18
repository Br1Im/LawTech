const db = require('./db');

async function createTablesOnly() {
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
      contract_date DATE,
      contract_number TEXT,
      contract_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
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

    // Таблица юридических документов
    `CREATE TABLE IF NOT EXISTS legal_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id)
    )`,

    // Таблица сообщений чата
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ];

  try {
    for (const table of tables) {
      await db.query(table);
    }
    console.log('✅ Все таблицы созданы успешно');
    
    // Проверяем созданные таблицы
    const result = await db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log(`📋 Создано таблиц: ${result.length}`);
    result.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error.message);
    throw error;
  }
}

// Запускаем создание таблиц
createTablesOnly()
  .then(() => {
    console.log('🎉 Создание таблиц завершено!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  });