const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');

function checkOffices() {
  console.log('🔍 Проверяем таблицу офисов...');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к базе данных установлено');
  });

  // Проверяем существование таблицы offices
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='offices'", (err, tables) => {
    if (err) {
      console.error('❌ Ошибка проверки таблицы offices:', err.message);
      db.close();
      return;
    }
    
    if (tables.length === 0) {
      console.log('❌ Таблица offices не найдена в базе данных');
      
      // Проверим, может быть есть другие таблицы связанные с офисами
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, allTables) => {
        if (!err) {
          console.log('\n📋 Все таблицы в базе данных:');
          allTables.forEach(table => console.log(`  - ${table.name}`));
        }
        db.close();
      });
      return;
    }
    
    console.log('✅ Таблица offices найдена');
    
    // Получаем все офисы
    db.all("SELECT * FROM offices", (err, offices) => {
      if (err) {
        console.error('❌ Ошибка получения офисов:', err.message);
        db.close();
        return;
      }
      
      console.log(`\n📋 Найдено офисов: ${offices.length}`);
      
      if (offices.length === 0) {
        console.log('📭 Офисов в базе данных нет');
      } else {
        console.log('\n🏢 Список офисов:');
        offices.forEach(office => {
          console.log(`  - ID: ${office.id}`);
          console.log(`    Название: "${office.name}"`);
          console.log(`    Адрес: ${office.address || 'не указан'}`);
          console.log(`    Телефон: ${office.contact_phone || 'не указан'}`);
          console.log('    ---');
        });
        
        // Ищем офис с названием содержащим "тестовый" или "lawtech"
        const targetOffice = offices.find(office => 
          office.name && (
            office.name.toLowerCase().includes('тестовый') ||
            office.name.toLowerCase().includes('lawtech') ||
            office.name.toLowerCase().includes('test')
          )
        );
        
        if (targetOffice) {
          console.log(`\n🎯 Найден целевой офис:`);
          console.log(`   ID: ${targetOffice.id}`);
          console.log(`   Название: "${targetOffice.name}"`);
        } else {
          console.log('\n❌ Офис с названием содержащим "тестовый" или "lawtech" не найден');
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
checkOffices();