-- Миграция для добавления CRM-синхронизации

-- Обновляем таблицу contracts (проверяем существование колонок через процедуру)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS add_contract_columns()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='title') THEN
    ALTER TABLE contracts ADD COLUMN title VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='description') THEN
    ALTER TABLE contracts ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='start_date') THEN
    ALTER TABLE contracts ADD COLUMN start_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='end_date') THEN
    ALTER TABLE contracts ADD COLUMN end_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='created_at') THEN
    ALTER TABLE contracts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='updated_at') THEN
    ALTER TABLE contracts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  END IF;
END//
DELIMITER ;

CALL add_contract_columns();
DROP PROCEDURE IF EXISTS add_contract_columns;

-- Обновляем таблицу clients
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS add_client_columns()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='clients' AND column_name='created_at') THEN
    ALTER TABLE clients ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='clients' AND column_name='updated_at') THEN
    ALTER TABLE clients ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  END IF;
END//
DELIMITER ;

CALL add_client_columns();
DROP PROCEDURE IF EXISTS add_client_columns;

-- Обновляем таблицу employees для связи с офисами
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS add_employee_office()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='employees' AND column_name='office_id') THEN
    ALTER TABLE employees ADD COLUMN office_id INT;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='employees' AND constraint_name='fk_employees_office') THEN
    ALTER TABLE employees ADD CONSTRAINT fk_employees_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL;
  END IF;
END//
DELIMITER ;

CALL add_employee_office();
DROP PROCEDURE IF EXISTS add_employee_office;

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
CREATE INDEX IF NOT EXISTS idx_contracts_office ON contracts(id_employee);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(id_client);
CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(contract_date);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_expenses_office ON expenses(office_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_office ON calendar_events(office_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(start_date);
