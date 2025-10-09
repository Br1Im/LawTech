const mysql = require('mysql2/promise');
require('dotenv').config();

// Конфигурация подключения к MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'lawtech_user',
  password: process.env.DB_PASSWORD || 'lawtech_password',
  database: process.env.DB_NAME || 'lawtech_db',
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

let connection = null;

// Функция для создания подключения
async function createConnection() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Успешное подключение к базе данных MySQL');
    return connection;
  } catch (err) {
    console.error('❌ Ошибка подключения к базе данных MySQL:', err.message);
    throw err;
  }
}

// Инициализация подключения
createConnection().catch(console.error);

console.log('Инициализация подключения к базе данных MySQL');

module.exports = {
  query: async (sql, params = []) => {
    try {
      if (!connection) {
        await createConnection();
      }
      
      console.log('Выполнение запроса:', sql.substring(0, 50) + '...', params);
      
      const [rows] = await connection.execute(sql, params);
      return [rows];
    } catch (err) {
      console.error('Ошибка выполнения запроса:', err.message);
      
      // Попытка переподключения при ошибке соединения
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Попытка переподключения к базе данных...');
        try {
          await createConnection();
          const [rows] = await connection.execute(sql, params);
          return [rows];
        } catch (reconnectErr) {
          console.error('Ошибка переподключения:', reconnectErr.message);
          throw reconnectErr;
        }
      }
      
      throw err;
    }
  },
  
  // Метод для закрытия соединения
  close: async () => {
    try {
      if (connection) {
        await connection.end();
        connection = null;
        console.log('База данных закрыта');
      }
    } catch (err) {
      console.error('Ошибка при закрытии базы данных:', err.message);
    }
  }
};