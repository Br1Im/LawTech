-- Абсолютный срок выполнения подготовки документов экспертом.
-- Заполняется при передаче дела эксперту (дата или кол-во дней).
ALTER TABLE contracts ADD COLUMN expert_deadline DATE NULL AFTER expert_deadline_days;
