const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./lawtech.db');

console.log('Проверяем существующие таблицы...');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Ошибка:', err);
    return;
  }
  
  console.log('Существующие таблицы:');
  rows.forEach(row => console.log('- ' + row.name));
  
  // Проверяем данные в таблице offices
  db.all("SELECT * FROM offices", (err, offices) => {
    if (err) {
      console.error('Ошибка при получении офисов:', err);
    } else {
      console.log('\nОфисы:');
      console.table(offices);
      
      // Проверяем есть ли поле contracts в офисах
      if (offices.length > 0) {
        const office = offices[0];
        console.log('\nПример офиса:');
        console.log(office);
        
        if (office.contracts) {
          try {
            const contracts = JSON.parse(office.contracts);
            console.log('\nДоговоры в офисе:');
            console.table(contracts);
          } catch (e) {
            console.log('Ошибка парсинга договоров:', e.message);
          }
        } else {
          console.log('Поле contracts пустое или отсутствует');
        }
      }
    }
    
    db.close();
  });
});