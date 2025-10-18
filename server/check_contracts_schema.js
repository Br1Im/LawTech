const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключение к базе данных
const dbPath = path.join(__dirname, 'database', 'lawtech.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка структуры таблицы contracts...');

db.all("PRAGMA table_info(contracts)", (err, columns) => {
  if (err) {
    console.error('❌ Ошибка при получении структуры таблицы:', err);
  } else {
    console.log('📋 Структура таблицы contracts:');
    columns.forEach(column => {
      console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
  }
  
  db.close();
});