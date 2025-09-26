const db = require('./db');

console.log('🧪 Тестирование API contracts...');

async function testContractsAPI() {
  try {
    // Сначала получим пользователя с office_id
    const [users] = await db.query('SELECT id, username, office_id FROM users WHERE office_id IS NOT NULL LIMIT 1');
    
    if (users.length === 0) {
      console.log('❌ Нет пользователей с office_id');
      return;
    }
    
    const user = users[0];
    console.log('👤 Тестируем для пользователя:', user);
    
    // Теперь получим contracts для этого офиса
    const [contracts] = await db.query(`
      SELECT 
        c.*,
        u.username as created_by_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.office_id = ?
      ORDER BY c.created_at DESC
    `, [user.office_id]);
    
    console.log('📄 Contracts найдено:', contracts.length);
    console.log('📋 Contracts:', contracts);
    
    // Тестируем HTTP запрос
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch(`http://localhost:5000/api/office/${user.office_id}/contracts`, {
        headers: {
          'Authorization': 'Bearer test-token-for-user-' + user.id
        }
      });
      
      const data = await response.text();
      console.log('🌐 HTTP Response status:', response.status);
      console.log('🌐 HTTP Response:', data);
      
    } catch (httpError) {
      console.log('❌ HTTP Error:', httpError.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testContractsAPI();