/*!40101 SET NAMES utf8mb4 */;

CREATE TABLE IF NOT EXISTS contract_payments (
  id INT NOT NULL AUTO_INCREMENT,
  contract_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
  payment_type VARCHAR(20) NOT NULL DEFAULT 'additional',
  comment TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed TINYINT(1) NOT NULL DEFAULT 1,
  confirmed_by INT NULL,
  confirmed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contract_id (contract_id),
  KEY idx_contract_payment_date (payment_date),
  KEY idx_confirmed (confirmed),
  CONSTRAINT contract_payments_ibfk_1
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE contract_payments
  MODIFY COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
  MODIFY COLUMN created_by INT NULL,
  MODIFY COLUMN confirmed TINYINT(1) NOT NULL DEFAULT 1;

SET @has_payment_type := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contract_payments'
    AND COLUMN_NAME = 'payment_type'
);
SET @sql := IF(
  @has_payment_type = 0,
  "ALTER TABLE contract_payments ADD COLUMN payment_type VARCHAR(20) NOT NULL DEFAULT 'additional' AFTER payment_method",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_payment_date_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contract_payments'
    AND INDEX_NAME = 'idx_contract_payment_date'
);
SET @sql := IF(
  @has_payment_date_index = 0,
  "CREATE INDEX idx_contract_payment_date ON contract_payments(payment_date)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE contract_payments
SET payment_type = 'additional'
WHERE payment_type IS NULL OR payment_type = '';

INSERT INTO contract_payments (
  contract_id,
  amount,
  payment_date,
  payment_method,
  payment_type,
  comment,
  created_by,
  created_at,
  confirmed,
  confirmed_by,
  confirmed_at
)
SELECT
  c.id,
  ROUND(GREATEST(
    COALESCE(c.paid_amount, 0) - COALESCE(existing.confirmed_total, 0),
    0
  ), 2),
  c.contract_date,
  CASE
    WHEN c.payment_method IN ('cash', 'noncash', 'bank', 'sbp') THEN c.payment_method
    ELSE 'cash'
  END,
  'initial',
  'Перенесено из истории договора',
  COALESCE(c.registered_by, c.signed_by),
  c.created_at,
  1,
  COALESCE(c.registered_by, c.signed_by),
  c.created_at
FROM contracts c
LEFT JOIN (
  SELECT contract_id, SUM(amount) AS confirmed_total
  FROM contract_payments
  WHERE confirmed = 1
  GROUP BY contract_id
) existing ON existing.contract_id = c.id
WHERE COALESCE(c.paid_amount, 0) > COALESCE(existing.confirmed_total, 0)
  AND NOT EXISTS (
    SELECT 1
    FROM contract_payments p
    WHERE p.contract_id = c.id
      AND p.payment_type = 'initial'
  );

UPDATE contracts c
LEFT JOIN (
  SELECT contract_id, ROUND(SUM(amount), 2) AS total_paid
  FROM contract_payments
  WHERE confirmed = 1
  GROUP BY contract_id
) payments ON payments.contract_id = c.id
SET c.paid_amount = COALESCE(payments.total_paid, 0);
