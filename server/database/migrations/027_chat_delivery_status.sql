-- Add message delivery status: sent / delivered / read
ALTER TABLE messages ADD COLUMN status ENUM('sent','delivered','read') NOT NULL DEFAULT 'sent' AFTER is_read;

-- Backfill: treat existing read messages as 'read', others as 'delivered'
UPDATE messages SET status = 'read' WHERE is_read = 1;
UPDATE messages SET status = 'delivered' WHERE is_read = 0;

-- Add sender_id alias (some code references sender_id, column may be user_id)
-- Check if sender_id already exists; if not, add it
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'sender_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE messages ADD COLUMN sender_id INT AFTER user_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill sender_id from user_id where null
UPDATE messages SET sender_id = user_id WHERE sender_id IS NULL;

-- Index for unread counts
ALTER TABLE messages ADD INDEX idx_messages_status (office_id, channel, status);

-- Add content column alias if missing (some code uses 'content' vs 'text')
SET @content_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'content');
SET @sql2 = IF(@content_exists = 0, 'ALTER TABLE messages ADD COLUMN content TEXT AFTER text', 'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Backfill content from text where null
UPDATE messages SET content = text WHERE content IS NULL AND text IS NOT NULL;
