const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const oldDbPath = path.join(__dirname, 'database.db');
const newDbPath = path.join(__dirname, 'lawtech.db');

function checkOldDatabase() {
  console.log('🔍 Проверяем старую базу данных (database.db)...');
  
  const oldDb = new sqlite3.Database(oldDbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к старой базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к старой базе данных установлено');
  });

  // Проверяем договоры в старой базе данных
  oldDb.all("SELECT * FROM legal_documents", (err, oldContracts) => {
    if (err) {
      console.error('❌ Ошибка получения договоров из старой БД:', err.message);
      oldDb.close();
      return;
    }
    
    console.log(`\n📋 Договоров в старой базе данных: ${oldContracts.length}`);
    
    if (oldContracts.length > 0) {
      console.log('\n📄 Договоры в старой базе данных:');
      oldContracts.forEach((contract, index) => {
        console.log(`  ${index + 1}. ID: ${contract.id}`);
        console.log(`     Название: "${contract.title}"`);
        console.log(`     Категория: ${contract.category || 'не указана'}`);
        console.log(`     ---`);
      });
    }
    
    oldDb.close((err) => {
      if (err) {
        console.error('❌ Ошибка закрытия старой базы данных:', err.message);
      } else {
        console.log('\n✅ Проверка старой базы данных завершена');
      }
      
      // Теперь проверяем новую базу данных
      console.log('\n🔍 Проверяем новую базу данных (lawtech.db)...');
      
      const newDb = new sqlite3.Database(newDbPath, (err) => {
        if (err) {
          console.error('❌ Ошибка подключения к новой базе данных:', err.message);
          return;
        }
        console.log('✅ Подключение к новой базе данных установлено');
      });

      // Проверяем договоры в новой базе данных
      newDb.all("SELECT * FROM legal_documents", (err, newContracts) => {
        if (err) {
          console.error('❌ Ошибка получения договоров из новой БД:', err.message);
        } else {
          console.log(`\n📋 Договоров в новой базе данных: ${newContracts.length}`);
          
          if (newContracts.length > 0) {
            console.log('\n📄 Договоры в новой базе данных:');
            newContracts.forEach((contract, index) => {
              console.log(`  ${index + 1}. ID: ${contract.id}`);
              console.log(`     Название: "${contract.title}"`);
              console.log(`     Категория: ${contract.category || 'не указана'}`);
              console.log(`     ---`);
            });
          }
        }
        
        newDb.close((err) => {
          if (err) {
            console.error('❌ Ошибка закрытия новой базы данных:', err.message);
          } else {
            console.log('\n✅ Проверка новой базы данных завершена');
            
            // Выводим заключение
            console.log('\n📊 ЗАКЛЮЧЕНИЕ:');
            console.log(`   - Старая БД (database.db): ${oldContracts.length} договоров`);
            console.log(`   - Новая БД (lawtech.db): ${newContracts ? newContracts.length : 0} договоров`);
            
            if (oldContracts.length > 0 && (!newContracts || newContracts.length === 0)) {
              console.log('\n💡 РЕКОМЕНДАЦИЯ: Договоры находятся в старой базе данных.');
              console.log('   Поскольку в новой системе офисов нет прямой связи договоров с офисами,');
              console.log('   можно просто удалить все договоры из старой базы данных.');
            }
          }
        });
      });
    });
  });
}

// Запускаем проверку
checkOldDatabase();