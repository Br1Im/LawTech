-- Качество лида по предзаказу Правоведа.
--
-- У поставщика каждый поток лидов — отдельный предзаказ со своим ID и своей
-- ценой. Раньше все лиды приходили с score = 50, то есть неразличимыми.
--
-- Основной источник качества — явное соответствие «ID предзаказа → метка»
-- в таблице ниже. Если предзаказа в ней нет, качество выводится из цены
-- лида (lead_price из API). Так новый поток не потеряется, даже если его
-- забыли завести руками.
--
-- temperature намеренно не трогаем: это ручная оценка оператора (hot/warm/cold),
-- её выставляют и перезаписывают люди.

CREATE TABLE IF NOT EXISTS lead_preorder_quality (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(50) NOT NULL DEFAULT 'pravoved',
  preorder_id VARCHAR(64) NOT NULL,
  label VARCHAR(50) NOT NULL,
  score TINYINT UNSIGNED NOT NULL DEFAULT 50,
  comment VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lead_preorder_quality (provider, preorder_id),
  KEY idx_lead_preorder_quality_active (provider, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Метка качества на самом лиде: чтобы фильтровать и считать статистику,
-- не разбирая JSON в metadata. Колонка добавляется идемпотентно.
SET @col_missing := (
  SELECT COUNT(*) = 0
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'call_center_leads'
     AND COLUMN_NAME = 'quality_label'
);
SET @q := IF(
  @col_missing,
  'ALTER TABLE call_center_leads ADD COLUMN quality_label VARCHAR(50) NULL AFTER temperature',
  'SELECT 1'
);
PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_missing := (
  SELECT COUNT(*) = 0
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'call_center_leads'
     AND INDEX_NAME = 'idx_cc_leads_quality'
);
SET @q := IF(
  @idx_missing,
  'ALTER TABLE call_center_leads ADD INDEX idx_cc_leads_quality (office_id, quality_label)',
  'SELECT 1'
);
PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;
