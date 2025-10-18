const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'lawtech.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка всех таблиц в базе данных...');

// Получаем список всех таблиц
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
  if (err) {
    console.error('❌ Ошибка при получении списка таблиц:', err);
    db.close();
    return;
  }

  console.log(`\n📋 Найдено таблиц: ${tables.length}`);
  
  if (tables.length === 0) {
    console.log('❌ Таблицы не найдены');
    db.close();
    return;
  }

  tables.forEach((table, index) => {
    console.log(`${index + 1}. ${table.name}`);
  });

  // Ищем таблицы, связанные с договорами
  const contractTables = tables.filter(table => 
    table.name.toLowerCase().includes('contract') || 
    table.name.toLowerCase().includes('client') ||
    table.name.toLowerCase().includes('deal')
  );

  if (contractTables.length > 0) {
    console.log('\n🔍 Таблицы, связанные с договорами/клиентами:');
    contractTables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
  }

  db.close();
});