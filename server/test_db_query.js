const db = require('./db');

async function testDbQuery() {
    console.log('🧪 Тестирование функции db.query...');
    
    try {
        // Тестируем создание клиента
        console.log('\n1. Создание клиента...');
        const result = await db.query(`
            INSERT INTO clients (
                office_id,
                first_name,
                last_name,
                email,
                phone,
                address,
                company,
                notes,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
            1, // office_id
            'Тест',
            'Функции',
            null,
            null,
            null,
            null,
            'Тест функции db.query'
        ]);
        
        console.log('Результат создания клиента:', result);
        console.log('Тип результата:', typeof result);
        console.log('Является ли массивом:', Array.isArray(result));
        
        if (Array.isArray(result) && result.length > 0) {
            console.log('Первый элемент:', result[0]);
            console.log('insertId:', result[0].insertId);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

testDbQuery();