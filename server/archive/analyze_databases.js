const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const oldDbPath = path.join(__dirname, 'database.db');
const newDbPath = path.join(__dirname, 'lawtech.db');

function analyzeDatabase(dbPath, dbName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Анализируем ${dbName} (${dbPath})...`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`❌ Ошибка подключения к ${dbName}:`, err.message);
        reject(err);
        return;
      }
      console.log(`✅ Подключение к ${dbName} установлено`);
    });

    const analysis = {
      name: dbName,
      path: dbPath,
      tables: {},
      tableCount: 0
    };

    // Получаем список всех таблиц
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
      if (err) {
        console.error(`❌ Ошибка получения списка таблиц из ${dbName}:`, err.message);
        reject(err);
        return;
      }

      analysis.tableCount = tables.length;
      console.log(`📋 Найдено таблиц в ${dbName}: ${tables.length}`);

      if (tables.length === 0) {
        console.log(`⚠️ ${dbName} не содержит таблиц`);
        db.close();
        resolve(analysis);
        return;
      }

      let processedTables = 0;

      tables.forEach((table) => {
        const tableName = table.name;
        console.log(`\n📊 Анализируем таблицу: ${tableName}`);

        // Получаем структуру таблицы
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
          if (err) {
            console.error(`❌ Ошибка получения структуры таблицы ${tableName}:`, err.message);
            processedTables++;
            if (processedTables === tables.length) {
              db.close();
              resolve(analysis);
            }
            return;
          }

          // Получаем количество записей
          db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countResult) => {
            if (err) {
              console.error(`❌ Ошибка подсчета записей в таблице ${tableName}:`, err.message);
              processedTables++;
              if (processedTables === tables.length) {
                db.close();
                resolve(analysis);
              }
              return;
            }

            const recordCount = countResult.count;
            
            analysis.tables[tableName] = {
              columns: columns,
              recordCount: recordCount
            };

            console.log(`   📝 Колонки (${columns.length}):`);
            columns.forEach(col => {
              const pk = col.pk ? ' [PK]' : '';
              const notNull = col.notnull ? ' NOT NULL' : '';
              const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
              console.log(`      - ${col.name}: ${col.type}${pk}${notNull}${defaultVal}`);
            });
            console.log(`   📊 Записей: ${recordCount}`);

            processedTables++;
            if (processedTables === tables.length) {
              db.close();
              resolve(analysis);
            }
          });
        });
      });
    });
  });
}

async function main() {
  console.log('🔍 АНАЛИЗ СТРУКТУРЫ БАЗ ДАННЫХ');
  console.log('=====================================');

  try {
    const oldDbAnalysis = await analyzeDatabase(oldDbPath, 'database.db (старая)');
    const newDbAnalysis = await analyzeDatabase(newDbPath, 'lawtech.db (новая)');

    console.log('\n\n📊 СВОДКА АНАЛИЗА');
    console.log('=====================================');
    
    console.log(`\n🗄️ ${oldDbAnalysis.name}:`);
    console.log(`   📋 Таблиц: ${oldDbAnalysis.tableCount}`);
    Object.keys(oldDbAnalysis.tables).forEach(tableName => {
      const table = oldDbAnalysis.tables[tableName];
      console.log(`   📊 ${tableName}: ${table.recordCount} записей, ${table.columns.length} колонок`);
    });

    console.log(`\n🗄️ ${newDbAnalysis.name}:`);
    console.log(`   📋 Таблиц: ${newDbAnalysis.tableCount}`);
    Object.keys(newDbAnalysis.tables).forEach(tableName => {
      const table = newDbAnalysis.tables[tableName];
      console.log(`   📊 ${tableName}: ${table.recordCount} записей, ${table.columns.length} колонок`);
    });

    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('=====================================');
    
    // Анализируем пересечения таблиц
    const oldTables = Object.keys(oldDbAnalysis.tables);
    const newTables = Object.keys(newDbAnalysis.tables);
    const commonTables = oldTables.filter(table => newTables.includes(table));
    const oldOnlyTables = oldTables.filter(table => !newTables.includes(table));
    const newOnlyTables = newTables.filter(table => !oldTables.includes(table));

    if (commonTables.length > 0) {
      console.log(`🔄 Общие таблицы (требуют слияния): ${commonTables.join(', ')}`);
    }
    
    if (oldOnlyTables.length > 0) {
      console.log(`📤 Таблицы только в старой БД (нужно перенести): ${oldOnlyTables.join(', ')}`);
    }
    
    if (newOnlyTables.length > 0) {
      console.log(`📥 Таблицы только в новой БД (уже есть): ${newOnlyTables.join(', ')}`);
    }

    // Определяем стратегию миграции
    console.log('\n🎯 СТРАТЕГИЯ ОБЪЕДИНЕНИЯ:');
    if (newDbAnalysis.tableCount > 0) {
      console.log('   1. Использовать lawtech.db как основную базу данных');
      console.log('   2. Перенести недостающие таблицы из database.db');
      console.log('   3. Объединить данные из общих таблиц');
      console.log('   4. Обновить все конфигурационные файлы');
    } else {
      console.log('   1. Создать новую единую базу данных');
      console.log('   2. Перенести все таблицы и данные');
      console.log('   3. Обновить все конфигурационные файлы');
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error.message);
  }
}

main();