const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Путь к файлу базы данных SQLite
const dbPath = path.join(__dirname, 'lawtech.db');

let db = null;

// Создание подключения к SQLite
function createConnection() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Подключение к SQLite установлено');
      
      // Включаем поддержку внешних ключей
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('❌ Ошибка включения внешних ключей:', err.message);
        } else {
          console.log('✅ Внешние ключи включены');
        }
      });
      
      resolve(db);
    });
  });
}

// Выполнение запроса
async function query(sql, params = []) {
  try {
    const connection = await createConnection();
    
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        connection.all(sql, params, (err, rows) => {
          if (err) {
            console.error('❌ Ошибка выполнения SELECT запроса:', err.message);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        connection.run(sql, params, function(err) {
          if (err) {
            console.error('❌ Ошибка выполнения запроса:', err.message);
            reject(err);
          } else {
            resolve({
              insertId: this.lastID,
              affectedRows: this.changes,
              changedRows: this.changes
            });
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    throw error;
  }
}

// Закрытие соединения
function closeConnection() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Ошибка закрытия соединения:', err.message);
      } else {
        console.log('✅ Соединение с SQLite закрыто');
      }
    });
    db = null;
  }
}

module.exports = {
  query,
  createConnection,
  closeConnection
};