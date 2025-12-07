const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Исправить все проблемы с базой данных
 */
async function fixDatabase() {
  let connection;
  
  try {
    console.log('🔧 Исправление структуры базы данных...\n');
    
    // Подключение к базе данных
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm'
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // 1. Добавляем period_value в office_stats
    console.log('📝 Проверка колонки period_value в office_stats...');
    const [periodValueCheck] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'office_stats' 
       AND column_name = 'period_value'`
    );
    
    if (periodValueCheck[0].count === 0) {
      console.log('   Добавление колонки period_value...');
      await connection.query(
        `ALTER TABLE office_stats 
         ADD COLUMN period_value VARCHAR(50) NOT NULL DEFAULT '' 
         AFTER period_type`
      );
      console.log('   ✅ Колонка period_value добавлена');
    } else {
      console.log('   ✅ Колонка period_value уже существует');
    }
    
    // 2. Добавляем paid_amount в contracts
    console.log('\n📝 Проверка колонки paid_amount в contracts...');
    const [paidAmountCheck] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'contracts' 
       AND column_name = 'paid_amount'`
    );
    
    if (paidAmountCheck[0].count === 0) {
      console.log('   Добавление колонки paid_amount...');
      await connection.query(
        `ALTER TABLE contracts 
         ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0.00 
         AFTER amount`
      );
      console.log('   ✅ Колонка paid_amount добавлена');
      
      // Обновляем существующие записи
      console.log('   Обновление существующих записей...');
      await connection.query(
        `UPDATE contracts SET paid_amount = amount WHERE paid_amount = 0`
      );
      console.log('   ✅ Записи обновлены');
    } else {
      console.log('   ✅ Колонка paid_amount уже существует');
    }
    
    // 3. Проверяем структуру office_stats
    console.log('\n🔍 Финальная структура таблицы office_stats:');
    const [officeStatsColumns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'office_stats'
       ORDER BY ORDINAL_POSITION`
    );
    
    officeStatsColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 4. Проверяем структуру contracts
    console.log('\n🔍 Финальная структура таблицы contracts:');
    const [contractsColumns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'contracts'
       ORDER BY ORDINAL_POSITION`
    );
    
    contractsColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 5. Проверяем данные
    const [officeStatsCount] = await connection.query('SELECT COUNT(*) as count FROM office_stats');
    const [contractsCount] = await connection.query('SELECT COUNT(*) as count FROM contracts');
    
    console.log(`\n📊 Статистика:`);
    console.log(`   - Записей в office_stats: ${officeStatsCount[0].count}`);
    console.log(`   - Записей в contracts: ${contractsCount[0].count}`);
    
    if (officeStatsCount[0].count === 0 && contractsCount[0].count > 0) {
      console.log('\n⚠️  Таблица office_stats пустая, но есть договоры.');
      console.log('   Запустите пересчет статистики:');
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
fixDatabase();
