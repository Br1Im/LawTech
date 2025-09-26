const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./lawtech.db');

console.log('Проверяем таблицу legal_documents...');

// Проверяем структуру таблицы legal_documents
db.all("PRAGMA table_info(legal_documents)", (err, columns) => {
  if (err) {
    console.error('Ошибка при получении структуры таблицы:', err);
    return;
  }
  
  console.log('\nСтруктура таблицы legal_documents:');
  columns.forEach(col => {
    console.log(`- ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Проверяем содержимое таблицы
  db.all("SELECT * FROM legal_documents", (err, documents) => {
    if (err) {
      console.error('Ошибка при получении документов:', err);
    } else {
      console.log(`\nНайдено документов: ${documents.length}`);
      
      if (documents.length > 0) {
        console.log('\nПримеры документов:');
        documents.forEach((doc, index) => {
          console.log(`\n${index + 1}. ID: ${doc.id}`);
          console.log(`   Название: "${doc.title}"`);
          console.log(`   Категория: ${doc.category || 'не указана'}`);
          console.log(`   Office ID: ${doc.office_id || 'не указан'}`);
          console.log(`   User ID: ${doc.user_id || 'не указан'}`);
          console.log(`   Дата создания: ${doc.created_at}`);
          
          // Проверяем есть ли поля с датами
          Object.keys(doc).forEach(key => {
            if (key.includes('date') || key.includes('Date')) {
              console.log(`   ${key}: ${doc[key]}`);
            }
          });
        });
      }
    }
    
    db.close();
  });
});