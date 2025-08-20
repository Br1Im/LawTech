const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Путь к файлу базы данных SQLite
const dbPath = path.join(__dirname, 'lawtech.db');

// Создание подключения к SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных SQLite:', err.message);
  } else {
    console.log('✅ Успешное подключение к базе данных SQLite');
  }
});

console.log('Инициализация подключения к базе данных SQLite');

// Включаем поддержку внешних ключей
db.run('PRAGMA foreign_keys = ON');

module.exports = {
  query: async (sql, params = []) => {
    return new Promise((resolve, reject) => {
      console.log('Выполнение запроса:', sql.substring(0, 50) + '...', params);
      
      // Определяем тип запроса
      const sqlType = sql.trim().toUpperCase();
      
      if (sqlType.startsWith('SELECT')) {
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Ошибка выполнения SELECT запроса:', err.message);
            reject(err);
          } else {
            resolve([rows]); // Возвращаем в формате [rows] для совместимости с MySQL
          }
        });
      } else if (sqlType.startsWith('INSERT')) {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('Ошибка выполнения INSERT запроса:', err.message);
            reject(err);
          } else {
            resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
          }
        });
      } else {
        // UPDATE, DELETE, CREATE TABLE и другие
        db.run(sql, params, function(err) {
          if (err) {
            console.error('Ошибка выполнения запроса:', err.message);
            reject(err);
          } else {
            resolve([{ affectedRows: this.changes }]);
          }
        });
      }
    });
  },
  
  // Метод для закрытия соединения
  close: () => {
    return new Promise((resolve) => {
      db.close((err) => {
        if (err) {
          console.error('Ошибка при закрытии базы данных:', err.message);
        } else {
          console.log('База данных закрыта');
        }
        resolve();
      });
    });
  }
};