const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Проверить наличие всех необходимых таблиц
 */
async function checkTables() {
  let connection;
  
  try {
    console.log('🔍 Проверка таблиц базы данных...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm'
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // Список необходимых таблиц
    const requiredTables = [
      'users',
      'offices',
      'employees',
      'clients',
      'contracts',
      'office_stats',
      'employee_stats',
      'calendar_events'
    ];
    
    // Проверяем каждую таблицу
    for (const tableName of requiredTables) {
      const [tables] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = ?`,
        [tableName]
      );
      
      if (tables[0].count > 0) {
        console.log(`✅ ${tableName}`);
        
        // Показываем количество записей
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   Записей: ${count[0].count}`);
      } else {
        console.log(`❌ ${tableName} - ОТСУТСТВУЕТ!`);
      }
    }
    
    // Проверяем структуру contracts
    console.log('\n🔍 Проверка структуры таблицы contracts:');
    const [contractColumns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'contracts'
       ORDER BY ORDINAL_POSITION`
    );
    
    contractColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n✅ Проверка завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();
