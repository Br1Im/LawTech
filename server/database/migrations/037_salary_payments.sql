/*!40101 SET NAMES utf8mb4 */;
CREATE TABLE IF NOT EXISTS salary_payments (
  id INT NOT NULL AUTO_INCREMENT,
  office_id INT NOT NULL,
  employee_id INT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method ENUM('cash','noncash','bank') NOT NULL,
  status ENUM('paid','cancelled') NOT NULL DEFAULT 'paid',
  active_flag TINYINT NULL DEFAULT 1,
  calculation_snapshot JSON NULL,
  expense_id INT NULL,
  reversal_income_id INT NULL,
  paid_by INT NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_by INT NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(1000) NULL,
  replacement_payment_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salary_active_payment (office_id,employee_id,period_from,period_to,active_flag),
  KEY idx_salary_payment_period (office_id,period_from,period_to,status),
  CONSTRAINT fk_salary_payment_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_salary_payment_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_salary_payment_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_salary_payment_income FOREIGN KEY (reversal_income_id) REFERENCES office_income(id) ON DELETE SET NULL,
  CONSTRAINT fk_salary_payment_paid_by FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_salary_payment_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_snapshot := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payments' AND COLUMN_NAME='calculation_snapshot');
SET @sql := IF(@has_snapshot=0, "ALTER TABLE salary_payments ADD COLUMN calculation_snapshot JSON NULL AFTER active_flag", "SELECT 1"); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_income := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payments' AND COLUMN_NAME='reversal_income_id');
SET @sql := IF(@has_income=0, "ALTER TABLE salary_payments ADD COLUMN reversal_income_id INT NULL AFTER expense_id", "SELECT 1"); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_replacement := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payments' AND COLUMN_NAME='replacement_payment_id');
SET @sql := IF(@has_replacement=0, "ALTER TABLE salary_payments ADD COLUMN replacement_payment_id INT NULL AFTER cancellation_reason", "SELECT 1"); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_active := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payments' AND COLUMN_NAME='active_flag');
SET @sql := IF(@has_active=0, "ALTER TABLE salary_payments ADD COLUMN active_flag TINYINT NULL DEFAULT 1 AFTER status", "SELECT 1"); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Старые автоматические расходы не подтверждают реальную выплату.
DELETE FROM expenses WHERE source_type = 'salary';
SET @has_income_source_type := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='office_income' AND COLUMN_NAME='source_type');
SET @sql := IF(@has_income_source_type=0, "ALTER TABLE office_income ADD COLUMN source_type VARCHAR(50) NULL, ADD COLUMN source_id INT NULL, ADD INDEX idx_income_source (source_type,source_id)", "SELECT 1");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;SET @has_income_source_type := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='office_income' AND COLUMN_NAME='source_type');
SET @sql := IF(@has_income_source_type=0, "ALTER TABLE office_income ADD COLUMN source_type VARCHAR(50) NULL AFTER created_by", "SELECT 1"); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_income_source_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='office_income' AND COLUMN_NAME='source_id');
SET @sql := IF(@has_income_source_id=0, "ALTER TABLE office_income ADD COLUMN source_id INT NULL AFTER source_type", "SELECT 1"); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
