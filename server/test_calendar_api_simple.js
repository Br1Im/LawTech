const fetch = require('node-fetch');

async function testCalendarApi() {
  try {
    console.log('Тестирование API календаря...');
    
    const response = await fetch('http://localhost:3001/api/office/4/calendar-events', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4OTAwODQ4LCJleHAiOjE3NTg5ODcyNDh9.Nh-Yk-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi-Oi'
      }
    });

    console.log('Статус ответа:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Данные календаря:', JSON.stringify(data, null, 2));
      console.log('Количество событий:', data.events?.length || 0);
      
      if (data.events && data.events.length > 0) {
        console.log('\nПервое событие:');
        console.log(JSON.stringify(data.events[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.error('Ошибка ответа сервера:', errorText);
    }
  } catch (err) {
    console.error('Ошибка при тестировании API:', err);
  }
}

testCalendarApi();