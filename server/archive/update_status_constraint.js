const db = require('./db');

async function updateStatusConstraint() {
  try {
    // Получаем текущую структуру таблицы
    const [tableInfo] = await db.query(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='contracts'
    `);
    
    if (!tableInfo || !tableInfo[0]) {
      throw new Error('Table contracts not found');
    }

    // Создаем временную таблицу с новыми ограничениями
    await db.query(`
      CREATE TABLE contracts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        contract_number TEXT NOT NULL,
        contract_type TEXT NOT NULL,
        subject TEXT,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT CHECK(status IN ('Подписан', 'Расторгнут', 'Завершен')) NOT NULL,
        contract_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Копируем данные, конвертируя старые статусы в новые
    await db.query(`
      INSERT INTO contracts_new 
      SELECT 
        id,
        office_id,
        created_by,
        client_name,
        contract_number,
        contract_type,
        subject,
        amount,
        CASE 
          WHEN status = 'active' THEN 'Подписан'
          WHEN status = 'completed' THEN 'Завершен'
          WHEN status = 'cancelled' THEN 'Расторгнут'
          ELSE status
        END as status,
        contract_date,
        created_at,
        updated_at
      FROM contracts
    `);

    // Удаляем старую таблицу
    await db.query('DROP TABLE contracts');

    // Переименовываем новую таблицу
    await db.query('ALTER TABLE contracts_new RENAME TO contracts');

    console.log('Successfully updated contracts table structure and converted statuses');
    process.exit(0);
  } catch (error) {
    console.error('Error updating status constraint:', error);
    process.exit(1);
  }
}

updateStatusConstraint();