CREATE TABLE IF NOT EXISTS client_phones (
  id INT NOT NULL AUTO_INCREMENT,
  client_id INT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  label VARCHAR(80) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_phone (client_id, phone),
  KEY idx_client_phones_client (client_id),
  CONSTRAINT fk_client_phones_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO client_phones (client_id, phone, label, is_primary)
SELECT id, TRIM(phone), 'Основной', 1 FROM clients WHERE phone IS NOT NULL AND TRIM(phone) <> '';
