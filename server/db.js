const mysql = require('mysql2/promise');
require('dotenv').config();

// Конфигурация подключения к MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lawtech_crm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('🔧 Конфигурация MySQL:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

// Создаем пул соединений
let pool = null;

// Функция для создания пула соединений
function createPool() {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
      console.log('✅ Пул соединений MySQL создан');
    }
    return pool;
  } catch (err) {
    console.error('❌ Ошибка создания пула MySQL:', err.message);
    throw err;
  }
}

// Инициализация пула
createPool();
console.log('Инициализация подключения к базе данных MySQL');

module.exports = {
  query: async (sql, params = []) => {
    try {
      if (!pool) {
        createPool();
      }
      
      console.log('Выполнение запроса:', sql.substring(0, 80) + '...', params);
      
      const [rows] = await pool.execute(sql, params);
      return [rows];
    } catch (err) {
      console.error('❌ Ошибка выполнения запроса:', err.message);
      console.error('Запрос:', sql);
      console.error('Параметры:', params);
      throw err;
    }
  },
  
  // Метод для закрытия пула соединений
  close: async () => {
    try {
      if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Пул соединений MySQL закрыт');
      }
    } catch (err) {
      console.error('❌ Ошибка при закрытии пула MySQL:', err.message);
      throw err;
    }
  },
  
  // Метод для получения соединения из пула
  getClient: async () => {
    try {
      if (!pool) {
        createPool();
      }
      const connection = await pool.getConnection();
      return {
        query: async (sql, params = []) => {
          const [rows] = await connection.execute(sql, params);
          return [rows];
        },
        release: () => connection.release(),
        end: () => connection.release()
      };
    } catch (err) {
      console.error('❌ Ошибка получения соединения из пула:', err.message);
      throw err;
    }
  },
  
  // Прямой доступ к пулу (для совместимости)
  pool: () => pool
};
