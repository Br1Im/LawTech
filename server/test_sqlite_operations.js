const db = require('./db');

async function testDatabaseOperations() {
  console.log('🧪 Тестирование операций с SQLite базой данных...');

  try {
    // Тест 1: Проверка подключения
    console.log('\n1. Тестирование подключения к базе данных...');
    
    // Тест 2: Получение списка офисов
    console.log('\n2. Получение списка офисов...');
    const offices = await db.query('SELECT * FROM offices');
    console.log(`✅ Найдено офисов: ${offices.length}`);
    if (offices.length > 0) {
      console.log(`   Первый офис: ${offices[0].name}`);
    }

    // Тест 3: Получение списка пользователей
    console.log('\n3. Получение списка пользователей...');
    const users = await db.query('SELECT id, email, role, first_name, last_name FROM users');
    console.log(`✅ Найдено пользователей: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ${user.first_name} ${user.last_name}`);
    });

    // Тест 4: Получение списка сотрудников
    console.log('\n4. Получение списка сотрудников...');
    const employees = await db.query('SELECT * FROM employees');
    console.log(`✅ Найдено сотрудников: ${employees.length}`);

    // Тест 5: Получение списка клиентов
    console.log('\n5. Получение списка клиентов...');
    const clients = await db.query('SELECT * FROM clients');
    console.log(`✅ Найдено клиентов: ${clients.length}`);

    // Тест 6: Получение статистики офиса
    console.log('\n6. Получение статистики офиса...');
    const stats = await db.query('SELECT * FROM office_stats LIMIT 3');
    console.log(`✅ Найдено записей статистики: ${stats.length}`);

    // Тест 7: Проверка внешних ключей
    console.log('\n7. Проверка внешних ключей...');
    const userWithOffice = await db.query(`
      SELECT u.email, u.role, o.name as office_name 
      FROM users u 
      JOIN offices o ON u.office_id = o.id 
      LIMIT 1
    `);
    if (userWithOffice.length > 0) {
      console.log(`✅ Внешние ключи работают: ${userWithOffice[0].email} -> ${userWithOffice[0].office_name}`);
    }

    console.log('\n🎉 Все тесты базы данных прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании базы данных:', error);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Запуск тестов
testDatabaseOperations();