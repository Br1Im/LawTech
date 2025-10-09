const db = require('./db');

async function checkTables() {
  try {
    console.log('Проверяем структуру базы данных...');
    
    const result = await db.query('SELECT name FROM sqlite_master WHERE type="table"');
    const tables = result[0]; // Получаем первый элемент массива
    console.log('Таблицы в БД:', tables.map(t => t.name));
    
    // Проверяем есть ли таблица clients
    if (tables.some(t => t.name === 'clients')) {
      const clientsResult = await db.query('SELECT COUNT(*) as count FROM clients');
      console.log('Количество клиентов:', clientsResult[0][0].count);
    } else {
      console.log('Таблица clients не найдена');
    }
    
    // Проверяем есть ли таблица cases
    if (tables.some(t => t.name === 'cases')) {
      const casesResult = await db.query('SELECT COUNT(*) as count FROM cases');
      console.log('Количество дел:', casesResult[0][0].count);
    } else {
      console.log('Таблица cases не найдена');
    }
    
    console.log('=== ПРОВЕРКА ЗАВЕРШЕНА ===');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

checkTables();