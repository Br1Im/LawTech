const db = require('../db');

async function createTestContract() {
  try {
    console.log('🔍 Создание тестового договора...\n');

    // Получаем первого сотрудника
    const [employees] = await db.query('SELECT id, office_id FROM employees LIMIT 1');
    
    if (employees.length === 0) {
      console.log('❌ Нет сотрудников в базе');
      process.exit(1);
    }

    const employee = employees[0];
    console.log(`✅ Найден сотрудник ID: ${employee.id}, Офис: ${employee.office_id}`);

    // Получаем первого клиента
    const [clients] = await db.query('SELECT id, name FROM clients LIMIT 1');
    
    if (clients.length === 0) {
      console.log('❌ Нет клиентов в базе');
      process.exit(1);
    }

    const client = clients[0];
    console.log(`✅ Найден клиент ID: ${client.id}, Имя: ${client.name}`);

    // Создаем договор на сегодня
    const today = new Date().toISOString().split('T')[0];
    
    const [result] = await db.query(
      `INSERT INTO contracts (id_employee, id_client, contract_date, amount, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [employee.id, client.id, today, 50000, 'active']
    );

    console.log(`\n✅ Создан тестовый договор ID: ${result.insertId}`);
    console.log(`   Дата: ${today}`);
    console.log(`   Сумма: 50000`);
    console.log(`   Клиент: ${client.name}`);
    console.log(`   Офис: ${employee.office_id}`);

    // Проверяем что договор создался
    const [check] = await db.query(
      `SELECT c.*, cl.name as client_name, e.office_id
       FROM contracts c
       LEFT JOIN clients cl ON c.id_client = cl.id
       LEFT JOIN employees e ON c.id_employee = e.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    console.log('\n📋 Проверка созданного договора:');
    console.log(check[0]);

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

createTestContract();
