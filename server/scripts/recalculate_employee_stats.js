const mysql = require('mysql2/promise');

async function recalculateEmployeeStats() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'lawtech_root_password_2024',
    database: process.env.DB_NAME || 'lawtech_crm'
  });

  try {
    console.log('Подключение к базе данных...');
    
    // Очищаем таблицу статистики сотрудников
    await connection.query('TRUNCATE TABLE employee_stats');
    console.log('Таблица employee_stats очищена');
    
    // Получаем все договоры с информацией о сотрудниках
    const [contracts] = await connection.query(`
      SELECT c.id, c.id_employee, c.amount, c.paid_amount, c.contract_date
      FROM contracts c
      ORDER BY c.contract_date
    `);
    
    console.log(`Найдено договоров: ${contracts.length}`);
    
    // Функция для получения номера недели
    function getWeekNumber(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    // Пересчитываем статистику для каждого договора
    for (const contract of contracts) {
      const date = new Date(contract.contract_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const week = getWeekNumber(date);
      
      const paidAmount = contract.paid_amount || contract.amount;
      
      const periods = [
        { type: 'day', value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
        { type: 'week', value: `${year}-W${week.toString().padStart(2, '0')}` },
        { type: 'month', value: `${year}-${month.toString().padStart(2, '0')}` },
        { type: 'year', value: year.toString() }
      ];
      
      for (const period of periods) {
        await connection.query(
          `INSERT INTO employee_stats (employee_id, period_type, period_value, revenue, orders) 
           VALUES (?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE 
           revenue = revenue + VALUES(revenue),
           orders = orders + VALUES(orders)`,
          [contract.id_employee, period.type, period.value, paidAmount]
        );
      }
      
      console.log(`Обработан договор #${contract.id}: Сотрудник ${contract.id_employee}, Внесено ${paidAmount} ₽`);
    }
    
    console.log('✅ Статистика сотрудников успешно пересчитана!');
    
    // Показываем результаты
    const [stats] = await connection.query(`
      SELECT es.*, e.first_name, e.last_name
      FROM employee_stats es
      JOIN employees e ON es.employee_id = e.id
      ORDER BY es.employee_id, es.period_type, es.period_value
    `);
    console.log('\nТекущая статистика сотрудников:');
    console.table(stats);
    
  } catch (error) {
    console.error('❌ Ошибка при пересчете статистики:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

recalculateEmployeeStats();
