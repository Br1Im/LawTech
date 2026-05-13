-- Регистрация договора Администратором: новые поля
ALTER TABLE contracts
  ADD COLUMN contract_number VARCHAR(20) DEFAULT NULL,
  ADD COLUMN additional_payment_date DATE DEFAULT NULL,
  ADD COLUMN additional_payment_amount DECIMAL(15,2) DEFAULT NULL,
  ADD COLUMN registered_by INT DEFAULT NULL,
  ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash',
  ADD COLUMN on_behalf_of VARCHAR(500) DEFAULT NULL;

CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX idx_contracts_registered_by ON contracts(registered_by);

-- Таблица для хранения настроек 14-дневного периода (задаётся Ген. директором)
CREATE TABLE IF NOT EXISTS contract_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  period_start DATE NOT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cp_office (office_id, period_start)
);
