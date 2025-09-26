const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');

function checkDatabaseStructure() {
  console.log('🔍 Проверяем структуру базы данных...');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к базе данных установлено');
  });

  // Получаем список всех таблиц
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Ошибка получения списка таблиц:', err.message);
      return;
    }
    
    console.log('\n📋 Таблицы в базе данных:');
    tables.forEach(table => console.log(`  - ${table.name}`));
    
    let processedTables = 0;
    const totalTables = tables.length;
    
    // Для каждой таблицы получаем структуру
    tables.forEach(table => {
      db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
        if (err) {
          console.error(`❌ Ошибка получения структуры таблицы ${table.name}:`, err.message);
        } else {
          console.log(`\n🏗️  Структура таблицы "${table.name}":`);
          columns.forEach(col => {
            console.log(`  - ${col.name}: ${col.type}${col.pk ? ' (PRIMARY KEY)' : ''}${col.notnull ? ' NOT NULL' : ''}`);
          });
        }
        
        processedTables++;
        if (processedTables === totalTables) {
          // Проверяем содержимое ключевых таблиц
          checkTableContents(db);
        }
      });
    });
  });
}

function checkTableContents(db) {
  console.log('\n📊 Проверяем содержимое ключевых таблиц...');
  
  // Проверяем офисы
  db.all("SELECT * FROM offices LIMIT 10", (err, offices) => {
    if (err) {
      console.log('⚠️  Таблица offices не найдена или пуста');
    } else {
      console.log('\n🏢 Офисы:');
      offices.forEach(office => {
        console.log(`  - ID: ${office.id}, Название: "${office.name}"`);
      });
    }
    
    // Проверяем договоры
    db.all("SELECT id, title, category, office_id FROM legal_documents LIMIT 10", (err, documents) => {
      if (err) {
        console.log('⚠️  Ошибка при получении договоров:', err.message);
      } else {
        console.log('\n📄 Договоры:');
        if (documents.length === 0) {
          console.log('  - Договоров не найдено');
        } else {
          documents.forEach(doc => {
            console.log(`  - ID: ${doc.id}, Название: "${doc.title}", Категория: ${doc.category}, Office ID: ${doc.office_id || 'не указан'}`);
          });
        }
      }
      
      db.close((err) => {
        if (err) {
          console.error('❌ Ошибка закрытия базы данных:', err.message);
        } else {
          console.log('\n✅ Проверка завершена');
        }
      });
    });
  });
}

// Запускаем проверку
checkDatabaseStructure();