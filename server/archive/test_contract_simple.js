const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Тест создания договора без авторизации (если возможно)
async function testContractCreation() {
    try {
        console.log('🧪 Тестирование создания договора...');
        
        const contractData = {
            client_name: 'Тестовый клиент',
            contract_type: 'Консультация',
            subject: 'Тестовый договор на консультацию',
            amount: 50000,
            contract_date: '2024-01-15',
            author_id: 1 // Предполагаем, что есть пользователь с ID 1
        };

        console.log('📝 Данные договора:', contractData);

        const response = await axios.post(`${API_BASE_URL}/contracts`, contractData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Договор успешно создан!');
        console.log('📄 Ответ сервера:', response.data);
        
    } catch (error) {
        console.log('❌ Ошибка при создании договора:');
        if (error.response) {
            console.log('Статус:', error.response.status);
            console.log('Данные:', error.response.data);
        } else {
            console.log('Ошибка:', error.message);
        }
        process.exit(1);
    }
}

testContractCreation();