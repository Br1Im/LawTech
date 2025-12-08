const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Создать таблицу employee_stats
 */
async function createEmployeeStatsTable() {
  let connection;
  
  try {
    console.log('🔧 Создание таблицы employee_stats...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lawtech_crm'
    });
    
    console.log('✅ Подключение к базе данных установлено\n');
    
    // Проверяем, существует ли таблица
    const [tables] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() 
       AND table_name = 'employee_stats'`
    );
    
    if (tables[0].count > 0) {
      console.log('✅ Таблица employee_stats уже существует');
      return;
    }
    
    console.log('📝 Создание таблицы employee_stats...');
    
    // Создаем таблицу
    await connection.query(`
      CREATE TABLE employee_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        period_type VARCHAR(20) NOT NULL,
        period_value VARCHAR(50) NOT NULL,
        revenue DECIMAL(15,2) DEFAULT 0.00,
        orders INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY employee_period_value_unique (employee_id, period_type, period_value),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Таблица employee_stats создана');
    
    // Создаем индекс
    console.log('📝 Создание индекса...');
    await connection.query(`
      CREATE INDEX idx_employee_stats_period 
      ON employee_stats(employee_id, period_type, period_value)
    `);
    
    console.log('✅ Индекс создан');
    
    // Проверяем структуру
    console.log('\n🔍 Структура таблицы employee_stats:');
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'employee_stats'
       ORDER BY ORDINAL_POSITION`
    );
    
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n✅ Таблица employee_stats успешно создана!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createEmployeeStatsTable();
