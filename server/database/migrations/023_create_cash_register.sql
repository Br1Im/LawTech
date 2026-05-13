-- Касса: журнал ежедневных финансовых операций
CREATE TABLE IF NOT EXISTS cash_register (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  entry_date DATE NOT NULL,
  client_name VARCHAR(500) DEFAULT NULL,
  contract_number VARCHAR(50) DEFAULT NULL,
  action VARCHAR(255) DEFAULT NULL,
  lawyer_name VARCHAR(255) DEFAULT NULL,
  employee_id INT DEFAULT NULL,
  cash_amount DECIMAL(15,2) DEFAULT 0,
  noncash_amount DECIMAL(15,2) DEFAULT 0,
  bank_amount DECIMAL(15,2) DEFAULT 0,
  expense_amount DECIMAL(15,2) DEFAULT 0,
  comment TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cash_office_date (office_id, entry_date)
);
