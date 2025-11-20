const db = require('../db');
const fs = require('fs');
const path = require('path');

/**
 * Скрипт для полного пересоздания базы данных
 * ВНИМАНИЕ: Удаляет все данные!
 * 
 * Использование:
 * node server/scripts/reset_database.js
 */

async function resetDatabase() {
  try {
    console.log('🔄 Начало пересоздания базы данных...\n');

    // Получаем имя БД из конфигурации
    const dbName = process.env.DB_NAME || 'lawtech_crm';

    console.log(`📊 База данных: ${dbName}`);
    console.log('⚠️  ВНИМАНИЕ: Все данные будут удалены!\n');

    // Ждем 3 секунды для отмены
    console.log('Отмена через 3 секунды... (Ctrl+C для отмены)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Получаем список всех таблиц
    console.log('\n📋 Получение списка таблиц...');
    const [tables] = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ?`,
      [dbName]
    );

    if (tables.length > 0) {
      console.log(`Найдено таблиц: ${tables.length}`);
      
      // Отключаем проверку внешних ключей
      await db.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Удаляем все таблицы
      for (const table of tables) {
        const tableName = table.table_name || table.TABLE_NAME;
        console.log(`  - Удаление таблицы: ${tableName}`);
        await db.query(`DROP TABLE IF EXISTS ${tableName}`);
      }
      
      // Включаем проверку внешних ключей
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('✅ Все таблицы удалены\n');
    } else {
      console.log('ℹ️  Таблицы не найдены\n');
    }

    // Применяем миграции
    console.log('📝 Применение миграций...\n');
    
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`  📄 Применение: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Разбиваем на отдельные запросы
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await db.query(statement);
        } catch (error) {
          // Игнорируем ошибки "already exists" и "duplicate"
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate')) {
            console.error(`     ⚠️  Ошибка: ${error.message}`);
          }
        }
      }
      
      console.log(`     ✅ Применено`);
    }

    console.log('\n✅ Миграции применены успешно\n');

    // Проверяем созданные таблицы
    console.log('🔍 Проверка созданных таблиц...\n');
    const [newTables] = await db.query(
      `SELECT table_name, table_rows 
       FROM information_schema.tables 
       WHERE table_schema = ?
       ORDER BY table_name`,
      [dbName]
    );

    console.log('Созданные таблицы:');
    newTables.forEach(table => {
      const tableName = table.table_name || table.TABLE_NAME;
      const rows = table.table_rows || table.TABLE_ROWS || 0;
      console.log(`  ✓ ${tableName.padEnd(25)} (${rows} строк)`);
    });

    console.log('\n========================================');
    console.log('✅ База данных успешно пересоздана!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка при пересоздании базы данных:', error);
    console.error('Детали:', error.message);
    process.exit(1);
  }
}

// Запуск
resetDatabase();
