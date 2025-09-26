const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./lawtech.db');

console.log('Создаем таблицу contracts и добавляем тестовые данные...');

// Сначала создаем таблицу contracts если её нет
db.run(`
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    office_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    contract_number TEXT UNIQUE NOT NULL,
    contract_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'completed', 'cancelled', 'Подписан')),
    contract_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) {
    console.error('Ошибка создания таблицы contracts:', err);
    return;
  }
  
  console.log('✅ Таблица contracts создана или уже существует');
  
  // Очищаем существующие тестовые данные
  db.run('DELETE FROM contracts WHERE contract_number LIKE "DOG-%"', (err) => {
    if (err) {
      console.error('Ошибка очистки старых данных:', err);
      return;
    }
    
    console.log('🧹 Старые тестовые данные очищены');
    
    // Добавляем тестовые договоры с правильными датами
    const testContracts = [
      {
        office_id: 4,
        created_by: 3,
        client_name: 'ООО "Тестовая Компания"',
        contract_number: 'DOG-1758358587309',
        contract_type: 'Консультация',
        subject: 'Договор с ООО "Тестовая Компания"',
        status: 'Подписан',
        contract_date: '2025-09-20' // 20.09.2025
      },
      {
        office_id: 4,
        created_by: 3,
        client_name: 'ООО "Тестовый клиент"',
        contract_number: 'DOG-1758313085186',
        contract_type: 'Гражданское право',
        subject: 'Договор с ООО "Тестовый клиент"',
        status: 'Подписан',
        contract_date: '2025-09-19' // 19.09.2025
      }
    ];
    
    let insertedCount = 0;
    
    testContracts.forEach((contract, index) => {
      const sql = `
        INSERT INTO contracts (office_id, created_by, client_name, contract_number, contract_type, subject, status, contract_date, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        contract.office_id,
        contract.created_by,
        contract.client_name,
        contract.contract_number,
        contract.contract_type,
        contract.subject,
        contract.status,
        contract.contract_date,
        100000 // Добавляем сумму договора
      ], function(err) {
        if (err) {
          console.error(`❌ Ошибка добавления договора ${contract.contract_number}:`, err);
        } else {
          console.log(`✅ Добавлен договор ${contract.contract_number} с ID: ${this.lastID}`);
          insertedCount++;
          
          if (insertedCount === testContracts.length) {
            // Проверяем результат
            db.all('SELECT * FROM contracts ORDER BY contract_date', (err, contracts) => {
              if (err) {
                console.error('Ошибка проверки результата:', err);
              } else {
                console.log('\n📋 Созданные договоры:');
                console.table(contracts);
              }
              
              db.close();
            });
          }
        }
      });
    });
  });
});