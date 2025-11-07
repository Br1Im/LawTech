-- Миграция для добавления CRM-синхронизации

-- Обновляем таблицу contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Обновляем таблицу clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Обновляем таблицу employees для связи с офисами
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS office_id INT,
ADD FOREIGN KEY IF NOT EXISTS (office_id) REFERENCES offices(id) ON DELETE SET NULL;

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

-- Создаем триггер для автоматического обновления статистики офиса при создании договора
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_contract_insert
AFTER INSERT ON contracts
FOR EACH ROW
BEGIN
  DECLARE v_office_id INT;
  
  -- Получаем office_id сотрудника
  SELECT office_id INTO v_office_id FROM employees WHERE id = NEW.id_employee;
  
  IF v_office_id IS NOT NULL THEN
    -- Обновляем статистику для всех периодов
    INSERT INTO office_stats (office_id, period_type, revenue, orders, updated_at)
    VALUES (v_office_id, 'day', NEW.amount, 1, NOW())
    ON DUPLICATE KEY UPDATE 
      revenue = revenue + NEW.amount,
      orders = orders + 1,
      updated_at = NOW();
      
    INSERT INTO office_stats (office_id, period_type, revenue, orders, updated_at)
    VALUES (v_office_id, 'week', NEW.amount, 1, NOW())
    ON DUPLICATE KEY UPDATE 
      revenue = revenue + NEW.amount,
      orders = orders + 1,
      updated_at = NOW();
      
    INSERT INTO office_stats (office_id, period_type, revenue, orders, updated_at)
    VALUES (v_office_id, 'month', NEW.amount, 1, NOW())
    ON DUPLICATE KEY UPDATE 
      revenue = revenue + NEW.amount,
      orders = orders + 1,
      updated_at = NOW();
      
    INSERT INTO office_stats (office_id, period_type, revenue, orders, updated_at)
    VALUES (v_office_id, 'year', NEW.amount, 1, NOW())
    ON DUPLICATE KEY UPDATE 
      revenue = revenue + NEW.amount,
      orders = orders + 1,
      updated_at = NOW();
  END IF;
END//
DELIMITER ;

-- Создаем триггер для автоматического обновления статистики при обновлении договора
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_contract_update
AFTER UPDATE ON contracts
FOR EACH ROW
BEGIN
  DECLARE v_office_id INT;
  DECLARE v_amount_diff DECIMAL(15,2);
  
  -- Получаем office_id сотрудника
  SELECT office_id INTO v_office_id FROM employees WHERE id = NEW.id_employee;
  
  -- Вычисляем разницу в сумме
  SET v_amount_diff = NEW.amount - OLD.amount;
  
  IF v_office_id IS NOT NULL AND v_amount_diff != 0 THEN
    -- Обновляем статистику для всех периодов
    UPDATE office_stats 
    SET revenue = revenue + v_amount_diff, updated_at = NOW()
    WHERE office_id = v_office_id;
  END IF;
END//
DELIMITER ;

-- Создаем триггер для автоматического обновления статистики при удалении договора
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_contract_delete
AFTER DELETE ON contracts
FOR EACH ROW
BEGIN
  DECLARE v_office_id INT;
  
  -- Получаем office_id сотрудника
  SELECT office_id INTO v_office_id FROM employees WHERE id = OLD.id_employee;
  
  IF v_office_id IS NOT NULL THEN
    -- Обновляем статистику для всех периодов
    UPDATE office_stats 
    SET revenue = revenue - OLD.amount, 
        orders = orders - 1,
        updated_at = NOW()
    WHERE office_id = v_office_id;
  END IF;
END//
DELIMITER ;
