const db = require('../db');

async function checkContracts() {
  try {
    console.log('🔍 Проверка договоров в базе данных...\n');

    // Проверяем общее количество договоров
    const [allContracts] = await db.query('SELECT COUNT(*) as count FROM contracts');
    console.log(`📊 Всего договоров в базе: ${allContracts[0].count}`);

    // Проверяем договоры с датами
    const [contractsWithDates] = await db.query(
      'SELECT COUNT(*) as count FROM contracts WHERE contract_date IS NOT NULL'
    );
    console.log(`📅 Договоров с датами: ${contractsWithDates[0].count}`);

    // Получаем примеры договоров
    const [sampleContracts] = await db.query(`
      SELECT c.id, c.contract_date, c.status, c.amount,
             COALESCE(cl.name, 'Неизвестный') as client_name,
             e.office_id
      FROM contracts c
      LEFT JOIN clients cl ON c.id_client = cl.id
      LEFT JOIN employees e ON c.id_employee = e.id
      WHERE c.contract_date IS NOT NULL
      LIMIT 5
    `);

    console.log('\n📋 Примеры договоров:');
    sampleContracts.forEach(contract => {
      console.log(`  - ID: ${contract.id}, Дата: ${contract.contract_date}, Клиент: ${contract.client_name}, Офис: ${contract.office_id}, Статус: ${contract.status}`);
    });

    // Проверяем офисы
    const [offices] = await db.query('SELECT id, name FROM offices');
    console.log(`\n🏢 Офисов в базе: ${offices.length}`);
    offices.forEach(office => {
      console.log(`  - ID: ${office.id}, Название: ${office.name}`);
    });

    // Проверяем связь договоров с офисами
    const [contractsByOffice] = await db.query(`
      SELECT e.office_id, COUNT(*) as count
      FROM contracts c
      JOIN employees e ON c.id_employee = e.id
      WHERE c.contract_date IS NOT NULL
      GROUP BY e.office_id
    `);

    console.log('\n📊 Договоры по офисам:');
    contractsByOffice.forEach(row => {
      console.log(`  - Офис ID ${row.office_id}: ${row.count} договоров`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkContracts();
