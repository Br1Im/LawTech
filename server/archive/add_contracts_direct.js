const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, 'lawtech.db');

// Тестовые договоры
const testContracts = [
  {
    title: 'Договор купли-продажи недвижимости',
    content: 'Договор купли-продажи квартиры по адресу г. Москва, ул. Тверская, д. 10, кв. 25. Продавец: Иванов И.И., покупатель: Петров П.П. Стоимость: 15 000 000 рублей.',
    category: 'Недвижимость'
  },
  {
    title: 'Трудовой договор с программистом',
    content: 'Трудовой договор между ООО "ТехКомпани" и Сидоровым С.С. на должность Senior Frontend Developer. Оклад: 200 000 рублей в месяц. Испытательный срок: 3 месяца.',
    category: 'Трудовое право'
  },
  {
    title: 'Договор аренды офисного помещения',
    content: 'Договор аренды офисного помещения площадью 150 кв.м. в БЦ "Москва-Сити". Арендодатель: ООО "Недвижимость Плюс", арендатор: ООО "Стартап Инновации". Арендная плата: 300 000 рублей в месяц.',
    category: 'Аренда'
  },
  {
    title: 'Договор поставки товаров',
    content: 'Договор поставки компьютерной техники между ООО "ТехПоставка" и ООО "Офис Решения". Общая стоимость поставки: 2 500 000 рублей. Срок поставки: 30 дней.',
    category: 'Поставка'
  },
  {
    title: 'Договор оказания юридических услуг',
    content: 'Договор на оказание юридических услуг по ведению арбитражного дела между Юридической фирмой "Правовед" и ООО "Клиент Сервис". Стоимость услуг: 500 000 рублей.',
    category: 'Юридические услуги'
  }
];

function addContractsDirectly() {
  console.log('🚀 Начинаем добавление договоров напрямую в базу данных...');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к базе данных установлено');
  });

  // Создаем таблицу если её нет
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS legal_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('❌ Ошибка создания таблицы:', err.message);
      return;
    }
    console.log('✅ Таблица legal_documents готова');

    // Очищаем таблицу
    db.run('DELETE FROM legal_documents', (err) => {
      if (err) {
        console.error('❌ Ошибка очистки таблицы:', err.message);
        return;
      }
      console.log('🧹 Таблица очищена');

      // Добавляем договоры
      const insertSQL = `
        INSERT INTO legal_documents (title, content, category, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `;

      let addedCount = 0;
      testContracts.forEach((contract, index) => {
        db.run(insertSQL, [contract.title, contract.content, contract.category], function(err) {
          if (err) {
            console.error(`❌ Ошибка добавления договора "${contract.title}":`, err.message);
          } else {
            console.log(`✅ Добавлен договор ${index + 1}: ${contract.title} (ID: ${this.lastID})`);
            addedCount++;
          }

          // Если это последний договор, проверяем результат
          if (index === testContracts.length - 1) {
            setTimeout(() => {
              db.get('SELECT COUNT(*) as count FROM legal_documents', (err, row) => {
                if (err) {
                  console.error('❌ Ошибка подсчета договоров:', err.message);
                } else {
                  console.log(`🎉 Всего договоров в базе данных: ${row.count}`);
                }
                
                db.close((err) => {
                  if (err) {
                    console.error('❌ Ошибка закрытия базы данных:', err.message);
                  } else {
                    console.log('✅ Соединение с базой данных закрыто');
                  }
                });
              });
            }, 500);
          }
        });
      });
    });
  });
}

// Запускаем скрипт
addContractsDirectly();