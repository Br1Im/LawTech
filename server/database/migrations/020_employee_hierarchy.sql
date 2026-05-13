-- Миграция: иерархическая система сотрудников

-- Добавляем новые поля в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS login VARCHAR(100) UNIQUE AFTER email;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) AFTER login;
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) AFTER last_name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT AFTER must_change_password;

-- Индекс для login
CREATE INDEX idx_users_login ON users(login);
