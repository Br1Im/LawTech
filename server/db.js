const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Конфигурация подключения к SQLite
const dbPath = process.env.DB_PATH || './database/lawtech.db';
const dbDir = path.dirname(dbPath);

// Создаем директорию для базы данных, если она не существует
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

// Функция для создания соединения с SQLite
function createConnection() {
  try {
    if (!db) {
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Ошибка подключения к SQLite:', err.message);
          throw err;
        } else {
          console.log('✅ Соединение с SQLite установлено');
          
          // Включаем поддержку внешних ключей
          db.run('PRAGMA foreign_keys = ON');
        }
      });
    }
    return db;
  } catch (err) {
    console.error('❌ Ошибка создания соединения SQLite:', err.message);
    throw err;
  }
}

// Инициализация подключения
createConnection();

console.log('Инициализация подключения к базе данных SQLite');

module.exports = {
  query: async (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        if (!db) {
          createConnection();
        }
        
        console.log('Выполнение запроса:', sql.substring(0, 50) + '...', params);
        
        // Определяем тип запроса
        const isSelect = sql.trim().toLowerCase().startsWith('select');
        
        if (isSelect) {
          db.all(sql, params, (err, rows) => {
            if (err) {
              console.error('Ошибка выполнения запроса:', err.message);
              console.error('Запрос:', sql);
              console.error('Параметры:', params);
              reject(err);
            } else {
              resolve([rows]); // Возвращаем в том же формате, что и MySQL/PostgreSQL
            }
          });
        } else {
          db.run(sql, params, function(err) {
            if (err) {
              console.error('Ошибка выполнения запроса:', err.message);
              console.error('Запрос:', sql);
              console.error('Параметры:', params);
              reject(err);
            } else {
              resolve([{ 
                affectedRows: this.changes, 
                insertId: this.lastID 
              }]);
            }
          });
        }
      } catch (err) {
        console.error('Ошибка выполнения запроса:', err.message);
        reject(err);
      }
    });
  },
  
  // Метод для закрытия соединения
  close: async () => {
    return new Promise((resolve, reject) => {
      try {
        if (db) {
          db.close((err) => {
            if (err) {
              console.error('Ошибка при закрытии базы данных:', err.message);
              reject(err);
            } else {
              db = null;
              console.log('База данных закрыта');
              resolve();
            }
          });
        } else {
          resolve();
        }
      } catch (err) {
        console.error('Ошибка при закрытии базы данных:', err.message);
        reject(err);
      }
    });
  },
  
  // Метод для получения соединения (для совместимости)
  getClient: async () => {
    try {
      if (!db) {
        createConnection();
      }
      return {
        query: module.exports.query,
        release: () => {}, // SQLite не требует освобождения соединения
        end: module.exports.close
      };
    } catch (err) {
      console.error('Ошибка получения клиента:', err.message);
      throw err;
    }
  }
};