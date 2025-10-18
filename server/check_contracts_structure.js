const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверка структуры таблицы contracts...');

// Проверяем существование таблицы
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'", (err, tables) => {
  if (err) {
    console.error('❌ Ошибка при проверке таблицы:', err);
    db.close();
    return;
  }

  if (tables.length === 0) {
    console.log('❌ Таблица contracts не существует');
    db.close();
    return;
  }

  console.log('✅ Таблица contracts существует');

  // Получаем структуру таблицы
  db.all("PRAGMA table_info(contracts)", (err, columns) => {
    if (err) {
      console.error('❌ Ошибка при получении структуры таблицы:', err);
      db.close();
      return;
    }

    console.log('\n📋 Структура таблицы contracts:');
    columns.forEach(column => {
      console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });

    // Проверяем количество записей
    db.get("SELECT COUNT(*) as count FROM contracts", (err, result) => {
      if (err) {
        console.error('❌ Ошибка при подсчете записей:', err);
      } else {
        console.log(`\n📊 Количество записей в таблице: ${result.count}`);
      }

      // Показываем первую запись если есть
      if (result && result.count > 0) {
        db.get("SELECT * FROM contracts LIMIT 1", (err, row) => {
          if (err) {
            console.error('❌ Ошибка при получении записи:', err);
          } else {
            console.log('\n📄 Пример записи:');
            console.log(JSON.stringify(row, null, 2));
          }
          db.close();
        });
      } else {
        db.close();
      }
    });
  });
});