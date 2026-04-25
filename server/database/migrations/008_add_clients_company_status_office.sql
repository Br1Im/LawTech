-- Migration 008: ensure clients has company, status, office_id columns.
-- MySQL 8.0+ supports ADD COLUMN IF NOT EXISTS; повторный запуск не ломает схему.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS company VARCHAR(255) NULL AFTER name;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS office_id INT NULL;
