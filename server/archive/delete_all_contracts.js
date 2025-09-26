const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');

function deleteAllContracts() {
  console.log('🗑️ Удаляем все договоры из базы данных...');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к базе данных установлено');
  });

  // Сначала проверяем количество договоров
  db.all("SELECT COUNT(*) as count FROM legal_documents", (err, result) => {
    if (err) {
      console.error('❌ Ошибка подсчета договоров:', err.message);
      db.close();
      return;
    }
    
    const contractCount = result[0].count;
    console.log(`📋 Найдено договоров для удаления: ${contractCount}`);
    
    if (contractCount === 0) {
      console.log('✅ Договоров для удаления нет');
      db.close();
      return;
    }
    
    // Показываем какие договоры будут удалены
    db.all("SELECT id, title, category FROM legal_documents", (err, contracts) => {
      if (err) {
        console.error('❌ Ошибка получения списка договоров:', err.message);
        db.close();
        return;
      }
      
      console.log('\n📄 Договоры, которые будут удалены:');
      contracts.forEach((contract, index) => {
        console.log(`  ${index + 1}. ID: ${contract.id} - "${contract.title}" (${contract.category || 'без категории'})`);
      });
      
      console.log('\n🗑️ Начинаем удаление...');
      
      // Удаляем все договоры
      db.run("DELETE FROM legal_documents", (err) => {
        if (err) {
          console.error('❌ Ошибка удаления договоров:', err.message);
        } else {
          console.log('✅ Все договоры успешно удалены');
          
          // Проверяем что таблица действительно пуста
          db.all("SELECT COUNT(*) as count FROM legal_documents", (err, result) => {
            if (err) {
              console.error('❌ Ошибка проверки удаления:', err.message);
            } else {
              const remainingCount = result[0].count;
              console.log(`📋 Договоров осталось в базе данных: ${remainingCount}`);
              
              if (remainingCount === 0) {
                console.log('🎉 Удаление выполнено успешно! Офис "тестовый офис lawtech" теперь не содержит договоров.');
              } else {
                console.log('⚠️ Внимание: некоторые договоры не были удалены');
              }
            }
            
            db.close((err) => {
              if (err) {
                console.error('❌ Ошибка закрытия базы данных:', err.message);
              } else {
                console.log('\n✅ Операция завершена');
              }
            });
          });
        }
      });
    });
  });
}

// Запускаем удаление
deleteAllContracts();