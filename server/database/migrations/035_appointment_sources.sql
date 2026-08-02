-- Unified source directory for all appointments and lead-created records.
/*!40101 SET NAMES utf8mb4 */;
CREATE TABLE IF NOT EXISTS appointment_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_appointment_sources_name (name),
  KEY idx_appointment_sources_active (is_active),
  CONSTRAINT fk_appointment_sources_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @add_appointment_source_id = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN source_id INT NULL AFTER source',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'appointments'
    AND column_name = 'source_id'
);
PREPARE stmt_appointment_source_id FROM @add_appointment_source_id;
EXECUTE stmt_appointment_source_id;
DEALLOCATE PREPARE stmt_appointment_source_id;

SET @add_lead_source_id = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE call_center_leads ADD COLUMN source_id INT NULL AFTER source',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'call_center_leads'
    AND column_name = 'source_id'
);
PREPARE stmt_lead_source_id FROM @add_lead_source_id;
EXECUTE stmt_lead_source_id;
DEALLOCATE PREPARE stmt_lead_source_id;

INSERT IGNORE INTO appointment_sources (name)
VALUES
  ('Gainnet'),
  ('Правовед'),
  ('Авито'),
  ('2ГИС'),
  ('Сайт'),
  ('Telegram'),
  ('VK'),
  ('Повторный клиент'),
  ('Рекомендация'),
  ('Холодный звонок'),
  ('Пеший клиент'),
  ('Другое');

-- Preserve history while connecting legacy text sources to the directory.
INSERT IGNORE INTO appointment_sources (name)
SELECT DISTINCT TRIM(source)
FROM appointments
WHERE source IS NOT NULL AND TRIM(source) <> '';

INSERT IGNORE INTO appointment_sources (name)
SELECT DISTINCT TRIM(source)
FROM call_center_leads
WHERE source IS NOT NULL AND TRIM(source) <> '';

UPDATE appointments a
JOIN appointment_sources s ON BINARY s.name = BINARY TRIM(a.source)
SET a.source_id = s.id
WHERE a.source_id IS NULL AND a.source IS NOT NULL AND TRIM(a.source) <> '';

UPDATE call_center_leads l
JOIN appointment_sources s ON BINARY s.name = BINARY TRIM(l.source)
SET l.source_id = s.id
WHERE l.source_id IS NULL AND l.source IS NOT NULL AND TRIM(l.source) <> '';
