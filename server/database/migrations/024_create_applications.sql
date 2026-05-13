-- Заявления клиентов
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  client_name VARCHAR(500) NOT NULL,
  topic VARCHAR(500) DEFAULT NULL,
  lawyer_name VARCHAR(255) DEFAULT NULL,
  employee_id INT DEFAULT NULL,
  status ENUM('new','in_progress','done') DEFAULT 'new',
  comment TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_office (office_id)
);
