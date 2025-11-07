-- Миграция для добавления CRM-синхронизации (MySQL)

-- Создаем таблицу для платежей (payments)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Создаем таблицу для расходов (expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_contracts_employee ON contracts(id_employee);
CREATE INDEX idx_contracts_client ON contracts(id_client);
CREATE INDEX idx_contracts_date ON contracts(contract_date);
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_expenses_office ON expenses(office_id);
CREATE INDEX idx_calendar_events_office ON calendar_events(office_id);
