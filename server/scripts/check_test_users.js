const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Проверить тестовых пользователей в базе данных
 */
async function checkTestUsers() {
  let connection;
  
  try {
    console.log('👥 Проверка тестовых пользователей...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm'
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // Получаем всех тестовых пользователей
    const [users] = await connection.query(`
      SELECT id, email, first_name, last_name, role, office_id, created_at
      FROM users
      WHERE email LIKE '%@test.com'
      ORDER BY id
    `);
    
    if (users.length === 0) {
      console.log('❌ Тестовые пользователи не найдены\n');
      return;
    }
    
    console.log('📋 Найдено тестовых пользователей:', users.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const user of users) {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Имя: ${user.first_name} ${user.last_name}`);
      console.log(`Роль: ${user.role}`);
      console.log(`Office ID: ${user.office_id || 'не назначен'}`);
      console.log(`Создан: ${user.created_at}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // Проверяем офисы
    const [offices] = await connection.query('SELECT id, name FROM offices');
    console.log('🏢 Доступные офисы:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const office of offices) {
      console.log(`ID: ${office.id} | Название: ${office.name}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTestUsers();
