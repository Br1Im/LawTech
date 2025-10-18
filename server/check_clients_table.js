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

// Проверяем структуру таблицы clients
db.all("PRAGMA table_info(clients)", (err, columns) => {
    if (err) {
        console.error('Ошибка при получении структуры таблицы:', err.message);
        return;
    }
    
    console.log('\n📊 Структура таблицы clients:');
    columns.forEach(column => {
        console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
    });
    
    // Получаем информацию о внешних ключах
    db.all("PRAGMA foreign_key_list(clients)", (err, foreignKeys) => {
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
        db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='clients'", (err, result) => {
            if (err) {
                console.error('Ошибка при получении SQL:', err.message);
            } else {
                console.log('\n📝 SQL создания таблицы:');
                console.log(result.sql);
            }
            
            // Получаем несколько записей для примера
            db.all("SELECT * FROM clients LIMIT 3", (err, rows) => {
                if (err) {
                    console.error('Ошибка при получении данных:', err.message);
                } else {
                    console.log('\n📄 Примеры записей:');
                    console.log(rows);
                }
                
                // Тестируем создание клиента
                console.log('\n🧪 Тестирование создания клиента...');
                db.run(`
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
                    'Клиент',
                    null,
                    null,
                    null,
                    null,
                    'Тестовый клиент'
                ], function(err) {
                    if (err) {
                        console.error('❌ Ошибка создания клиента:', err.message);
                    } else {
                        console.log('✅ Клиент создан успешно, ID:', this.lastID);
                    }
                    
                    db.close();
                });
            });
        });
    });
});