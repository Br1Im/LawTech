const db = require('../db');

/**
 * Скрипт для настройки базы данных
 */
const setupDatabase = async () => {
  try {
    console.log('Настройка базы данных...');
    
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
        created_at DATETIME NOT NULL,
        updated_at DATETIME
      )
    `);
    console.log('Таблица офисов создана успешно');
    
    try {
      // Создание таблицы пользователей (если еще не создана)
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          office_id INTEGER,
          role TEXT DEFAULT 'user',
          last_active DATETIME,
          created_at DATETIME NOT NULL,
          updated_at DATETIME,
          FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
        )
      `);
      console.log('Таблица пользователей создана успешно');
      
      // Создание таблицы сообщений
      await db.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          sender TEXT NOT NULL,
          office_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME NOT NULL,
          FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Таблица сообщений создана успешно');
    } catch (err) {
      console.error('Произошла ошибка при создании таблиц:', err.message);
    }
    
    console.log('База данных настроена успешно');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при настройке базы данных:', error);
    process.exit(1);
  }
};

setupDatabase();