const { Pool } = require('pg');
require('dotenv').config();

// Конфигурация подключения к PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lawtech_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // максимальное количество соединений в пуле
  idleTimeoutMillis: 30000, // время ожидания перед закрытием неактивного соединения
  connectionTimeoutMillis: 2000, // время ожидания подключения
};

let pool = null;

// Создание пула соединений
function createPool() {
  if (!pool) {
    pool = new Pool(dbConfig);
    
    pool.on('connect', () => {
      console.log('✅ Новое соединение с PostgreSQL установлено');
    });

    pool.on('error', (err) => {
      console.error('❌ Ошибка пула соединений PostgreSQL:', err);
    });

    console.log('✅ Пул соединений PostgreSQL создан');
  }
  return pool;
}

// Выполнение запроса
async function query(text, params = []) {
  try {
    const client = createPool();
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    console.log(`🔍 Запрос выполнен за ${duration}ms:`, text.substring(0, 50) + '...');
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка выполнения запроса PostgreSQL:', error.message);
    console.error('📝 Запрос:', text);
    console.error('📝 Параметры:', params);
    throw error;
  }
}

// Получение клиента для транзакций
async function getClient() {
  try {
    const client = createPool();
    return await client.connect();
  } catch (error) {
    console.error('❌ Ошибка получения клиента PostgreSQL:', error.message);
    throw error;
  }
}

// Проверка подключения
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Подключение к PostgreSQL работает:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
    return false;
  }
}

// Закрытие всех соединений
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Пул соединений PostgreSQL закрыт');
  }
}

// Обработка завершения процесса
process.on('SIGINT', async () => {
  console.log('🔄 Получен сигнал SIGINT, закрываем соединения...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Получен сигнал SIGTERM, закрываем соединения...');
  await closePool();
  process.exit(0);
});

module.exports = {
  query,
  getClient,
  testConnection,
  closePool,
  createPool
};