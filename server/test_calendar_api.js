const axios = require('axios');

async function testCalendarAPI() {
  console.log('🧪 Тестирование API календаря...');
  
  const baseURL = 'http://localhost:3001/api';
  
  try {
    // Сначала авторизуемся
    console.log('🔐 Авторизация...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@lawtech.ru',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Авторизация успешна');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Тестируем получение событий календаря
    console.log('\n📅 Тестирование получения событий календаря...');
    const calendarResponse = await axios.get(`${baseURL}/office/1/calendar-events/range`, {
      headers,
      params: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    });
    
    console.log('✅ Ответ календаря получен:');
    console.log('📊 Статус:', calendarResponse.status);
    console.log('📋 Данные:', JSON.stringify(calendarResponse.data, null, 2));
    
    if (calendarResponse.data.success) {
      console.log('🎉 Календарь работает корректно!');
      console.log(`📅 Найдено событий: ${calendarResponse.data.events ? calendarResponse.data.events.length : 0}`);
    } else {
      console.log('❌ Календарь вернул ошибку:', calendarResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response ? error.response.data : error.message);
  }
}

testCalendarAPI();