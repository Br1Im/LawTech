const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Используем правильный путь к базе данных
const dbPath = path.join(__dirname, 'database', 'lawtech.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
        return;
    }
    console.log('Подключение к базе данных SQLite успешно.');
});

// Получаем список всех таблиц
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Ошибка при получении списка таблиц:', err.message);
        return;
    }
    
    console.log('\n📋 Все таблицы в базе данных:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Проверяем наличие таблицы contracts
    const contractsTable = tables.find(table => table.name === 'contracts');
    
    if (contractsTable) {
        console.log('\n✅ Таблица contracts найдена!');
        
        // Получаем структуру таблицы contracts
        db.all("PRAGMA table_info(contracts)", (err, columns) => {
            if (err) {
                console.error('Ошибка при получении структуры таблицы:', err.message);
                return;
            }
            
            console.log('\n📊 Структура таблицы contracts:');
            columns.forEach(column => {
                console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
            });
            
            // Получаем информацию о внешних ключах
            db.all("PRAGMA foreign_key_list(contracts)", (err, foreignKeys) => {
                if (err) {
                    console.error('Ошибка при получении внешних ключей:', err.message);
                } else {
                    console.log('\n🔗 Внешние ключи:');
                    if (foreignKeys.length > 0) {
                        foreignKeys.forEach(fk => {
                            console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
                        });
                    } else {
                        console.log('  Внешние ключи не найдены');
                    }
                }
                
                // Получаем SQL создания таблицы
                db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='contracts'", (err, result) => {
                    if (err) {
                        console.error('Ошибка при получении SQL:', err.message);
                    } else {
                        console.log('\n📝 SQL создания таблицы:');
                        console.log(result.sql);
                    }
                    
                    // Получаем несколько записей для примера
                    db.all("SELECT * FROM contracts LIMIT 3", (err, rows) => {
                        if (err) {
                            console.error('Ошибка при получении данных:', err.message);
                        } else {
                            console.log('\n📄 Примеры записей:');
                            console.log(rows);
                        }
                        
                        db.close();
                    });
                });
            });
        });
    } else {
        console.log('\n❌ Таблица contracts не найдена!');
        
        // Ищем похожие таблицы
        const similarTables = tables.filter(table => 
            table.name.toLowerCase().includes('contract') || 
            table.name.toLowerCase().includes('document')
        );
        
        if (similarTables.length > 0) {
            console.log('\n🔍 Похожие таблицы:');
            similarTables.forEach(table => {
                console.log(`  - ${table.name}`);
            });
        }
        
        db.close();
    }
});