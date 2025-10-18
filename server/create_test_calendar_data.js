const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключение к базе данных
const dbPath = path.join(__dirname, 'database', 'lawtech.db');
const db = new sqlite3.Database(dbPath);

async function createTestData() {
  console.log('🔧 Создание тестовых данных для календаря...');

  try {
    // Создаем тестового клиента
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO clients (id, first_name, last_name, email, phone, office_id)
        VALUES (1, 'Иван', 'Петров', 'ivan.petrov@example.com', '+7-999-123-45-67', 1)
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Создаем тестовый договор
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO contracts (id, client_id, office_id, title, description, amount, status, start_date, end_date)
        VALUES (1, 1, 1, 'Договор консультации', 'Юридическая консультация по вопросам недвижимости', 50000, 'active', '2024-01-15', '2024-12-31')
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Создаем событие календаря
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO calendar_events (id, title, description, start_date, end_date, office_id, user_id, event_type)
        VALUES (1, 'Встреча с клиентом', 'Обсуждение договора', '2024-01-20 10:00:00', '2024-01-20 11:00:00', 1, 1, 'meeting')
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Тестовые данные созданы успешно');
    
    // Проверяем созданные данные
    console.log('\n📊 Проверка созданных данных:');
    
    db.all('SELECT * FROM clients', (err, clients) => {
      if (err) {
        console.error('❌ Ошибка при получении клиентов:', err);
      } else {
        console.log('👥 Клиенты:', clients.length);
      }
    });

    db.all('SELECT * FROM contracts', (err, contracts) => {
      if (err) {
        console.error('❌ Ошибка при получении договоров:', err);
      } else {
        console.log('📄 Договоры:', contracts.length);
      }
    });

    db.all('SELECT * FROM calendar_events', (err, events) => {
      if (err) {
        console.error('❌ Ошибка при получении событий:', err);
      } else {
        console.log('📅 События календаря:', events.length);
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
  } finally {
    db.close();
  }
}

createTestData();