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
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255),
        contact_phone VARCHAR(50),
        website VARCHAR(255),
        revenue DECIMAL(10, 2) DEFAULT 0.00,
        orders INT DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME
      )
    `);
    console.log('Таблица офисов создана успешно');
    
    try {
      // Создание таблицы пользователей (если еще не создана)
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          office_id INT,
          role VARCHAR(50) DEFAULT 'user',
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
          id INT AUTO_INCREMENT PRIMARY KEY,
          text TEXT NOT NULL,
          sender VARCHAR(255) NOT NULL,
          office_id INT NOT NULL,
          user_id INT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
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