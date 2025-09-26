const fetch = require('node-fetch');

async function testCalendarApi() {
  try {
    // Получаем токен из локального хранилища
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4OTAwODQ4LCJleHAiOjE3NTg5ODcyNDh9.Nh-Yk-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi'; // Замените на реальный токен

    // Запрос к API календаря
    const response = await fetch('http://localhost:3001/api/office/4/calendar-events', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Статус ответа:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Данные календаря:', JSON.stringify(data, null, 2));
      console.log('Количество событий:', data.events?.length || 0);
    } else {
      const errorText = await response.text();
      console.error('Ошибка ответа сервера:', errorText);
    }
  } catch (err) {
    console.error('Ошибка при тестировании API:', err);
  }
}

testCalendarApi();