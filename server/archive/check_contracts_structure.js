const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');

function checkContractsStructure() {
  console.log('🔍 Проверяем структуру таблицы договоров...');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к базе данных установлено');
  });

  // Проверяем все таблицы в базе данных
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Ошибка получения списка таблиц:', err.message);
      db.close();
      return;
    }
    
    console.log('\n📋 Все таблицы в базе данных:');
    tables.forEach(table => console.log(`  - ${table.name}`));
    
    // Проверяем структуру таблицы legal_documents
    db.all("PRAGMA table_info(legal_documents)", (err, columns) => {
      if (err) {
        console.error('❌ Ошибка получения структуры таблицы legal_documents:', err.message);
      } else if (columns.length === 0) {
        console.log('❌ Таблица legal_documents не найдена');
      } else {
        console.log('\n📋 Структура таблицы legal_documents:');
        columns.forEach(col => {
          console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Проверяем содержимое таблицы legal_documents
        db.all("SELECT * FROM legal_documents LIMIT 5", (err, contracts) => {
          if (err) {
            console.error('❌ Ошибка получения договоров:', err.message);
          } else {
            console.log(`\n📋 Найдено договоров: ${contracts.length}`);
            if (contracts.length > 0) {
              console.log('\n📄 Примеры договоров:');
              contracts.forEach((contract, index) => {
                console.log(`  ${index + 1}. ID: ${contract.id}`);
                console.log(`     Название: "${contract.title}"`);
                console.log(`     Категория: ${contract.category || 'не указана'}`);
                console.log(`     Дата создания: ${contract.created_at}`);
                
                // Проверяем есть ли поля связанные с офисами
                if (contract.office_id) {
                  console.log(`     Офис ID: ${contract.office_id}`);
                }
                if (contract.user_id) {
                  console.log(`     Пользователь ID: ${contract.user_id}`);
                }
                console.log('     ---');
              });
            }
          }
          
          // Проверяем структуру таблицы users для понимания связи
          db.all("PRAGMA table_info(users)", (err, userColumns) => {
            if (err) {
              console.error('❌ Ошибка получения структуры таблицы users:', err.message);
            } else if (userColumns.length > 0) {
              console.log('\n📋 Структура таблицы users:');
              userColumns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
              });
              
              // Проверяем пользователей связанных с офисом ID 1
              db.all("SELECT * FROM users WHERE office_id = 1", (err, users) => {
                if (err) {
                  console.error('❌ Ошибка получения пользователей офиса:', err.message);
                } else {
                  console.log(`\n👥 Пользователи офиса "Тестовый офис LawTech" (ID: 1): ${users.length}`);
                  users.forEach(user => {
                    console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
                  });
                }
                
                db.close((err) => {
                  if (err) {
                    console.error('❌ Ошибка закрытия базы данных:', err.message);
                  } else {
                    console.log('\n✅ Проверка завершена');
                  }
                });
              });
            } else {
              db.close((err) => {
                if (err) {
                  console.error('❌ Ошибка закрытия базы данных:', err.message);
                } else {
                  console.log('\n✅ Проверка завершена');
                }
              });
            }
          });
        });
      }
    });
  });
}

// Запускаем проверку
checkContractsStructure();