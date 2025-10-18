const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testContractsAPI() {
  try {
    // 1. Авторизация
    console.log('1. Авторизация...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@lawtech.ru',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Авторизация успешна');

    // 2. Получаем список договоров офиса
    console.log('\n2. Получение списка договоров офиса...');
    const contractsResponse = await axios.get(`${API_BASE_URL}/office/1/contracts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Ответ API:', JSON.stringify(contractsResponse.data, null, 2));
    console.log('Тип данных:', typeof contractsResponse.data);
    console.log('Это массив?', Array.isArray(contractsResponse.data));
    
    if (contractsResponse.data && typeof contractsResponse.data === 'object') {
      console.log('Ключи объекта:', Object.keys(contractsResponse.data));
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
  }
}

testContractsAPI();