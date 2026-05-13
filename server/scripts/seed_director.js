/**
 * Скрипт для создания аккаунта генерального директора
 * и очистки старых тестовых аккаунтов.
 *
 * Запуск: node scripts/seed_director.js
 */
const bcrypt = require('bcryptjs');
const db = require('../db');

const DIRECTOR_LOGIN = 'director';
const DIRECTOR_PASSWORD = 'director2024';

async function run() {
  try {
    console.log('=== Очистка тестовых аккаунтов ===');

    // Удаляем все тестовые аккаунты (те, у которых email оканчивается на @lawtech.com или @pravoved.ru)
    const [delResult] = await db.query(
      "DELETE FROM users WHERE email LIKE '%@lawtech.com' OR email LIKE '%@lawtech.ru' OR email LIKE '%@pravoved.ru'"
    );
    console.log(`Удалено тестовых аккаунтов: ${delResult.affectedRows}`);

    console.log('=== Создание генерального директора ===');

    // Проверяем, есть ли уже директор
    const [existing] = await db.query("SELECT id FROM users WHERE login = ?", [DIRECTOR_LOGIN]);
    if (existing.length > 0) {
      console.log('Директор уже существует (id:', existing[0].id, ')');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(DIRECTOR_PASSWORD, 10);

    const [result] = await db.query(`
      INSERT INTO users (first_name, last_name, middle_name, login, email, phone, password, role, office_id, is_active, must_change_password, created_at, updated_at)
      VALUES ('Генеральный', 'Директор', '', ?, ?, '+70000000000', ?, 'director', NULL, 1, 1, NOW(), NOW())
    `, [DIRECTOR_LOGIN, 'director@system.local', hashedPassword]);

    console.log('Директор создан (id:', result.insertId, ')');
    console.log('');
    console.log('========================================');
    console.log('  Логин:  ', DIRECTOR_LOGIN);
    console.log('  Пароль: ', DIRECTOR_PASSWORD);
    console.log('========================================');
    console.log('');
    console.log('При первом входе будет предложена смена пароля.');

    process.exit(0);
  } catch (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  }
}

run();
