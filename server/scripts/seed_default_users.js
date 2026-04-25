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
    let officeId = userData.office_id || null;
    if (!officeId && userData.office) {
      const [officeResult] = await db.query(`
        INSERT INTO offices (name, address, phone, website)
        VALUES (?, ?, ?, ?)
      `, [
        userData.office.name,
        userData.office.address,
        userData.office.phone || userData.office.contact_phone,
        userData.office.website
      ]);
      
      officeId = officeResult.insertId;
      console.log(`✅ Создан офис с ID: ${officeId}`);
    }
    
    // Создаем пользователя
    const [result] = await db.query(`
      INSERT INTO users (first_name, last_name, email, password, office_id, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userData.first_name,
      userData.last_name,
      userData.email,
      hashedPassword,
      officeId,
      userData.role
    ]);

    console.log(`✅ Создан пользователь ${userData.first_name} ${userData.last_name} (${userData.email}) с ролью ${userData.role}`);
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
    
    // Массив тестовых пользователей. Тестовые офисы НЕ создаём —
    // каждый пользователь получит свой офис при первом сохранении клиента/договора.
    const defaultUsers = [
      {
        first_name: 'Анна',
        last_name: 'Петрова',
        email: 'lawyer@lawtech.com',
        password: 'lawyer123',
        role: 'lawyer'
      },
      {
        first_name: 'Анна',
        last_name: 'Юристова',
        email: 'lawyer1@pravoved.ru',
        password: 'lawyer123',
        role: 'lawyer'
      },
      {
        first_name: 'Михаил',
        last_name: 'Сидоров',
        email: 'expert@lawtech.com',
        password: 'expert123',
        role: 'expert'
      },
      {
        first_name: 'Иван',
        last_name: 'Админов',
        email: 'admin@lawtech.ru',
        password: 'admin123',
        role: 'admin'
      },
      {
        first_name: 'Петр',
        last_name: 'Директоров',
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