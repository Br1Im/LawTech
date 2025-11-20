const db = require('../db');

/**
 * Скрипт для проверки структуры базы данных
 * 
 * Использование:
 * node server/scripts/check_database.js
 */

async function checkDatabase() {
  try {
    console.log('🔍 Проверка структуры базы данных...\n');

    const dbName = process.env.DB_NAME || 'lawtech_crm';
    console.log(`📊 База данных: ${dbName}\n`);

    // Список ожидаемых таблиц
    const expectedTables = [
      'offices',
      'users',
      'clients',
      'employees',
      'contracts',
      'calendar_events',
      'office_stats',
      'employee_stats',
      'legal_documents'
    ];

    // Получаем список существующих таблиц
    const [tables] = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ?
       ORDER BY table_name`,
      [dbName]
    );

    const existingTables = tables.map(t => t.table_name || t.TABLE_NAME);

    console.log('📋 Проверка таблиц:\n');

    let allTablesExist = true;
    for (const tableName of expectedTables) {
      const exists = existingTables.includes(tableName);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${tableName}`);
      
      if (!exists) {
        allTablesExist = false;
      }
    }

    if (!allTablesExist) {
      console.log('\n⚠️  Некоторые таблицы отсутствуют!');
      console.log('Запустите: node server/scripts/reset_database.js\n');
      process.exit(1);
    }

    console.log('\n✅ Все таблицы существуют\n');

    // Проверка структуры ключевых таблиц
    console.log('🔍 Проверка структуры таблиц:\n');

    // Проверка calendar_events
    console.log('📅 calendar_events:');
    const [calendarColumns] = await db.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'calendar_events'
       ORDER BY ordinal_position`,
      [dbName]
    );

    const requiredCalendarColumns = ['id', 'title', 'start_date', 'time', 'type', 'office_id'];
    for (const col of requiredCalendarColumns) {
      const exists = calendarColumns.some(c => 
        (c.column_name || c.COLUMN_NAME) === col
      );
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    }

    // Проверка contracts
    console.log('\n📝 contracts:');
    const [contractColumns] = await db.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'contracts'
       ORDER BY ordinal_position`,
      [dbName]
    );

    const requiredContractColumns = ['id', 'id_client', 'id_employee', 'contract_date', 'amount', 'paid_amount', 'status'];
    for (const col of requiredContractColumns) {
      const exists = contractColumns.some(c => 
        (c.column_name || c.COLUMN_NAME) === col
      );
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    }

    // Проверка office_stats
    console.log('\n📊 office_stats:');
    const [officeStatsColumns] = await db.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'office_stats'
       ORDER BY ordinal_position`,
      [dbName]
    );

    const requiredOfficeStatsColumns = ['id', 'office_id', 'period_type', 'period_value', 'revenue', 'orders'];
    for (const col of requiredOfficeStatsColumns) {
      const exists = officeStatsColumns.some(c => 
        (c.column_name || c.COLUMN_NAME) === col
      );
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    }

    // Проверка employee_stats
    console.log('\n👥 employee_stats:');
    const [employeeStatsColumns] = await db.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employee_stats'
       ORDER BY ordinal_position`,
      [dbName]
    );

    const requiredEmployeeStatsColumns = ['id', 'employee_id', 'period_type', 'period_value', 'revenue', 'orders'];
    for (const col of requiredEmployeeStatsColumns) {
      const exists = employeeStatsColumns.some(c => 
        (c.column_name || c.COLUMN_NAME) === col
      );
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    }

    // Проверка индексов
    console.log('\n🔑 Проверка индексов:\n');
    const [indexes] = await db.query(
      `SELECT DISTINCT table_name, index_name 
       FROM information_schema.statistics 
       WHERE table_schema = ? AND index_name != 'PRIMARY'
       ORDER BY table_name, index_name`,
      [dbName]
    );

    const indexesByTable = {};
    indexes.forEach(idx => {
      const tableName = idx.table_name || idx.TABLE_NAME;
      const indexName = idx.index_name || idx.INDEX_NAME;
      if (!indexesByTable[tableName]) {
        indexesByTable[tableName] = [];
      }
      indexesByTable[tableName].push(indexName);
    });

    Object.keys(indexesByTable).sort().forEach(tableName => {
      console.log(`  ${tableName}:`);
      indexesByTable[tableName].forEach(indexName => {
        console.log(`    - ${indexName}`);
      });
    });

    // Проверка данных
    console.log('\n📊 Статистика данных:\n');
    
    for (const tableName of expectedTables) {
      const [count] = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = count[0].count || count[0].COUNT;
      console.log(`  ${tableName.padEnd(20)} ${rowCount} строк`);
    }

    console.log('\n========================================');
    console.log('✅ Проверка завершена успешно!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка при проверке базы данных:', error);
    console.error('Детали:', error.message);
    process.exit(1);
  }
}

// Запуск
checkDatabase();
