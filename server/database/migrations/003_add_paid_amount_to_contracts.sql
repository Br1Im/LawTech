-- Добавление поля paid_amount (сумма внесения) в таблицу contracts

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0.00 AFTER amount;

-- Обновляем существующие записи: если paid_amount = 0, устанавливаем его равным amount
UPDATE contracts SET paid_amount = amount WHERE paid_amount = 0;
