/**
 * Скрипт для сброса паролей тестовых аккаунтов
 */
const bcrypt = require('bcryptjs');
const db = require('../db');

/**
 * Функция для сброса паролей тестовых аккаунтов
 */
async function resetTestPasswords() {
  try {
    console.log('🔑 Начало сброса паролей тестовых аккаунтов...');
    
    // Список тестовых аккаунтов
    const testAccounts = [
      { email: 'lawyer1@pravoved.ru', password: 'lawyer123' },
      { email: 'admin@lawtech.ru', password: 'admin123' },
      { email: 'director@pravoved.ru', password: 'director123' }
    ];
    
    for (const account of testAccounts) {
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      // Обновляем пароль в базе данных
      const [result] = await db.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, account.email]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ Пароль для ${account.email} успешно сброшен`);
      } else {
        console.log(`⚠️ Пользователь ${account.email} не найден`);
      }
    }
    
    console.log('✅ Сброс паролей тестовых аккаунтов завершен');
  } catch (error) {
    console.error('❌ Ошибка при сбросе паролей:', error);
  }
}

// Запускаем функцию сброса паролей
resetTestPasswords();