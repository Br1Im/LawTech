const db = require('./db');

async function checkPaymentsTable() {
  try {
    // Проверяем существование таблицы payments
    const [tables] = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='payments'
    `);
    
    if (tables.length === 0) {
      console.log('Таблица payments не существует, создаем...');
      await createPaymentsTable();
    } else {
      console.log('Таблица payments существует');
      
      // Проверяем структуру таблицы
      const [columns] = await db.query('PRAGMA table_info(payments)');
      console.log('Структура таблицы payments:', columns);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при проверке таблицы payments:', error);
    process.exit(1);
  }
}

async function createPaymentsTable() {
  try {
    await db.query(`
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date TEXT NOT NULL,
        status TEXT CHECK(status IN ('Завершен', 'Отменен', 'В обработке')) NOT NULL DEFAULT 'В обработке',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id)
      )
    `);
    console.log('Таблица payments успешно создана');
  } catch (error) {
    console.error('Ошибка при создании таблицы payments:', error);
    throw error;
  }
}

checkPaymentsTable();