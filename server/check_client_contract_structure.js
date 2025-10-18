const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'lawtech.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 Анализ структуры таблиц clients и contracts\n');

// Проверяем структуру таблицы clients
console.log('📋 Структура таблицы clients:');
db.all('PRAGMA table_info(clients)', (err, clientsInfo) => {
  if (err) {
    console.error('❌ Ошибка при получении структуры clients:', err);
  } else {
    clientsInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  }
  
  // Проверяем структуру таблицы contracts
  console.log('\n📋 Структура таблицы contracts:');
  db.all('PRAGMA table_info(contracts)', (err, contractsInfo) => {
    if (err) {
      console.error('❌ Ошибка при получении структуры contracts:', err);
    } else {
      contractsInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    // Проверяем текущие данные
    console.log('\n📊 Текущие данные:');
    db.all('SELECT COUNT(*) as count FROM clients', (err, clientCount) => {
      if (!err) {
        console.log(`👥 Клиентов: ${clientCount[0].count}`);
      }
      
      db.all('SELECT COUNT(*) as count FROM contracts', (err, contractCount) => {
        if (!err) {
          console.log(`📄 Договоров: ${contractCount[0].count}`);
        }
        
        // Проверяем связь между клиентами и договорами
        console.log('\n🔗 Анализ связей:');
        db.all(`
          SELECT 
            c.client_name,
            COUNT(*) as contract_count
          FROM contracts c
          GROUP BY c.client_name
          ORDER BY contract_count DESC
        `, (err, relations) => {
          if (!err && relations.length > 0) {
            console.log('📊 Клиенты и их договоры:');
            relations.forEach(rel => {
              console.log(`  - ${rel.client_name}: ${rel.contract_count} договор(ов)`);
            });
          } else {
            console.log('❌ Нет данных о связях клиентов и договоров');
          }
          
          // Проверяем есть ли клиенты без договоров
          db.all(`
            SELECT cl.* FROM clients cl
            LEFT JOIN contracts co ON cl.id = co.client_id
            WHERE co.client_id IS NULL
          `, (err, orphanClients) => {
            if (!err) {
              if (orphanClients.length > 0) {
                console.log(`\n⚠️  Найдено клиентов без договоров: ${orphanClients.length}`);
                orphanClients.forEach(client => {
                  console.log(`  - ID: ${client.id}, Имя: ${client.first_name} ${client.last_name}, Компания: ${client.company}`);
                });
              } else {
                console.log('\n✅ Все клиенты имеют договоры');
              }
            }
            
            db.close();
          });
        });
      });
    });
  });
});