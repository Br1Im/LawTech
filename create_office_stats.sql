CREATE TABLE IF NOT EXISTS office_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  period_type ENUM('day', 'week', 'month', 'year') NOT NULL,
  revenue DECIMAL(10, 2) DEFAULT 0,
  orders INT DEFAULT 0,
  clients INT DEFAULT 0,
  employees INT DEFAULT 0,
  expenses DECIMAL(10, 2) DEFAULT 0,
  documents INT DEFAULT 0,
  visits INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY office_period_unique (office_id, period_type),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);