const db = require('./db');

async function checkUsers() {
  try {
    console.log('🔍 Проверка пользователей в базе данных...');
    
    const [users] = await db.query('SELECT id, username, email, office_id FROM users LIMIT 5');
    
    console.log('👥 Пользователи:', users);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`\n🧪 Тестирование API для пользователя ${user.username} (office_id: ${user.office_id})`);
      
      // Проверим contracts для этого офиса
      const [contracts] = await db.query(`
        SELECT c.*, u.username as created_by_name 
        FROM contracts c 
        LEFT JOIN users u ON c.created_by = u.id 
        WHERE c.office_id = ? 
        ORDER BY c.created_at DESC
      `, [user.office_id]);
      
      console.log('📄 Contracts в базе данных:', contracts);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers();