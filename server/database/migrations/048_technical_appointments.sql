-- LT-016: system rows are excluded from business analytics.
ALTER TABLE appointments ADD COLUMN is_technical TINYINT(1) NOT NULL DEFAULT 0 AFTER manager_comment;
CREATE INDEX idx_appointments_office_technical_date ON appointments(office_id, is_technical, appointment_date);

-- Historical cleanup comments used by the E2E and maintenance flow.
UPDATE appointments
SET is_technical = 1
WHERE status = 'cancelled'
  AND manager_comment IN (
    'Технический дубль тестовой записи выведен из активной воронки.',
    'Техническая запись исключена из бизнес-аналитики.'
  );
