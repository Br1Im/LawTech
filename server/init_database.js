const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Конфигурация подключения к БД
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lawtech'
};

// Конфигурация подключения без указания БД для создания БД
const dbConfigWithoutDB = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password'
};

/**
 * Создание базы данных если она не существует
 */
async function createDatabase() {
  let connection;
  try {
    console.log('🔍 Проверка существования базы данных...');
    connection = await mysql.createConnection(dbConfigWithoutDB);
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ База данных '${dbConfig.database}' готова к использованию`);
    
  } catch (error) {
    console.error('❌ Ошибка при создании базы данных:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Создание всех необходимых таблиц
 */
async function createTables() {
  let connection;
  try {
    console.log('🔧 Создание таблиц...');
    connection = await mysql.createConnection(dbConfig);

    // Таблица офисов
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS offices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        contact_phone VARCHAR(50),
        website VARCHAR(255),
        revenue DECIMAL(15,2) DEFAULT 0.00,
        orders INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица offices создана');

    // Таблица пользователей
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
        office_id INT,
        last_active TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица users создана');

    // Таблица сотрудников
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        office_id INT,
        salary DECIMAL(10,2),
        hire_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица employees создана');

    // Таблица клиентов
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        office_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица clients создана');

    // Таблица контрактов
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        client_id INT,
        office_id INT,
        amount DECIMAL(15,2),
        status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица contracts создана');

    // Таблица статистики офисов
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS office_stats (
        id INT PRIMARY KEY AUTO_INCREMENT,
        office_id INT NOT NULL,
        period_type ENUM('day', 'week', 'month', 'year') NOT NULL,
        revenue DECIMAL(15,2) DEFAULT 0.00,
        orders INT DEFAULT 0,
        clients INT DEFAULT 0,
        employees INT DEFAULT 0,
        expenses DECIMAL(15,2) DEFAULT 0.00,
        documents INT DEFAULT 0,
        visits INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_office_period (office_id, period_type),
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица office_stats создана');

    // Таблица календарных событий
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        participants TEXT,
        location VARCHAR(255),
        created_by INT NOT NULL,
        office_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица calendar_events создана');

    // Таблица сообщений (если используется)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        text TEXT NOT NULL,
        sender VARCHAR(255) NOT NULL,
        office_id INT NOT NULL,
        user_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица messages создана');

    // Таблица юридических документов (если используется)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        embedding TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Таблица legal_documents создана');

  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Создание тестовых данных
 */
async function seedData() {
  let connection;
  try {
    console.log('🌱 Создание тестовых данных...');
    connection = await mysql.createConnection(dbConfig);

    // Проверяем, есть ли уже данные
    const [existingOffices] = await connection.execute('SELECT COUNT(*) as count FROM offices');
    if (existingOffices[0].count > 0) {
      console.log('ℹ️ Тестовые данные уже существуют, пропускаем создание');
      return;
    }

    // Создаем тестовые офисы
    const [officeResult] = await connection.execute(`
      INSERT INTO offices (name, address, contact_phone, website, revenue, orders) VALUES
      ('Главный офис', 'г. Москва, ул. Тверская, д. 1', '+7 (495) 123-45-67', 'https://lawtech.ru', 1500000.00, 45),
      ('Филиал СПб', 'г. Санкт-Петербург, Невский пр., д. 28', '+7 (812) 987-65-43', 'https://spb.lawtech.ru', 850000.00, 28),
      ('Филиал Екатеринбург', 'г. Екатеринбург, ул. Ленина, д. 15', '+7 (343) 555-12-34', 'https://ekb.lawtech.ru', 620000.00, 19)
    `);
    console.log('✅ Тестовые офисы созданы');

    // Создаем тестового администратора
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(`
      INSERT INTO users (username, email, password, role, office_id) VALUES
      ('admin', 'admin@lawtech.ru', ?, 'admin', 1)
    `, [hashedPassword]);
    console.log('✅ Тестовый администратор создан (admin / admin123)');

    // Создаем статистику для офисов
    const offices = [1, 2, 3];
    const periods = ['day', 'week', 'month', 'year'];
    
    for (const officeId of offices) {
      for (const period of periods) {
        const revenue = Math.floor(Math.random() * 100000) + 50000;
        const orders = Math.floor(Math.random() * 50) + 10;
        const clients = Math.floor(Math.random() * 30) + 5;
        const employees = Math.floor(Math.random() * 15) + 3;
        
        await connection.execute(`
          INSERT INTO office_stats (office_id, period_type, revenue, orders, clients, employees, expenses, documents, visits)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [officeId, period, revenue, orders, clients, employees, revenue * 0.7, orders * 2, orders * 3]);
      }
    }
    console.log('✅ Тестовая статистика создана');

  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Основная функция инициализации
 */
async function initializeDatabase() {
  try {
    console.log('🚀 Начинаем инициализацию базы данных...');
    
    await createDatabase();
    await createTables();
    await seedData();
    
    console.log('🎉 База данных успешно инициализирована!');
    console.log('📋 Создан тестовый администратор:');
    console.log('   Email: admin@lawtech.ru');
    console.log('   Пароль: admin123');
    
  } catch (error) {
    console.error('💥 Критическая ошибка при инициализации БД:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  initializeDatabase();
}

module.exports = {
  initializeDatabase,
  createDatabase,
  createTables,
  seedData
};