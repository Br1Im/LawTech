const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');

function testUnifiedDatabase() {
  console.log('🧪 ТЕСТИРОВАНИЕ ЕДИНОЙ БАЗЫ ДАННЫХ');
  console.log('=====================================');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к единой базе данных установлено');
  });

  // Проверяем все таблицы
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
    if (err) {
      console.error('❌ Ошибка получения списка таблиц:', err.message);
      db.close();
      return;
    }

    console.log(`\n📋 Найдено таблиц: ${tables.length}`);
    
    let processedTables = 0;
    const tableStats = {};

    if (tables.length === 0) {
      console.log('⚠️ База данных не содержит таблиц');
      db.close();
      return;
    }

    tables.forEach((table) => {
      const tableName = table.name;
      
      db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
        if (err) {
          console.error(`❌ Ошибка подсчета записей в таблице ${tableName}:`, err.message);
          tableStats[tableName] = { count: 'ERROR', status: '❌' };
        } else {
          const count = result.count;
          tableStats[tableName] = { 
            count: count, 
            status: count > 0 ? '✅' : '⚪' 
          };
        }
        
        processedTables++;
        
        if (processedTables === tables.length) {
          // Выводим результаты
          console.log('\n📊 СТАТИСТИКА ТАБЛИЦ:');
          console.log('=====================================');
          
          Object.keys(tableStats).sort().forEach(tableName => {
            const stats = tableStats[tableName];
            console.log(`${stats.status} ${tableName}: ${stats.count} записей`);
          });

          // Проверяем ключевые таблицы
          console.log('\n🔍 ПРОВЕРКА КЛЮЧЕВЫХ ТАБЛИЦ:');
          console.log('=====================================');
          
          const keyTables = ['offices', 'users', 'legal_documents', 'clients', 'cases'];
          let allKeyTablesExist = true;
          
          keyTables.forEach(tableName => {
            if (tableStats[tableName]) {
              console.log(`✅ ${tableName} - существует (${tableStats[tableName].count} записей)`);
            } else {
              console.log(`❌ ${tableName} - отсутствует`);
              allKeyTablesExist = false;
            }
          });

          // Проверяем связи между таблицами
          console.log('\n🔗 ПРОВЕРКА СВЯЗЕЙ:');
          console.log('=====================================');
          
          if (tableStats['offices'] && tableStats['users']) {
            db.all(`
              SELECT o.name as office_name, COUNT(u.id) as user_count 
              FROM offices o 
              LEFT JOIN users u ON o.id = u.office_id 
              GROUP BY o.id, o.name
            `, (err, officeUsers) => {
              if (err) {
                console.error('❌ Ошибка проверки связи офисы-пользователи:', err.message);
              } else {
                console.log('👥 Связь офисы-пользователи:');
                officeUsers.forEach(row => {
                  console.log(`   - ${row.office_name}: ${row.user_count} пользователей`);
                });
              }
              
              // Финальная оценка
              console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:');
              console.log('=====================================');
              
              if (allKeyTablesExist) {
                console.log('✅ Все ключевые таблицы присутствуют');
                console.log('✅ База данных готова к работе');
                console.log('🎉 МИГРАЦИЯ К ЕДИНОЙ БАЗЕ ДАННЫХ ЗАВЕРШЕНА УСПЕШНО!');
              } else {
                console.log('⚠️ Некоторые ключевые таблицы отсутствуют');
                console.log('❌ Требуется дополнительная настройка');
              }
              
              db.close((err) => {
                if (err) {
                  console.error('❌ Ошибка закрытия базы данных:', err.message);
                } else {
                  console.log('\n✅ Тестирование завершено');
                }
              });
            });
          } else {
            console.log('⚠️ Невозможно проверить связи - отсутствуют ключевые таблицы');
            
            console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:');
            console.log('=====================================');
            
            if (allKeyTablesExist) {
              console.log('✅ Все ключевые таблицы присутствуют');
              console.log('✅ База данных готова к работе');
              console.log('🎉 МИГРАЦИЯ К ЕДИНОЙ БАЗЕ ДАННЫХ ЗАВЕРШЕНА УСПЕШНО!');
            } else {
              console.log('⚠️ Некоторые ключевые таблицы отсутствуют');
              console.log('❌ Требуется дополнительная настройка');
            }
            
            db.close();
          }
        }
      });
    });
  });
}

testUnifiedDatabase();