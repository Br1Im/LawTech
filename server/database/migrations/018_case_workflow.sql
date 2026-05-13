-- Migration 018: "Дело клиента" workflow (lawyer → manager → expert)
-- + financial metadata on contracts (planned reimbursements, payment date)
-- + split client FIO into first/last/middle + "acting_for" (в чьих интересах)
-- + additional_tz table (Доп. ТЗ) attached to case.

DROP PROCEDURE IF EXISTS add_col_if_absent_018;

DELIMITER $$
CREATE PROCEDURE add_col_if_absent_018(
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

-- clients: split name + acting_for
CALL add_col_if_absent_018('clients', 'first_name',  'VARCHAR(128) NULL');
CALL add_col_if_absent_018('clients', 'last_name',   'VARCHAR(128) NULL');
CALL add_col_if_absent_018('clients', 'middle_name', 'VARCHAR(128) NULL');
CALL add_col_if_absent_018('clients', 'acting_for',  'VARCHAR(255) NULL');

-- contracts: financial info + payment_date
CALL add_col_if_absent_018('contracts', 'legal_cost_comp', 'DECIMAL(15,2) NULL');
CALL add_col_if_absent_018('contracts', 'moral_comp',      'DECIMAL(15,2) NULL');
CALL add_col_if_absent_018('contracts', 'payment_date',    'DATE NULL');

-- cases: workflow linking contract → manager → expert
CALL add_col_if_absent_018('cases', 'contract_id',     'INT NULL');
CALL add_col_if_absent_018('cases', 'manager_id',      'INT NULL');
CALL add_col_if_absent_018('cases', 'expert_id',       'INT NULL');
CALL add_col_if_absent_018('cases', 'workflow_status', "ENUM('with_manager','assigned_to_expert','in_progress','done','closed') NOT NULL DEFAULT 'with_manager'");

-- idx for manager inbox (MySQL 8 has no "CREATE INDEX IF NOT EXISTS")
DROP PROCEDURE IF EXISTS add_idx_if_absent_018;
DELIMITER $$
CREATE PROCEDURE add_idx_if_absent_018(
  IN p_table VARCHAR(64),
  IN p_idx VARCHAR(64),
  IN p_cols TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', p_idx, '` ON `', p_table, '` (', p_cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_idx_if_absent_018('cases', 'idx_cases_workflow', 'office_id, workflow_status');
CALL add_idx_if_absent_018('cases', 'idx_cases_contract', 'contract_id');
CALL add_idx_if_absent_018('cases', 'idx_cases_expert',   'expert_id, workflow_status');
DROP PROCEDURE IF EXISTS add_idx_if_absent_018;

-- additional_tz: дополнительные ТЗ в рамках существующего case
CREATE TABLE IF NOT EXISTS additional_tz (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  case_id INT NOT NULL,
  document_type VARCHAR(255) NULL,
  description TEXT NULL,
  purpose VARCHAR(500) NULL,
  expert_id INT NULL,
  manager_id INT NULL,
  deadline_days INT NULL,
  deadline_date DATE NULL,
  status ENUM('created','with_manager','assigned_to_expert','in_progress','done','closed')
    NOT NULL DEFAULT 'with_manager',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_atz_office (office_id),
  INDEX idx_atz_case (case_id),
  INDEX idx_atz_expert (expert_id, status),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS add_col_if_absent_018;
