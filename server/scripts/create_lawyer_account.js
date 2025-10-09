const db = require('../db');
const bcrypt = require('bcryptjs');

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
        name, address, contact_phone, website, revenue, orders,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      officeData.name,
      officeData.address,
      officeData.contact_phone,
      officeData.website,
      officeData.revenue,
      officeData.orders
    ]);
    
    const officeId = officeResult.insertId;
    console.log(`Создан офис с ID: ${officeId}`);
    
    // Данные для пользователя-юриста
    // Генерируем уникальный email с timestamp
    const timestamp = Date.now();
    const userData = {
      username: 'Михаил Петров',
      email: `lawyer${timestamp}@pravoved-law.ru`,
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
    
    // Примечание: Сотрудник будет добавлен автоматически при входе в систему
    console.log('Пользователь-юрист создан');
    
    // Примечание: Статистика и данные графиков будут создаваться автоматически
    console.log('Базовые данные офиса созданы');
    
    console.log('\n=== АККАУНТ ЮРИСТА СОЗДАН УСПЕШНО ===');
    console.log(`Офис: ${officeData.name}`);
    console.log(`Адрес: ${officeData.address}`);
    console.log(`Email для входа: ${userData.email}`);
    console.log('Пароль: lawyer123');
    console.log('Роль: admin');
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