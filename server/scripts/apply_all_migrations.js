const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Применить все миграции из папки migrations
 */
async function applyAllMigrations() {
  let connection;
  
  try {
    console.log('🔄 Применение всех миграций...\n');
    
    // Подключение к базе данных
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm',
      multipleStatements: true
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // Читаем все файлы миграций
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Найдено миграций: ${migrationFiles.length}\n`);
    
    // Применяем каждую миграцию
    for (const file of migrationFiles) {
      try {
        console.log(`📄 Применение: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Разбиваем на отдельные запросы
        const queries = sql
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0 && !q.startsWith('--'));
        
        for (const query of queries) {
          if (query) {
            await connection.query(query);
          }
        }
        
        console.log(`   ✅ Успешно применена\n`);
      } catch (error) {
        console.error(`   ⚠️  Ошибка при применении ${file}:`, error.message);
        console.log(`   ℹ️  Продолжаем со следующей миграцией...\n`);
      }
    }
    
    // Проверяем структуру таблицы office_stats
    console.log('🔍 Проверка структуры таблицы office_stats...');
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'office_stats'
       ORDER BY ORDINAL_POSITION`
    );
    
    console.log('\n📊 Структура таблицы office_stats:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Проверяем наличие данных
    const [stats] = await connection.query('SELECT COUNT(*) as count FROM office_stats');
    console.log(`\n📈 Записей в office_stats: ${stats[0].count}`);
    
    console.log('\n✅ Все миграции применены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Соединение с базой данных закрыто');
    }
  }
}

// Запускаем применение миграций
applyAllMigrations();
