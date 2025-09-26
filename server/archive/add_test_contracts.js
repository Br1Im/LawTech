const db = require('./db');

// Тестовые договоры для добавления в базу данных
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
  },
  {
    title: 'Договор банковского кредита',
    content: 'Кредитный договор между ПАО "Банк Развития" и Смирновым А.А. на сумму 3 000 000 рублей под 12% годовых. Срок кредита: 5 лет. Цель: покупка автомобиля.',
    category: 'Банковские услуги'
  },
  {
    title: 'Договор страхования автомобиля',
    content: 'Договор КАСКО на автомобиль BMW X5 2023 года выпуска. Страховая сумма: 4 500 000 рублей. Страховая премия: 180 000 рублей в год.',
    category: 'Страхование'
  },
  {
    title: 'Договор франшизы',
    content: 'Договор коммерческой концессии (франшизы) сети кофеен "Кофе Тайм". Паушальный взнос: 1 500 000 рублей. Роялти: 5% от оборота.',
    category: 'Франшиза'
  }
];

async function addTestContracts() {
  console.log('🚀 Начинаем добавление тестовых договоров...');
  
  try {
    // Проверяем, существует ли таблица
    const checkTable = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='legal_documents'
    `;
    
    const tableExists = await new Promise((resolve, reject) => {
      db.query(checkTable, (err, results) => {
        if (err) reject(err);
        else resolve(results && results.length > 0);
      });
    });
    
    if (!tableExists) {
      console.log('📋 Создаем таблицу legal_documents...');
      const createTable = `
        CREATE TABLE legal_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await new Promise((resolve, reject) => {
        db.query(createTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log('✅ Таблица legal_documents создана');
    }
    
    // Очищаем таблицу
    await new Promise((resolve, reject) => {
      db.query('DELETE FROM legal_documents', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('🧹 Таблица очищена');
    
    // Добавляем тестовые договоры
    for (let i = 0; i < testContracts.length; i++) {
      const contract = testContracts[i];
      const insertQuery = `
        INSERT INTO legal_documents (title, content, category)
        VALUES (?, ?, ?)
      `;
      
      await new Promise((resolve, reject) => {
        db.query(insertQuery, [contract.title, contract.content, contract.category], (err, result) => {
          if (err) reject(err);
          else {
            console.log(`✅ Добавлен договор ${i + 1}: ${contract.title}`);
            resolve(result);
          }
        });
      });
    }
    
    // Проверяем количество добавленных записей
    const countQuery = 'SELECT COUNT(*) as count FROM legal_documents';
    const count = await new Promise((resolve, reject) => {
      db.query(countQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results[0].count);
      });
    });
    
    console.log(`🎉 Успешно добавлено ${count} тестовых договоров!`);
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении тестовых договоров:', error);
  } finally {
    process.exit(0);
  }
}

// Запускаем скрипт
addTestContracts();