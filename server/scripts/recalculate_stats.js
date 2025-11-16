const mysql = require('mysql2/promise');

async function recalculateStats() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'lawtech_root_password_2024',
    database: process.env.DB_NAME || 'lawtech_crm'
  });

  try {
    console.log('Подключение к базе данных...');
    
    // Получаем все договоры
    const [contracts] = await connection.query(`
      SELECT c.id, c.amount, c.paid_amount, c.contract_date, e.office_id
      FROM contracts c
      JOIN employees e ON c.id_employee = e.id
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
      
      const periods = [
        { type: 'day', value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
        { type: 'week', value: `${year}-W${week.toString().padStart(2, '0')}` },
        { type: 'month', value: `${year}-${month.toString().padStart(2, '0')}` },
        { type: 'year', value: year.toString() }
      ];
      
      // Используем paid_amount, если есть, иначе amount
      const paidAmount = contract.paid_amount || contract.amount;
      
      for (const period of periods) {
        await connection.query(
          `INSERT INTO office_stats (office_id, period_type, period_value, revenue, orders) 
           VALUES (?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE 
           revenue = revenue + VALUES(revenue),
           orders = orders + VALUES(orders)`,
          [contract.office_id, period.type, period.value, paidAmount]
        );
      }
      
      console.log(`Обработан договор #${contract.id}: Сумма договора ${contract.amount} ₽, Внесено ${paidAmount} ₽`);
    }
    
    console.log('✅ Статистика успешно пересчитана!');
    
    // Показываем результаты
    const [stats] = await connection.query('SELECT * FROM office_stats ORDER BY period_type, period_value');
    console.log('\nТекущая статистика:');
    console.table(stats);
    
  } catch (error) {
    console.error('❌ Ошибка при пересчете статистики:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

recalculateStats();
