const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Данные для тестирования
const testUser = {
  email: 'admin@lawtech.com',
  password: 'admin123'
};

const testContract = {
  client_name: 'Тестовый клиент ООО',
  contract_type: 'Гражданское право',
  subject: 'Представление интересов в суде по гражданскому делу',
  amount: 75000,
  status: 'active',
  contract_date: '2025-09-20'
};

async function testContractCreation() {
  try {
    console.log('🔐 Авторизация пользователя...');
    
    // Авторизация
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    
    console.log('✅ Авторизация успешна');
    console.log('👤 Пользователь:', loginResponse.data.user.username);
    console.log('🏢 Офис ID:', loginResponse.data.user.office_id);
    
    // Создание договора
    console.log('\n📝 Создание договора...');
    console.log('📋 Данные договора:', testContract);
    
    const contractResponse = await axios.post(
      `${API_BASE_URL}/contracts`,
      testContract,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ Договор создан успешно!');
    console.log('📄 Созданный договор:', contractResponse.data.contract);
    
    return contractResponse.data.contract;
    
  } catch (error) {
    console.error('\n❌ Ошибка при создании договора:');
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    } else {
      console.error('Ошибка:', error.message);
    }
    throw error;
  }
}

// Запуск теста
testContractCreation()
  .then(() => {
    console.log('\n🎉 Тест завершен успешно!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n💥 Тест завершен с ошибкой!');
    process.exit(1);
  });