-- Migration 028: Add file attachment support to messages
ALTER TABLE messages ADD COLUMN file_url VARCHAR(500) DEFAULT NULL AFTER status;
ALTER TABLE messages ADD COLUMN file_name VARCHAR(255) DEFAULT NULL AFTER file_url;
ALTER TABLE messages ADD COLUMN file_type VARCHAR(50) DEFAULT NULL AFTER file_name;
