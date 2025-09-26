const db = require('../db');

/**
 * Скрипт для создания таблицы contracts
 * Таблица будет хранить договоры с привязкой к офису и автору
 */
const createContractsTable = async () => {
  try {
    console.log('🔧 Создание таблицы contracts...');
    
    // Создание таблицы contracts
    await db.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        contract_number TEXT UNIQUE NOT NULL,
        contract_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        amount REAL DEFAULT 0,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'completed', 'cancelled')),
        contract_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Таблица contracts создана успешно');
    
    // Добавляем тестовый договор для проверки
    const [existingContracts] = await db.query('SELECT COUNT(*) as count FROM contracts');
    
    if (existingContracts[0].count === 0) {
      console.log('📝 Добавление тестового договора...');
      
      // Получаем первого пользователя-юриста
      const [lawyers] = await db.query(`
        SELECT u.id, u.office_id 
        FROM users u 
        WHERE u.role = 'lawyer' AND u.office_id IS NOT NULL 
        LIMIT 1
      `);
      
      if (lawyers.length > 0) {
        const lawyer = lawyers[0];
        const contractNumber = `DOG-${Date.now()}`;
        
        await db.query(`
          INSERT INTO contracts (
            office_id, 
            created_by, 
            client_name, 
            contract_number, 
            contract_type, 
            subject, 
            amount, 
            status, 
            contract_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lawyer.office_id,
          lawyer.id,
          'ООО "Тестовый клиент"',
          contractNumber,
          'Гражданское право',
          'Представление интересов в суде',
          150000,
          'active',
          new Date().toISOString().split('T')[0]
        ]);
        
        console.log(`✅ Тестовый договор ${contractNumber} добавлен успешно`);
      } else {
        console.log('⚠️ Не найден пользователь-юрист для создания тестового договора');
      }
    }
    
    console.log('🎉 Настройка таблицы contracts завершена успешно');
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблицы contracts:', error);
    throw error;
  }
};

// Экспорт функции для использования в других скриптах
module.exports = { createContractsTable };

// Если скрипт запускается напрямую
if (require.main === module) {
  createContractsTable()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}