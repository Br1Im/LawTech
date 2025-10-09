/**
 * Скрипт для создания тестовых аккаунтов в системе
 */
const bcrypt = require('bcryptjs');
const db = require('../db');

/**
 * Функция для создания пользователя, если он не существует
 * @param {Object} userData - Данные пользователя
 * @returns {Promise<number|null>} - ID созданного пользователя или null, если пользователь уже существует
 */
async function createUserIfNotExists(userData) {
  try {
    // Проверяем, существует ли пользователь с таким email
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [userData.email]);
    
    if (existingUsers.length > 0) {
      console.log(`✅ Пользователь с email ${userData.email} уже существует`);
      return existingUsers[0].id;
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Создаем офис, если указаны данные офиса и не указан office_id
    let officeId = userData.office_id;
    if (!officeId && userData.office) {
      const [officeResult] = await db.query(`
        INSERT INTO offices (name, address, contact_phone, website)
        VALUES (?, ?, ?, ?)
      `, [
        userData.office.name,
        userData.office.address,
        userData.office.contact_phone,
        userData.office.website
      ]);
      
      officeId = officeResult.insertId;
      console.log(`✅ Создан офис с ID: ${officeId}`);
    }
    
    // Создаем пользователя
    const [result] = await db.query(`
      INSERT INTO users (username, email, password, office_id, role)
      VALUES (?, ?, ?, ?, ?)
    `, [
      userData.username,
      userData.email,
      hashedPassword,
      officeId,
      userData.role
    ]);
    
    console.log(`✅ Создан пользователь ${userData.username} (${userData.email}) с ролью ${userData.role}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error);
    return null;
  }
}

/**
 * Основная функция для создания тестовых аккаунтов
 */
async function seedDefaultUsers() {
  try {
    console.log('🚀 Начало создания тестовых аккаунтов...');
    
    // Массив тестовых пользователей
    const defaultUsers = [
      {
        username: 'Анна Петрова',
        email: 'lawyer@lawtech.com',
        password: 'lawyer123',
        role: 'lawyer',
        office: {
          name: 'Юридическая консультация "Правовед"',
          address: 'г. Москва, ул. Арбат, д. 25, оф. 12',
          contact_phone: '+7 (495) 987-65-43',
          website: 'https://pravoved-law.ru'
        }
      },
      {
        username: 'Анна Юристова',
        email: 'lawyer1@pravoved.ru',
        password: 'lawyer123',
        role: 'lawyer',
        office: {
          name: 'Юридическая консультация "Правовед"',
          address: 'г. Москва, ул. Арбат, д. 25, оф. 12',
          contact_phone: '+7 (495) 987-65-43',
          website: 'https://pravoved-law.ru'
        }
      },
      {
        username: 'Михаил Сидоров',
        email: 'expert@lawtech.com',
        password: 'expert123',
        role: 'expert'
      },
      {
        username: 'Иван Админов',
        email: 'admin@lawtech.ru',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'Петр Директоров',
        email: 'director@pravoved.ru',
        password: 'director123',
        role: 'director'
      }
    ];
    
    // Создаем пользователей
    for (const userData of defaultUsers) {
      await createUserIfNotExists(userData);
    }
    
    console.log('✅ Создание тестовых аккаунтов завершено');
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых аккаунтов:', error);
  }
}

module.exports = {
  seedDefaultUsers
};