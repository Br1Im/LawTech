-- Migration 010: office plans (manual revenue targets per office)
CREATE TABLE IF NOT EXISTS office_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  daily_plan_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  period_plan_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_office_plans_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  INDEX idx_office_plans_office (office_id),
  INDEX idx_office_plans_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
