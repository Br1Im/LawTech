-- 1. Добавляем owner_id в таблицу offices для привязки офиса к директору
ALTER TABLE offices ADD COLUMN IF NOT EXISTS owner_id INT NULL AFTER id;

-- Привязываем существующие офисы к директорам
UPDATE offices o
INNER JOIN users u ON u.office_id = o.id AND u.role = 'director'
SET o.owner_id = u.id
WHERE o.owner_id IS NULL;

-- 2. Добавляем office_id в clients для прямой привязки к офису
ALTER TABLE clients ADD COLUMN IF NOT EXISTS office_id INT NULL;

-- Привязываем существующих клиентов к офисам через contracts->employees
UPDATE clients cl
INNER JOIN contracts c ON c.id_client = cl.id
INNER JOIN employees e ON e.id = c.id_employee
SET cl.office_id = e.office_id
WHERE cl.office_id IS NULL AND e.office_id IS NOT NULL;

-- 3. Добавляем office_id в contracts для прямой привязки к офису
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS office_id INT NULL;

-- Привязываем существующие контракты к офисам через employees
UPDATE contracts c
INNER JOIN employees e ON e.id = c.id_employee
SET c.office_id = e.office_id
WHERE c.office_id IS NULL AND e.office_id IS NOT NULL;
