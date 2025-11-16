const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lawtech',
    multipleStatements: true
  });

  try {
    console.log('Подключение к базе данных...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/002_add_period_value_to_office_stats.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    console.log('Применение миграции...');
    await connection.query(sql);
    
    console.log('✅ Миграция успешно применена!');
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration();
