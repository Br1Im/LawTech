-- Добавляем колонку representative_id в contracts для назначения представителей
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS representative_id INT NULL AFTER expert_id;

-- Индекс для быстрого поиска дел по представителю
CREATE INDEX IF NOT EXISTS idx_representative ON contracts (representative_id);
