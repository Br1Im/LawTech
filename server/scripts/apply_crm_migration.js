const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Применить миграцию для CRM-синхронизации
 */
async function applyCRMMigration() {
  try {
    console.log('🔄 Применение миграции CRM-синхронизации...');
    
    // Читаем SQL-файл миграции
    const migrationPath = path.join(__dirname, '../database/migrations/001_crm_sync.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Разбиваем на отдельные запросы (по точке с запятой)
    const queries = migrationSQL
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));
    
    console.log(`📝 Найдено ${queries.length} SQL-запросов`);
    
    // Выполняем каждый запрос
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // Пропускаем комментарии и пустые строки
      if (query.startsWith('--') || query.trim().length === 0) {
        continue;
      }
      
      try {
        console.log(`⚙️  Выполнение запроса ${i + 1}/${queries.length}...`);
        await db.query(query);
        console.log(`✅ Запрос ${i + 1} выполнен успешно`);
      } catch (error) {
        // Игнорируем ошибки "уже существует"
        if (error.code === 'ER_DUP_FIELDNAME' || 
            error.code === 'ER_DUP_KEYNAME' ||
            error.message.includes('already exists')) {
          console.log(`⚠️  Запрос ${i + 1} пропущен (уже существует)`);
        } else {
          console.error(`❌ Ошибка в запросе ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Миграция CRM-синхронизации применена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
applyCRMMigration();
