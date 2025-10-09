const db = require('../db');
const bcrypt = require('bcryptjs');

/**
 * Скрипт для создания готовых тестовых аккаунтов
 */
const seedUsers = async () => {
  try {
    console.log('Создание готовых тестовых аккаунтов...');
    
    // Сначала создаем тестовые офисы
    const offices = [
      {
        name: 'Юридическая фирма "Правовед"',
        address: 'г. Москва, ул. Тверская, д. 15',
        contact_phone: '+7 (495) 123-45-67',
        website: 'https://pravoved.ru',
        revenue: 5000000.00,
        orders: 150
      },
      {
        name: 'Адвокатское бюро "Защита"',
        address: 'г. Санкт-Петербург, Невский пр., д. 28',
        contact_phone: '+7 (812) 987-65-43',
        website: 'https://zashchita.spb.ru',
        revenue: 3200000.00,
        orders: 89
      },
      {
        name: 'Консалтинговая группа "Лекс"',
        address: 'г. Екатеринбург, ул. Ленина, д. 42',
        contact_phone: '+7 (343) 555-12-34',
        website: 'https://lex-consult.ru',
        revenue: 1800000.00,
        orders: 67
      }
    ];

    // Вставляем офисы
    for (const office of offices) {
      await db.query(`
        INSERT INTO offices (name, address, contact_phone, website, revenue, orders, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [office.name, office.address, office.contact_phone, office.website, office.revenue, office.orders]);
    }
    console.log('Тестовые офисы созданы успешно');

    // Получаем ID созданных офисов
    const [officeRows] = await db.query('SELECT id, name FROM offices ORDER BY id DESC LIMIT 3');
    const officeIds = officeRows.map(row => row.id);

    // Создаем тестовых пользователей
    const testUsers = [
      {
        username: 'admin',
        email: 'admin@lawtech.ru',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        office_id: null
      },
      {
        username: 'director_pravoved',
        email: 'director@pravoved.ru',
        password: await bcrypt.hash('director123', 10),
        role: 'office',
        office_id: officeIds[2] // Правовед
      },
      {
        username: 'lawyer_pravoved',
        email: 'lawyer1@pravoved.ru',
        password: await bcrypt.hash('lawyer123', 10),
        role: 'lawyer',
        office_id: officeIds[2] // Правовед
      },
      {
        username: 'director_zashchita',
        email: 'director@zashchita.spb.ru',
        password: await bcrypt.hash('director123', 10),
        role: 'office',
        office_id: officeIds[1] // Защита
      },
      {
        username: 'lawyer_zashchita',
        email: 'lawyer1@zashchita.spb.ru',
        password: await bcrypt.hash('lawyer123', 10),
        role: 'lawyer',
        office_id: officeIds[1] // Защита
      },
      {
        username: 'director_lex',
        email: 'director@lex-consult.ru',
        password: await bcrypt.hash('director123', 10),
        role: 'office',
        office_id: officeIds[0] // Лекс
      },
      {
        username: 'lawyer_lex',
        email: 'lawyer1@lex-consult.ru',
        password: await bcrypt.hash('lawyer123', 10),
        role: 'lawyer',
        office_id: officeIds[0] // Лекс
      },
      {
        username: 'freelance_lawyer',
        email: 'freelance@lawyer.ru',
        password: await bcrypt.hash('freelance123', 10),
        role: 'lawyer',
        office_id: null
      }
    ];

    // Вставляем пользователей
    for (const user of testUsers) {
      await db.query(`
        INSERT INTO users (username, email, password, office_id, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [user.username, user.email, user.password, user.office_id, user.role]);
    }
    console.log('Тестовые пользователи созданы успешно');

    // Выводим информацию о созданных аккаунтах
    console.log('\n=== ГОТОВЫЕ ТЕСТОВЫЕ АККАУНТЫ ===');
    console.log('\n🔧 Администратор:');
    console.log('Email: admin@lawtech.ru');
    console.log('Пароль: admin123');
    
    console.log('\n🏢 Директора офисов:');
    console.log('Email: director@pravoved.ru | Пароль: director123 (Правовед)');
    console.log('Email: director@zashchita.spb.ru | Пароль: director123 (Защита)');
    console.log('Email: director@lex-consult.ru | Пароль: director123 (Лекс)');
    
    console.log('\n⚖️ Юристы:');
    console.log('Email: lawyer1@pravoved.ru | Пароль: lawyer123 (Правовед)');
    console.log('Email: lawyer1@zashchita.spb.ru | Пароль: lawyer123 (Защита)');
    console.log('Email: lawyer1@lex-consult.ru | Пароль: lawyer123 (Лекс)');
    console.log('Email: freelance@lawyer.ru | Пароль: freelance123 (Фрилансер)');
    
    console.log('\n✅ Все тестовые аккаунты созданы успешно!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при создании тестовых аккаунтов:', error);
    process.exit(1);
  }
};

seedUsers();