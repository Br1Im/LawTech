const db = require('./db');

async function checkDatabase() {
  try {
    console.log('=== ПРОВЕРКА БАЗЫ ДАННЫХ ===');
    
    // Получаем список таблиц
    const tables = await db.query('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('Таблицы в БД:', tables.map(t => t.name));
    
    // Проверяем таблицу cases если она есть
    if (tables.some(t => t.name === 'cases')) {
      const cases = await db.query('SELECT * FROM cases');
      console.log('\nДела в БД:', cases.length);
      if (cases.length > 0) {
        console.log('Первые 5 дел:');
        cases.slice(0, 5).forEach((c, i) => {
          console.log(`${i+1}. ${c.title} (ID: ${c.id}, Статус: ${c.status})`);
        });
      }
    }
    
    // Проверяем таблицу clients если она есть
    if (tables.some(t => t.name === 'clients')) {
      const clients = await db.query('SELECT * FROM clients');
      console.log('\nКлиенты в БД:', clients.length);
      if (clients.length > 0) {
        console.log('Первые 5 клиентов:');
        clients.slice(0, 5).forEach((c, i) => {
          console.log(`${i+1}. ${c.full_name} (ID: ${c.id})`);
        });
      }
    }
    
    // Проверяем таблицу legal_documents если она есть
    if (tables.some(t => t.name === 'legal_documents')) {
      const docs = await db.query('SELECT * FROM legal_documents');
      console.log('\nЮридические документы в БД:', docs.length);
      if (docs.length > 0) {
        console.log('Первые 5 документов:');
        docs.slice(0, 5).forEach((d, i) => {
          console.log(`${i+1}. ${d.title} (ID: ${d.id}, Тип: ${d.type})`);
        });
      }
    }
    
    console.log('\n=== КОНЕЦ ПРОВЕРКИ ===');
    
  } catch (error) {
    console.error('Ошибка при проверке БД:', error);
  }
}

checkDatabase().then(() => {
  console.log('Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('Ошибка:', error);
  process.exit(1);
});