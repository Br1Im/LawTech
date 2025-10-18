const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключение к базе данных
const dbPath = path.join(__dirname, 'database', 'lawtech.db');
console.log('Подключение к базе данных:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе данных:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Успешное подключение к базе данных');
        
        // Проверяем существование таблицы calendar_events
        console.log('\n🔍 Проверка существования таблицы calendar_events...');
        db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='calendar_events'
        `, (err, row) => {
            if (err) {
                console.error('❌ Ошибка при проверке таблицы:', err.message);
                db.close();
                return;
            }

            if (row) {
                console.log('✅ Таблица calendar_events существует');
                
                // Получаем структуру таблицы
                console.log('\n📋 Структура таблицы calendar_events:');
                db.all('PRAGMA table_info(calendar_events)', (err, columns) => {
                    if (err) {
                        console.error('❌ Ошибка при получении структуры таблицы:', err.message);
                        db.close();
                        return;
                    }
                    
                    columns.forEach(column => {
                        console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
                    });

                    // Проверяем количество записей
                    db.get('SELECT COUNT(*) as count FROM calendar_events', (err, countRow) => {
                        if (err) {
                            console.error('❌ Ошибка при подсчете записей:', err.message);
                            db.close();
                            return;
                        }
                        
                        console.log(`\n📊 Количество записей в таблице: ${countRow.count}`);

                        // Показываем первую запись если есть
                        if (countRow.count > 0) {
                            console.log('\n📝 Первая запись:');
                            db.get('SELECT * FROM calendar_events LIMIT 1', (err, firstRecord) => {
                                if (err) {
                                    console.error('❌ Ошибка при получении первой записи:', err.message);
                                } else {
                                    console.log(firstRecord);
                                }
                                
                                showAllTables();
                            });
                        } else {
                            showAllTables();
                        }
                    });
                });
            } else {
                console.log('❌ Таблица calendar_events НЕ существует');
                showAllTables();
            }
        });
    }
});

function showAllTables() {
    // Показываем все таблицы в базе данных
    console.log('\n📋 Все таблицы в базе данных:');
    db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `, (err, tables) => {
        if (err) {
            console.error('❌ Ошибка при получении списка таблиц:', err.message);
        } else {
            tables.forEach(table => {
                console.log(`  - ${table.name}`);
            });
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Ошибка при закрытии соединения:', err.message);
            } else {
                console.log('\n✅ Соединение с базой данных закрыто');
            }
        });
    });
}