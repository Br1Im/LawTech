// Скрипт ожидания готовности базы данных

const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test'
};

const maxRetries = 30;
const retryDelay = 2000; // 2 секунды

async function waitForDatabase() {
  console.log('⏳ Ожидание готовности базы данных...');
  console.log(`📍 Подключение к: ${config.host}:${config.port}/${config.database}`);
  
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const connection = await mysql.createConnection(config);
      await connection.query('SELECT 1');
      await connection.end();
      
      console.log(`✅ База данных готова! (попытка ${i}/${maxRetries})`);
      return true;
    } catch (error) {
      console.log(`⏳ Попытка ${i}/${maxRetries} не удалась: ${error.code || error.message}`);
      
      if (i === maxRetries) {
        console.error('❌ Не удалось подключиться к базе данных после', maxRetries, 'попыток');
        process.exit(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

waitForDatabase();
