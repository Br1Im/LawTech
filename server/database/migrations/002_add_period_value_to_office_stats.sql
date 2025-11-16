-- Добавление поля period_value в таблицу office_stats для хранения конкретных периодов

-- Проверяем и добавляем поле period_value (если не существует)
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'office_stats' 
               AND column_name = 'period_value');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE office_stats ADD COLUMN period_value VARCHAR(50) NOT NULL DEFAULT \'\'', 'SELECT "Column already exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Обновляем существующие записи (если есть)
UPDATE office_stats SET period_value = CASE
  WHEN period_type = 'day' THEN DATE_FORMAT(NOW(), '%Y-%m-%d')
  WHEN period_type = 'week' THEN CONCAT(YEAR(NOW()), '-W', LPAD(WEEK(NOW(), 3), 2, '0'))
  WHEN period_type = 'month' THEN DATE_FORMAT(NOW(), '%Y-%m')
  WHEN period_type = 'year' THEN YEAR(NOW())
  ELSE ''
END
WHERE period_value = '';
