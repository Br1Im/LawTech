-- Настройки расчёта зарплаты на офис: проценты от актов, пороги бонуса, ставка смены, цена пакета.
CREATE TABLE IF NOT EXISTS office_salary_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL UNIQUE,
  lawyer_percent DECIMAL(6,3) NOT NULL DEFAULT 10.000,
  lawyer_bonus_threshold DECIMAL(14,2) NOT NULL DEFAULT 500000.00,
  lawyer_bonus_percent DECIMAL(6,3) NOT NULL DEFAULT 12.000,
  okk_percent DECIMAL(6,3) NOT NULL DEFAULT 10.000,
  okk_bonus_threshold DECIMAL(14,2) NOT NULL DEFAULT 500000.00,
  okk_bonus_percent DECIMAL(6,3) NOT NULL DEFAULT 12.000,
  manager_office_percent DECIMAL(6,3) NOT NULL DEFAULT 5.000,
  representative_percent DECIMAL(6,3) NOT NULL DEFAULT 20.000,
  admin_shift_rate DECIMAL(12,2) NOT NULL DEFAULT 2000.00,
  expert_per_doc_amount DECIMAL(12,2) NOT NULL DEFAULT 1500.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT NULL,
  CONSTRAINT fk_oss_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  CONSTRAINT fk_oss_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Индивидуальный оклад/переопределения сотрудника.
CREATE TABLE IF NOT EXISTS employee_salaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL UNIQUE,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  custom_percent DECIMAL(6,3) NULL,
  custom_shift_rate DECIMAL(12,2) NULL,
  custom_per_doc DECIMAL(12,2) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT NULL,
  CONSTRAINT fk_es_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_es_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Журнал смен администраторов ресепшена.
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  employee_id INT NOT NULL,
  shift_date DATE NOT NULL,
  note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_shift (employee_id, shift_date),
  INDEX idx_shift_office_date (office_id, shift_date),
  CONSTRAINT fk_shift_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  CONSTRAINT fk_shift_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_shift_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
