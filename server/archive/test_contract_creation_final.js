const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Тестовые данные для создания договора
const testContractData = {
    client_name: 'ООО "Тестовая Компания"',
    contract_type: 'Консультация',
    subject: 'Договор на оказание юридических консультационных услуг',
    amount: 75000,
    contract_date: '2024-01-20',
    author_id: 1 // Будет заменен на ID авторизованного пользователя
};

async function testContractCreation() {
    try {
        console.log('🔐 Авторизация пользователя...');
        
        // Авторизация с учетными данными из существующего скрипта
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@lawtech.ru',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const user = loginResponse.data.user;
        
        console.log('✅ Успешная авторизация!');
        console.log('👤 Пользователь:', user.username);
        console.log('🏢 Офис ID:', user.office_id);
        
        // Обновляем author_id на ID авторизованного пользователя
        testContractData.author_id = user.id;
        
        console.log('\n📝 Создание договора...');
        console.log('Данные договора:', testContractData);
        
        // Создание договора
        const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, testContractData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('\n✅ Договор успешно создан!');
        console.log('📄 Ответ сервера:', contractResponse.data);
        
        // Проверяем, что договор действительно создался
        if (contractResponse.data.success && contractResponse.data.contract) {
            const contract = contractResponse.data.contract;
            console.log('\n🎉 Детали созданного договора:');
            console.log('ID:', contract.id);
            console.log('Клиент:', contract.client_name);
            console.log('Тип:', contract.contract_type);
            console.log('Предмет:', contract.subject);
            console.log('Сумма:', contract.amount, 'руб.');
            console.log('Дата договора:', contract.contract_date);
            console.log('Автор:', contract.author_name);
        }
        
        console.log('\n🎯 Тест завершен успешно!');
        
    } catch (error) {
        console.log('\n❌ Ошибка при создании договора:');
        if (error.response) {
            console.log('Статус:', error.response.status);
            console.log('Данные:', error.response.data);
        } else {
            console.log('Ошибка:', error.message);
        }
        console.log('\n💥 Тест завершен с ошибкой!');
        process.exit(1);
    }
}

testContractCreation();