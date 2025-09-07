const db = require('../db');
const bcrypt = require('bcrypt');

/**
 * Скрипт для создания аккаунта юриста с одним офисом
 */
const createLawyerAccount = async () => {
  try {
    console.log('Создание аккаунта юриста с офисом...');
    
    // Данные для офиса
    const officeData = {
      name: 'Юридическая консультация "Правовед"',
      address: 'г. Москва, ул. Арбат, д. 25, оф. 12',
      contact_phone: '+7 (495) 987-65-43',
      website: 'https://pravoved-law.ru',
      revenue: 0,
      orders: 0,
      employee_count: 1,
      work_phone: '+7 (495) 987-65-44',
      work_phone2: '+7 (495) 987-65-45',
      ip_surname: 'Петров',
      ip_name: 'Михаил',
      ip_middle_name: 'Александрович',
      inn: '770123456789',
      ogrn: '315774600012345'
    };
    
    // Создаем офис
    const [officeResult] = await db.query(`
      INSERT INTO offices (
        name, address, contact_phone, website, revenue, orders, employee_count,
        work_phone, work_phone2, ip_surname, ip_name, ip_middle_name, inn, ogrn,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      officeData.name,
      officeData.address,
      officeData.contact_phone,
      officeData.website,
      officeData.revenue,
      officeData.orders,
      officeData.employee_count,
      officeData.work_phone,
      officeData.work_phone2,
      officeData.ip_surname,
      officeData.ip_name,
      officeData.ip_middle_name,
      officeData.inn,
      officeData.ogrn
    ]);
    
    const officeId = officeResult.insertId;
    console.log(`Создан офис с ID: ${officeId}`);
    
    // Данные для пользователя-юриста
    const userData = {
      username: 'Михаил Петров',
      email: 'lawyer@pravoved-law.ru',
      password: 'lawyer123', // В реальном приложении пароль должен быть более сложным
      role: 'admin' // Администратор офиса
    };
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Создаем пользователя
    const [userResult] = await db.query(`
      INSERT INTO users (
        username, email, password, office_id, role, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      userData.username,
      userData.email,
      hashedPassword,
      officeId,
      userData.role
    ]);
    
    const userId = userResult.insertId;
    console.log(`Создан пользователь с ID: ${userId}`);
    
    // Добавляем юриста как сотрудника офиса
    await db.query(`
      INSERT INTO employees (
        office_id, surname, name, middle_name, position, phone, email,
        daily_contracts, total_revenue_14days, period_revenue, close_rate,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      officeId,
      officeData.ip_surname,
      officeData.ip_name,
      officeData.ip_middle_name,
      'lawyer',
      officeData.contact_phone,
      userData.email,
      0, // daily_contracts
      0, // total_revenue_14days
      0, // period_revenue
      0  // close_rate
    ]);
    
    console.log('Добавлен сотрудник-юрист');
    
    // Добавляем базовую статистику офиса
    const today = new Date().toISOString().split('T')[0];
    
    // Статистика за день
    await db.query(`
      INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, 'day', 0, 0, 0, 0, today]);
    
    // Статистика за 2 недели
    await db.query(`
      INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, '2weeks', 0, 0, 0, 0, today]);
    
    // Статистика за месяц
    await db.query(`
      INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [officeId, 'month', 0, 0, 0, 0, today]);
    
    console.log('Добавлена базовая статистика офиса');
    
    // Добавляем базовые данные для графиков
    const chartData = [
      // Данные для круговой диаграммы (пока пустые)
      { chart_type: 'pie', data_key: 'civil', data_value: 0, label: 'Гражданские дела' },
      { chart_type: 'pie', data_key: 'criminal', data_value: 0, label: 'Уголовные дела' },
      { chart_type: 'pie', data_key: 'corporate', data_value: 0, label: 'Корпоративное право' },
      { chart_type: 'pie', data_key: 'family', data_value: 0, label: 'Семейное право' },
      
      // Данные для линейного графика (последние 7 дней)
      { chart_type: 'line', data_key: 'day1', data_value: 0, label: 'День 1' },
      { chart_type: 'line', data_key: 'day2', data_value: 0, label: 'День 2' },
      { chart_type: 'line', data_key: 'day3', data_value: 0, label: 'День 3' },
      { chart_type: 'line', data_key: 'day4', data_value: 0, label: 'День 4' },
      { chart_type: 'line', data_key: 'day5', data_value: 0, label: 'День 5' },
      { chart_type: 'line', data_key: 'day6', data_value: 0, label: 'День 6' },
      { chart_type: 'line', data_key: 'day7', data_value: 0, label: 'День 7' }
    ];
    
    for (const data of chartData) {
      await db.query(`
        INSERT INTO chart_data (office_id, chart_type, data_key, data_value, label, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [officeId, data.chart_type, data.data_key, data.data_value, data.label, today]);
    }
    
    console.log('Добавлены базовые данные для графиков');
    
    console.log('\n=== АККАУНТ ЮРИСТА СОЗДАН УСПЕШНО ===');
    console.log(`Офис: ${officeData.name}`);
    console.log(`Адрес: ${officeData.address}`);
    console.log(`Email для входа: ${userData.email}`);
    console.log(`Пароль: ${userData.password}`);
    console.log(`Роль: ${userData.role}`);
    console.log(`ID офиса: ${officeId}`);
    console.log(`ID пользователя: ${userId}`);
    console.log('=====================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при создании аккаунта юриста:', error);
    process.exit(1);
  }
};

createLawyerAccount();