const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

/**
 * Создать тестовых пользователей с разными ролями
 */
async function createTestUsers() {
  let connection;
  
  try {
    console.log('👥 Создание тестовых пользователей...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm'
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // Получаем ID первого офиса
    const [offices] = await connection.query('SELECT id FROM offices LIMIT 1');
    const officeId = offices[0]?.id || 1;
    
    // Пароль для всех тестовых пользователей
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Тестовые пользователи
    const testUsers = [
      {
        email: 'expert@test.com',
        password: hashedPassword,
        name: 'Эксперт',
        surname: 'Тестовый',
        role: 'expert',
        office_id: officeId
      },
      {
        email: 'lawyer@test.com',
        password: hashedPassword,
        name: 'Юрист',
        surname: 'Тестовый',
        role: 'lawyer',
        office_id: officeId
      },
      {
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Администратор',
        surname: 'Тестовый',
        role: 'admin',
        office_id: officeId
      },
      {
        email: 'director@test.com',
        password: hashedPassword,
        name: 'Директор',
        surname: 'Тестовый',
        role: 'director',
        office_id: officeId
      }
    ];
    
    console.log('📝 Создание пользователей...\n');
    
    for (const user of testUsers) {
      // Проверяем, существует ли пользователь
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );
      
      if (existing.length > 0) {
        // Обновляем существующего пользователя
        await connection.query(
          `UPDATE users 
           SET password = ?, name = ?, surname = ?, role = ?, office_id = ?
           WHERE email = ?`,
          [user.password, user.name, user.surname, user.role, user.office_id, user.email]
        );
        console.log(`✅ Обновлен: ${user.email} (${user.role})`);
      } else {
        // Создаем нового пользователя
        await connection.query(
          `INSERT INTO users (email, password, name, surname, role, office_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.email, user.password, user.name, user.surname, user.role, user.office_id]
        );
        console.log(`✅ Создан: ${user.email} (${user.role})`);
      }
    }
    
    console.log('\n📋 Тестовые пользователи:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: expert@test.com    | Роль: Эксперт');
    console.log('Email: lawyer@test.com    | Роль: Юрист');
    console.log('Email: admin@test.com     | Роль: Администратор');
    console.log('Email: director@test.com  | Роль: Директор');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Пароль для всех: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ Тестовые пользователи созданы!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUsers();
