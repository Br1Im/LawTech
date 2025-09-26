/**
 * Скрипт для прямого тестирования API календаря
 */
const db = require('./db');

async function testCalendarAPI() {
  try {
    console.log('Тестирование API календаря...');
    
    // Проверяем наличие таблицы contracts
    const [tables] = await db.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'`
    );
    
    console.log(`Таблица contracts существует: ${tables.length > 0}`);
    
    // Выводим все договоры с датами
    const [allContracts] = await db.query(
      `SELECT id, client_name, contract_number, contract_type, status, contract_date, office_id
       FROM contracts 
       WHERE contract_date IS NOT NULL`
    );
    
    console.log(`Все договоры с датами в базе (${allContracts.length}):`);
    console.log(JSON.stringify(allContracts, null, 2));
    
    // Запрашиваем договоры для конкретного офиса
    const officeId = 4;
    const [contracts] = await db.query(
      `SELECT id, client_name, contract_number, contract_type, status, contract_date
       FROM contracts 
       WHERE office_id = ? AND contract_date IS NOT NULL
       ORDER BY contract_date ASC`,
      [officeId]
    );
    
    console.log(`Найдено договоров для офиса ${officeId}: ${contracts.length}`);
    console.log(JSON.stringify(contracts, null, 2));
    
    // Проверяем формат даты в договорах
    if (contracts.length > 0) {
      console.log('Формат даты в первом договоре:', contracts[0].contract_date);
      console.log('Тип данных даты:', typeof contracts[0].contract_date);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при тестировании API календаря:', error);
    process.exit(1);
  }
}

testCalendarAPI();