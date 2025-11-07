const db = require('../db');

/**
 * Создать тестовые данные для CRM
 */
async function seedTestData() {
  try {
    console.log('🌱 Создание тестовых данных для CRM...');

    // 1. Создаем сотрудников
    console.log('👥 Создание сотрудников...');
    
    const employees = [
      { id_office: 4, full_name: 'Иванов Иван Иванович', position: 'Юрист', email: 'ivanov@pravoved.ru', phone: '+7 999 111-11-11' },
      { id_office: 4, full_name: 'Петров Петр Петрович', position: 'Старший юрист', email: 'petrov@pravoved.ru', phone: '+7 999 222-22-22' },
      { id_office: 5, full_name: 'Сидорова Анна Сергеевна', position: 'Юрист', email: 'sidorova@lawtech.ru', phone: '+7 999 333-33-33' },
      { id_office: 5, full_name: 'Козлов Дмитрий Александрович', position: 'Юрист', email: 'kozlov@lawtech.ru', phone: '+7 999 444-44-44' },
    ];

    for (const emp of employees) {
      const [existing] = await db.query('SELECT id FROM employees WHERE email = ?', [emp.email]);
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO employees (id_office, full_name, position, email, phone) VALUES (?, ?, ?, ?, ?)',
          [emp.id_office, emp.full_name, emp.position, emp.email, emp.phone]
        );
        console.log(`✅ Создан сотрудник: ${emp.full_name}`);
      } else {
        console.log(`⚠️  Сотрудник уже существует: ${emp.full_name}`);
      }
    }

    // 2. Создаем клиентов
    console.log('👤 Создание клиентов...');
    
    const clients = [
      { full_name: 'Смирнов Алексей (ООО "Альфа")', phone: '+7 999 555-55-55', email: 'smirnov@alpha.ru', address: 'Москва, ул. Ленина, 1' },
      { full_name: 'Кузнецова Мария (ИП Кузнецова)', phone: '+7 999 666-66-66', email: 'kuznetsova@mail.ru', address: 'Москва, ул. Пушкина, 10' },
      { full_name: 'Попов Сергей (ООО "Бета")', phone: '+7 999 777-77-77', email: 'popov@beta.ru', address: 'Москва, ул. Гагарина, 5' },
      { full_name: 'Новикова Елена (ООО "Гамма")', phone: '+7 999 888-88-88', email: 'novikova@gamma.ru', address: 'Москва, ул. Мира, 20' },
      { full_name: 'Морозов Дмитрий (ИП Морозов)', phone: '+7 999 999-99-99', email: 'morozov@mail.ru', address: 'Москва, ул. Советская, 15' },
    ];

    const clientIds = [];
    for (const client of clients) {
      const [existing] = await db.query('SELECT id FROM clients WHERE email = ?', [client.email]);
      if (existing.length === 0) {
        const [result] = await db.query(
          'INSERT INTO clients (full_name, phone, email, address) VALUES (?, ?, ?, ?)',
          [client.full_name, client.phone, client.email, client.address]
        );
        clientIds.push(result.insertId);
        console.log(`✅ Создан клиент: ${client.full_name}`);
      } else {
        clientIds.push(existing[0].id);
        console.log(`⚠️  Клиент уже существует: ${client.full_name}`);
      }
    }

    // 3. Получаем ID сотрудников
    const [employeesList] = await db.query('SELECT id FROM employees LIMIT 4');
    const employeeIds = employeesList.map(e => e.id);

    if (employeeIds.length === 0) {
      console.log('❌ Нет сотрудников для создания договоров');
      return;
    }

    // 4. Создаем договоры
    console.log('📄 Создание договоров...');
    
    const contracts = [
      { id_employee: employeeIds[0], id_client: clientIds[0], contract_date: '2025-11-01', amount: 50000, status: 'active' },
      { id_employee: employeeIds[0], id_client: clientIds[1], contract_date: '2025-11-02', amount: 75000, status: 'active' },
      { id_employee: employeeIds[1], id_client: clientIds[2], contract_date: '2025-11-03', amount: 100000, status: 'active' },
      { id_employee: employeeIds[1], id_client: clientIds[3], contract_date: '2025-11-04', amount: 60000, status: 'active' },
      { id_employee: employeeIds[2] || employeeIds[0], id_client: clientIds[4], contract_date: '2025-11-05', amount: 80000, status: 'active' },
    ];

    for (const contract of contracts) {
      const [existing] = await db.query(
        'SELECT id FROM contracts WHERE id_employee = ? AND id_client = ? AND contract_date = ?',
        [contract.id_employee, contract.id_client, contract.contract_date]
      );
      
      if (existing.length === 0) {
        const [result] = await db.query(
          'INSERT INTO contracts (id_employee, id_client, contract_date, amount, status) VALUES (?, ?, ?, ?, ?)',
          [contract.id_employee, contract.id_client, contract.contract_date, contract.amount, contract.status]
        );
        
        // Получаем office_id сотрудника
        const [employee] = await db.query('SELECT id_office FROM employees WHERE id = ?', [contract.id_employee]);
        
        if (employee.length > 0) {
          const officeId = employee[0].id_office;
          
          // Создаем событие в календаре
          await db.query(
            `INSERT INTO calendar_events (title, description, date, time, type, priority, created_by, office_id, created_at) 
             VALUES (?, ?, ?, '10:00:00', 'contract', 'medium', 1, ?, NOW())`,
            [
              `Договор №${result.insertId}`,
              `Сумма: ${contract.amount} ₽`,
              contract.contract_date,
              officeId
            ]
          );
          
          // Обновляем статистику офиса
          const periods = ['day', 'week', 'month', 'year'];
          for (const period of periods) {
            await db.query(
              `INSERT INTO office_stats (office_id, period_type, revenue, orders, updated_at)
               VALUES (?, ?, ?, 1, NOW())
               ON DUPLICATE KEY UPDATE 
               revenue = revenue + ?,
               orders = orders + 1,
               updated_at = NOW()`,
              [officeId, period, contract.amount, contract.amount]
            );
          }
        }
        
        console.log(`✅ Создан договор на сумму ${contract.amount} ₽`);
      } else {
        console.log(`⚠️  Договор уже существует`);
      }
    }

    console.log('✅ Тестовые данные созданы успешно!');
    console.log('\n📊 Статистика:');
    console.log(`   Сотрудников: ${employees.length}`);
    console.log(`   Клиентов: ${clients.length}`);
    console.log(`   Договоров: ${contracts.length}`);
    console.log(`   Общая сумма: ${contracts.reduce((sum, c) => sum + c.amount, 0)} ₽`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
    process.exit(1);
  }
}

// Запускаем создание данных
seedTestData();
