const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testContractCreation() {
  try {
    console.log('🧪 Тестирование новой логики создания договоров...\n');

    // 1. Авторизация
    console.log('1. Авторизация...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@lawtech.ru',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Авторизация успешна');

    // 2. Создание нового договора с клиентом
    console.log('\n2. Создание нового договора с клиентом...');
    const contractData = {
      client_name: 'Тестовый Клиент',
      first_name: 'Тестовый',
      last_name: 'Клиент',
      middle_name: 'Тестович',
      company: 'ООО "Тест"',
      phone: '+7 (999) 123-45-67',
      email: 'test@example.com',
      address: 'г. Тест, ул. Тестовая, д. 1',
      contract_type: 'Консультация',
      subject: 'Тестовая консультация',
      amount: 50000,
      office_id: 1
    };

    const createResponse = await axios.post(`${API_BASE_URL}/contracts`, contractData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Договор создан успешно');
    console.log('📄 Данные договора:', JSON.stringify(createResponse.data, null, 2));
    console.log('📄 Полный ответ:', JSON.stringify(createResponse.data.contract, null, 2));

    // 3. Проверяем, что клиент был создан автоматически
    console.log('\n3. Проверка автоматического создания клиента...');
    const clientId = createResponse.data.client_id;
    
    if (clientId) {
      console.log(`✅ Клиент создан автоматически с ID: ${clientId}`);
    } else {
      console.log('❌ Клиент не был создан автоматически');
    }

    // 4. Получаем список клиентов офиса для проверки
    console.log('\n4. Получение списка клиентов офиса...');
    const clientsResponse = await axios.get(`${API_BASE_URL}/office/1/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('👥 Клиенты в офисе:', clientsResponse.data.length);
    const newClient = clientsResponse.data.find(client => client.id === clientId);
    
    if (newClient) {
      console.log('✅ Новый клиент найден в списке:');
      console.log(`   - ID: ${newClient.id}`);
      console.log(`   - Имя: ${newClient.clientName}`);
      console.log(`   - Номер договора: ${newClient.contractNumber}`);
    } else {
      console.log('❌ Новый клиент не найден в списке');
    }

    // 5. Получаем список договоров офиса для проверки
    console.log('\n5. Получение списка договоров офиса...');
    const contractsResponse = await axios.get(`${API_BASE_URL}/office/1/contracts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const contracts = contractsResponse.data.contracts || [];
    console.log('📄 Договоры в офисе:', contracts.length);
    
    // Проверяем, есть ли информация о созданном договоре в ответе
    console.log(`Ищем договор для клиента с ID: ${clientId}`);
    
    const newContract = contracts.find(contract => contract.title.includes('Тестовый Клиент'));
    
    if (newContract) {
      console.log('✅ Новый договор найден в списке:');
      console.log(`   - ID: ${newContract.id}`);
      console.log(`   - Клиент: ${newContract.client_name}`);
      console.log(`   - Тип: ${newContract.contract_type}`);
      console.log(`   - Сумма: ${newContract.amount}`);
    } else {
      console.log('❌ Новый договор не найден в списке');
    }

    console.log('\n🎉 Тестирование завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`   Статус: ${error.response.status}`);
    }
  }
}

testContractCreation();