const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Конфигурация подключения к PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lawtech_db',
  ssl: false // отключаем SSL для локальной разработки
};

// Конфигурация подключения без указания БД для создания БД
const dbConfigWithoutDB = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres', // подключаемся к системной БД postgres
  ssl: false // отключаем SSL для локальной разработки
};

/**
 * Создание базы данных если она не существует
 */
async function createDatabase() {
  let pool;
  try {
    console.log('🔍 Проверка существования базы данных...');
    pool = new Pool(dbConfigWithoutDB);
    
    // Проверяем существование БД
    const checkResult = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbConfig.database]
    );
    
    if (checkResult.rows.length === 0) {
      // Создаем БД если не существует
      await pool.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`✅ База данных '${dbConfig.database}' создана`);
    } else {
      console.log(`✅ База данных '${dbConfig.database}' уже существует`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при создании базы данных:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Создание всех необходимых таблиц
 */
async function createTables() {
  let pool;
  try {
    console.log('🔧 Создание таблиц...');
    pool = new Pool(dbConfig);

    // Таблица офисов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        contact_phone VARCHAR(50),
        website VARCHAR(255),
        revenue DECIMAL(15,2) DEFAULT 0.00,
        orders INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица offices создана');

    // Создаем тип ENUM для ролей пользователей
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Таблица пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'employee',
        office_id INTEGER,
        last_active TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Таблица users создана');

    // Таблица сотрудников
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        office_id INTEGER,
        salary DECIMAL(10,2),
        hire_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Таблица employees создана');

    // Таблица клиентов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        office_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Таблица clients создана');

    // Создаем тип ENUM для статуса контрактов
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE contract_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Таблица контрактов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        client_id INTEGER,
        office_id INTEGER,
        amount DECIMAL(15,2),
        status contract_status DEFAULT 'draft',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Таблица contracts создана');

    // Создаем тип ENUM для периодов статистики
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE period_type AS ENUM ('day', 'week', 'month', 'year');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Таблица статистики офисов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS office_stats (
        id SERIAL PRIMARY KEY,
        office_id INTEGER NOT NULL,
        period_type period_type NOT NULL,
        revenue DECIMAL(15,2) DEFAULT 0.00,
        orders INTEGER DEFAULT 0,
        clients INTEGER DEFAULT 0,
        employees INTEGER DEFAULT 0,
        expenses DECIMAL(15,2) DEFAULT 0.00,
        documents INTEGER DEFAULT 0,
        visits INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (office_id, period_type),
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Таблица office_stats создана');

    // Таблица календарных событий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        participants TEXT,
        location VARCHAR(255),
        created_by INTEGER NOT NULL,
        office_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Таблица calendar_events создана');

    // Таблица сообщений
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        sender VARCHAR(255) NOT NULL,
        office_id INTEGER NOT NULL,
        user_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Таблица messages создана');

    // Таблица юридических документов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        embedding TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица legal_documents создана');

    // Создаем функцию для автоматического обновления updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Создаем триггеры для автоматического обновления updated_at
    const tables = ['offices', 'users', 'employees', 'clients', 'contracts', 'office_stats', 'calendar_events', 'legal_documents'];
    for (const table of tables) {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('✅ Триггеры для updated_at созданы');

  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Создание тестовых данных
 */
async function seedData() {
  let pool;
  try {
    console.log('🌱 Создание тестовых данных...');
    pool = new Pool(dbConfig);

    // Проверяем, есть ли уже данные
    const existingOffices = await pool.query('SELECT COUNT(*) as count FROM offices');
    if (parseInt(existingOffices.rows[0].count) > 0) {
      console.log('ℹ️ Тестовые данные уже существуют, пропускаем создание');
      return;
    }

    // Создаем тестовые офисы
    await pool.query(`
      INSERT INTO offices (name, address, contact_phone, website, revenue, orders) VALUES
      ('Главный офис', 'г. Москва, ул. Тверская, д. 1', '+7 (495) 123-45-67', 'https://lawtech.ru', 1500000.00, 45),
      ('Филиал СПб', 'г. Санкт-Петербург, Невский пр., д. 28', '+7 (812) 987-65-43', 'https://spb.lawtech.ru', 850000.00, 28),
      ('Филиал Екатеринбург', 'г. Екатеринбург, ул. Ленина, д. 15', '+7 (343) 555-12-34', 'https://ekb.lawtech.ru', 620000.00, 19)
    `);
    console.log('✅ Тестовые офисы созданы');

    // Создаем тестового администратора
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (username, email, password, role, office_id) VALUES
      ('admin', 'admin@lawtech.ru', $1, 'admin', 1)
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
        
        await pool.query(`
          INSERT INTO office_stats (office_id, period_type, revenue, orders, clients, employees, expenses, documents, visits)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [officeId, period, revenue, orders, clients, employees, revenue * 0.7, orders * 2, orders * 3]);
      }
    }
    console.log('✅ Тестовая статистика создана');

  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Основная функция инициализации
 */
async function initializeDatabase() {
  try {
    console.log('🚀 Начинаем инициализацию PostgreSQL базы данных...');
    
    await createDatabase();
    await createTables();
    await seedData();
    
    console.log('🎉 PostgreSQL база данных успешно инициализирована!');
    console.log('📋 Создан тестовый администратор:');
    console.log('   Email: admin@lawtech.ru');
    console.log('   Пароль: admin123');
    
  } catch (error) {
    console.error('💥 Критическая ошибка при инициализации PostgreSQL БД:', error.message);
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