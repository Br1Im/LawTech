const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

console.log('🔍 Проверяем все договоры в базе данных...\n');

db.all(`
  SELECT 
    id, 
    client_name, 
    contract_number, 
    contract_type, 
    status, 
    contract_date, 
    office_id 
  FROM contracts 
  ORDER BY contract_date
`, (err, rows) => {
  if (err) {
    console.error('❌ Ошибка при получении договоров:', err);
  } else {
    console.log(`📊 Всего договоров в базе: ${rows.length}\n`);
    
    if (rows.length > 0) {
      console.log('📋 Список всех договоров:');
      console.log('─'.repeat(80));
      
      rows.forEach((contract, index) => {
        console.log(`${index + 1}. ID: ${contract.id}`);
        console.log(`   Клиент: ${contract.client_name}`);
        console.log(`   Номер: ${contract.contract_number}`);
        console.log(`   Тип: ${contract.contract_type}`);
        console.log(`   Статус: ${contract.status}`);
        console.log(`   Дата: ${contract.contract_date}`);
        console.log(`   Офис: ${contract.office_id}`);
        console.log('─'.repeat(40));
      });
      
      // Группировка по офисам
      const byOffice = {};
      rows.forEach(contract => {
        if (!byOffice[contract.office_id]) {
          byOffice[contract.office_id] = [];
        }
        byOffice[contract.office_id].push(contract);
      });
      
      console.log('\n📊 Статистика по офисам:');
      Object.keys(byOffice).forEach(officeId => {
        console.log(`Офис ${officeId}: ${byOffice[officeId].length} договоров`);
      });
      
      // Договоры с датами
      const withDates = rows.filter(c => c.contract_date);
      console.log(`\n📅 Договоры с датами: ${withDates.length} из ${rows.length}`);
      
      if (withDates.length > 0) {
        console.log('Договоры с датами:');
        withDates.forEach(contract => {
          console.log(`  - ${contract.contract_number} (${contract.contract_date}) - Офис ${contract.office_id}`);
        });
      }
    }
  }
  
  db.close();
});