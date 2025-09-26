const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

console.log('🔍 Проверяем таблицы в базе данных...\n');

db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, rows) => {
  if (err) {
    console.error('❌ Ошибка при получении таблиц:', err);
  } else {
    console.log('📊 Таблицы в базе данных:');
    rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });
    
    // Проверяем есть ли таблица contracts
    const hasContracts = rows.some(table => table.name === 'contracts');
    console.log(`\n📋 Таблица contracts: ${hasContracts ? '✅ Существует' : '❌ Не найдена'}`);
    
    if (hasContracts) {
      // Если таблица есть, проверяем её структуру
      db.all(`PRAGMA table_info(contracts)`, (err, columns) => {
        if (err) {
          console.error('❌ Ошибка при получении структуры таблицы contracts:', err);
        } else {
          console.log('\n📋 Структура таблицы contracts:');
          columns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
          });
          
          // Проверяем количество записей
          db.get(`SELECT COUNT(*) as count FROM contracts`, (err, result) => {
            if (err) {
              console.error('❌ Ошибка при подсчете записей:', err);
            } else {
              console.log(`\n📊 Количество записей в contracts: ${result.count}`);
            }
            db.close();
          });
        }
      });
    } else {
      db.close();
    }
  }
});