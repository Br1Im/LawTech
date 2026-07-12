const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lawtech_crm',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 10,
  idleTimeout: 60000,
};

let pool = null;

function createPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('DB pool created:', dbConfig.host, dbConfig.database);
  }
  return pool;
}

createPool();

module.exports = {
  query: async (sql, params = []) => {
    if (!pool) createPool();
    const [rows] = await pool.query(sql, params);
    return [rows];
  },

  close: async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },

  getClient: async () => {
    if (!pool) createPool();
    const connection = await pool.getConnection();
    return {
      query: async (sql, params = []) => {
        const [rows] = await connection.query(sql, params);
        return [rows];
      },
      beginTransaction: () => connection.beginTransaction(),
      commit: () => connection.commit(),
      rollback: () => connection.rollback(),
      release: () => connection.release(),
      end: () => connection.release()
    };
  },

  pool: () => pool
};
