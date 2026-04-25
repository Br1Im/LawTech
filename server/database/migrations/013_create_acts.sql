-- Migration 013: Acts (акты выполненных работ по договорам).
-- Акт фиксирует факт оказания услуги: подготовка документов или этап
-- судебного представительства. Тип наследуется из contract.contract_type.
-- Confirmed-акты участвуют в расчёте зарплаты (расчёт в отдельном модуле).

CREATE TABLE IF NOT EXISTS acts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  contract_id INT NOT NULL,
  act_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL DEFAULT 'docs',
  responsible_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  description TEXT NULL,
  created_by INT NULL,
  confirmed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_acts_office (office_id),
  INDEX idx_acts_contract (contract_id),
  INDEX idx_acts_responsible (responsible_id),
  INDEX idx_acts_date (act_date),
  INDEX idx_acts_status (status),
  INDEX idx_acts_type (type),
  CONSTRAINT fk_acts_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  CONSTRAINT fk_acts_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_acts_employee FOREIGN KEY (responsible_id) REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_acts_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
