const db = require('../db');

/**
 * Скрипт для проверки структуры таблицы contracts
 */
const checkContractsTable = async () => {
  try {
    console.log('🔍 Проверка структуры таблицы contracts...');
    
    // Проверяем существование таблицы
    const [tableExists] = await db.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'
    `);
    
    if (tableExists.length === 0) {
      console.log('❌ Таблица contracts не существует');
      return;
    }
    
    console.log('✅ Таблица contracts существует');
    
    // Получаем структуру таблицы
    const tableInfo = await db.query(`PRAGMA table_info(contracts)`);
    
    console.log('📋 Структура таблицы contracts:');
    console.log('tableInfo:', tableInfo);
    
    if (Array.isArray(tableInfo)) {
      tableInfo.forEach(column => {
        console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    // Проверяем количество записей
    const count = await db.query('SELECT COUNT(*) as count FROM contracts');
    console.log(`📊 Количество записей в таблице: ${Array.isArray(count) ? count[0].count : count.count}`);
    
    // Если таблица пустая или неправильная структура, удаляем её
    const hasCreatedBy = Array.isArray(tableInfo) ? tableInfo.some(col => col.name === 'created_by') : false;
    if (!hasCreatedBy) {
      console.log('⚠️ Таблица contracts имеет неправильную структуру, удаляем её...');
      await db.query('DROP TABLE IF EXISTS contracts');
      console.log('✅ Таблица contracts удалена');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке таблицы contracts:', error);
  }
};

// Если скрипт запускается напрямую
if (require.main === module) {
  checkContractsTable()
    .then(() => {
      console.log('✅ Проверка завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { checkContractsTable };