-- Создание таблицы статистики по сотрудникам

CREATE TABLE IF NOT EXISTS employee_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  period_value VARCHAR(50) NOT NULL,
  revenue DECIMAL(15,2) DEFAULT 0.00,
  orders INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY employee_period_value_unique (employee_id, period_type, period_value),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Индекс для быстрого поиска
CREATE INDEX idx_employee_stats_period ON employee_stats(employee_id, period_type, period_value);
