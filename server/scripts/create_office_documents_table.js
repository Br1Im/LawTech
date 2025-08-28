const db = require('../db');

/**
 * Скрипт для создания таблицы документов офиса
 */
const createOfficeDocumentsTable = async () => {
  try {
    console.log('Создание таблицы документов офиса...');
    
    // Создание таблицы документов офиса
    await db.query(`
      CREATE TABLE IF NOT EXISTS office_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        client TEXT NOT NULL,
        office_id INTEGER NOT NULL,
        content TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица документов офиса создана успешно');
    
    // Создание индексов для ускорения поиска
    await db.query(`CREATE INDEX IF NOT EXISTS idx_office_documents_office_id ON office_documents(office_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_office_documents_status ON office_documents(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_office_documents_type ON office_documents(type)`);
    
    console.log('Индексы для таблицы документов офиса созданы успешно');
    
    // Добавление тестовых данных
    const officeId = 1; // ID офиса для тестовых данных
    
    // Проверяем, существует ли офис с таким ID
    const [offices] = await db.query('SELECT id FROM offices WHERE id = ?', [officeId]);
    
    if (offices.length > 0) {
      // Добавляем тестовые документы только если офис существует
      const testDocuments = [
        { 
          title: 'Договор купли-продажи №123', 
          type: 'Купля-продажа', 
          status: 'Подписан', 
          client: 'ООО "Ромашка"', 
          office_id: officeId,
          content: 'Содержание договора купли-продажи'
        },
        { 
          title: 'Договор оказания услуг №456', 
          type: 'Услуги', 
          status: 'На согласовании', 
          client: 'ИП Петров А.А.', 
          office_id: officeId,
          content: 'Содержание договора оказания услуг'
        },
        { 
          title: 'Договор аренды №789', 
          type: 'Аренда', 
          status: 'Черновик', 
          client: 'ООО "Техносервис"', 
          office_id: officeId,
          content: 'Содержание договора аренды'
        },
        { 
          title: 'Трудовой договор №234', 
          type: 'Трудовой', 
          status: 'Подписан', 
          client: 'Иванов И.И.', 
          office_id: officeId,
          content: 'Содержание трудового договора'
        },
        { 
          title: 'Договор поставки №567', 
          type: 'Поставка', 
          status: 'Расторгнут', 
          client: 'ООО "Альфа"', 
          office_id: officeId,
          content: 'Содержание договора поставки'
        }
      ];
      
      for (const doc of testDocuments) {
        await db.query(`
          INSERT INTO office_documents (title, type, status, client, office_id, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [doc.title, doc.type, doc.status, doc.client, doc.office_id, doc.content]);
      }
      
      console.log('Тестовые документы добавлены успешно');
    } else {
      console.log('Офис с ID', officeId, 'не найден. Тестовые документы не добавлены.');
    }
    
  } catch (error) {
    console.error('Ошибка при создании таблицы документов офиса:', error);
  }
};

// Запускаем создание таблицы
createOfficeDocumentsTable();