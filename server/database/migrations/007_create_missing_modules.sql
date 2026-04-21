-- Migration 007: missing CRM modules (cases, expenses, arrivals, materials, join_requests)
-- + messages table (фикс для 006) + недостающие поля для клиентов

-- --------- MESSAGES (chat) --------------
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_office (office_id),
  INDEX idx_sender (sender_id),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- CASES (дела) --------------
CREATE TABLE IF NOT EXISTS cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  client_id INT NULL,
  employee_id INT NULL,
  title VARCHAR(255) NOT NULL,
  case_number VARCHAR(100) DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  status ENUM('new','in_progress','waiting','won','lost','closed') DEFAULT 'new',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  description TEXT,
  start_date DATE DEFAULT NULL,
  deadline DATE DEFAULT NULL,
  closed_at DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_office (office_id),
  INDEX idx_client (client_id),
  INDEX idx_employee (employee_id),
  INDEX idx_status (status),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- EXPENSES (расходы) --------------
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  category VARCHAR(100) DEFAULT 'Прочее',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  spent_on DATE NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_office (office_id),
  INDEX idx_date (spent_on),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- ARRIVALS (приходы / income) --------------
CREATE TABLE IF NOT EXISTS arrivals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  source VARCHAR(100) DEFAULT 'Оплата по договору',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  contract_id INT NULL,
  client_id INT NULL,
  received_on DATE NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_office (office_id),
  INDEX idx_date (received_on),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- MATERIALS (материалы дел) --------------
CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  case_id INT NULL,
  contract_id INT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Документ',
  description TEXT,
  file_url VARCHAR(500) DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  size_bytes BIGINT DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_office (office_id),
  INDEX idx_case (case_id),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- JOIN REQUESTS (заявки на вступление в офис) --------------
CREATE TABLE IF NOT EXISTS join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  office_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'lawyer',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_office (office_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- PATCH: add columns if not exist (MySQL 8 workaround) --------------
DROP PROCEDURE IF EXISTS add_col_if_absent;

DELIMITER $$
CREATE PROCEDURE add_col_if_absent(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_col_if_absent('clients', 'office_id', 'INT NULL');
CALL add_col_if_absent('clients', 'company', 'VARCHAR(255) NULL');
CALL add_col_if_absent('clients', 'status', "VARCHAR(50) DEFAULT 'active'");

DROP PROCEDURE IF EXISTS add_col_if_absent;

-- index (ignore if exists)
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'clients' AND index_name = 'idx_clients_office');
SET @sql := IF(@idx = 0, 'CREATE INDEX idx_clients_office ON clients(office_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
