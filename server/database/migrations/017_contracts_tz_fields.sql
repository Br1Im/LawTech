-- Migration 017: add Technical Spec ("ТЗ") fields to contracts for docs-type orders.
-- customer_goal          — Цель заказчика (короткая строка)
-- situation_description  — Описание ситуации (свободный текст)
-- expert_deadline_days   — Дедлайн для эксперта в днях

DROP PROCEDURE IF EXISTS add_col_if_absent_017;

DELIMITER $$
CREATE PROCEDURE add_col_if_absent_017(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_col_if_absent_017('contracts', 'customer_goal',          'VARCHAR(500) NULL');
CALL add_col_if_absent_017('contracts', 'situation_description',  'TEXT NULL');
CALL add_col_if_absent_017('contracts', 'expert_deadline_days',   'INT NULL');

DROP PROCEDURE IF EXISTS add_col_if_absent_017;
