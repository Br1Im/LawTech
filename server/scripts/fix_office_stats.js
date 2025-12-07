const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Исправить структуру таблицы office_stats
 */
async function fixOfficeStats() {
  let connection;
  
  try {
    console.log('🔧 Исправление структуры таблицы office_stats...\n');
    
    // Подключение к базе данных
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm'
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // Проверяем, существует ли колонка period_value
    const [columns] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'office_stats' 
       AND column_name = 'period_value'`
    );
    
    if (columns[0].count > 0) {
      console.log('✅ Колонка period_value уже существует');
    } else {
      console.log('📝 Добавление колонки period_value...');
      await connection.query(
        `ALTER TABLE office_stats 
         ADD COLUMN period_value VARCHAR(50) NOT NULL DEFAULT '' 
         AFTER period_type`
      );
      console.log('✅ Колонка period_value добавлена');
    }
    
    // Проверяем финальную структуру
    console.log('\n🔍 Проверка структуры таблицы office_stats:');
    const [finalColumns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'office_stats'
       ORDER BY ORDINAL_POSITION`
    );
    
    finalColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Проверяем данные
    const [stats] = await connection.query('SELECT COUNT(*) as count FROM office_stats');
    console.log(`\n📈 Записей в office_stats: ${stats[0].count}`);
    
    if (stats[0].count === 0) {
      console.log('\n⚠️  Таблица пустая. Запустите скрипт пересчета статистики:');
      console.log('   docker-compose exec backend node scripts/recalculate_stats.js');
    }
    
    console.log('\n✅ Исправление завершено успешно!');
    
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

// Запускаем исправление
fixOfficeStats();
