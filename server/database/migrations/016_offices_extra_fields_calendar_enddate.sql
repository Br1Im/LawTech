-- Migration 016: extended office fields (phones, IP identity, INN/OGRN, owner)
-- + calendar_events.end_date for contract flow
-- NB: MySQL 8.0 does not support ADD COLUMN IF NOT EXISTS universally, so
-- each statement is in its own block and the migration runner tolerates
-- duplicate-column errors on re-runs.
ALTER TABLE offices ADD COLUMN contact_phone VARCHAR(50) NULL AFTER phone;
ALTER TABLE offices ADD COLUMN work_phone VARCHAR(50) NULL AFTER contact_phone;
ALTER TABLE offices ADD COLUMN work_phone2 VARCHAR(50) NULL AFTER work_phone;
ALTER TABLE offices ADD COLUMN inn VARCHAR(20) NULL AFTER work_phone2;
ALTER TABLE offices ADD COLUMN ogrn VARCHAR(20) NULL AFTER inn;
ALTER TABLE offices ADD COLUMN ip_surname VARCHAR(100) NULL AFTER ogrn;
ALTER TABLE offices ADD COLUMN ip_name VARCHAR(100) NULL AFTER ip_surname;
ALTER TABLE offices ADD COLUMN ip_middle_name VARCHAR(100) NULL AFTER ip_name;
ALTER TABLE offices ADD COLUMN owner_id INT NULL AFTER ip_middle_name;
ALTER TABLE calendar_events ADD COLUMN end_date DATE NULL AFTER start_date;
