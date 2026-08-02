CREATE TABLE IF NOT EXISTS employee_dismissals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  office_id INT NOT NULL,
  successor_id INT NOT NULL,
  dismissed_by INT NOT NULL,
  reason VARCHAR(500) DEFAULT NULL,
  transfer_summary JSON NOT NULL,
  dismissed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_employee_dismissals_employee (employee_id),
  KEY idx_employee_dismissals_office (office_id, dismissed_at),
  KEY idx_employee_dismissals_successor (successor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
