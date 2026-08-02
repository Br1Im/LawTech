-- API-ключи поставщиков лидов (Правовед / myleads.feedot.com) по офисам.
-- Ключи добавляет генеральный директор (роль director, владелец офиса).
CREATE TABLE IF NOT EXISTS office_lead_api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'pravoved',
  label VARCHAR(255) DEFAULT NULL,
  api_key TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  last_verified_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_office_lead_api_keys_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  INDEX idx_office_lead_api_keys_office (office_id, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
