const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'lawtech.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверяем структуру таблицы contracts...');

// Проверяем структуру таблицы contracts
db.all("PRAGMA table_info(contracts)", (err, rows) => {
    if (err) {
        console.error('❌ Ошибка при получении структуры таблицы contracts:', err);
        return;
    }
    
    console.log('\n📋 Структура таблицы contracts:');
    if (rows.length === 0) {
        console.log('❌ Таблица contracts не найдена или пуста');
    } else {
        rows.forEach(row => {
            console.log(`  - ${row.name}: ${row.type} ${row.pk ? 'PRIMARY KEY' : ''} ${row.notnull ? 'NOT NULL' : ''}`);
        });
    }
    
    // Проверяем содержимое таблицы
    db.all("SELECT * FROM contracts LIMIT 5", (err, contracts) => {
        if (err) {
            console.error('❌ Ошибка при получении данных из таблицы contracts:', err);
        } else {
            console.log(`\n📊 Найдено договоров: ${contracts.length}`);
            if (contracts.length > 0) {
                console.log('\n📋 Пример данных:');
                console.log(contracts[0]);
            }
        }
        
        db.close();
        console.log('\n✅ Проверка завершена');
    });
});