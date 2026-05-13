-- Таблица для авто-назначения договоров сотрудникам по ролям
CREATE TABLE IF NOT EXISTS contract_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(30) NOT NULL,
  assignment_type ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
  status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contract_user (contract_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_contract_id (contract_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Флаг: нужно ли юристу дополнить данные по договору
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS needs_lawyer_input TINYINT(1) DEFAULT 0;

-- Связь между appointment (приход) и contract (договор) — для отслеживания
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS appointment_id INT DEFAULT NULL;
