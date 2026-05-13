-- Add channel column to messages for multi-channel chat support
-- 'reception' = chat between Admin, Manager, OKK
-- 'call_center' = chat between CC Manager, Manager, OKK
ALTER TABLE messages ADD COLUMN channel VARCHAR(50) DEFAULT 'reception' AFTER office_id;

-- Update existing messages to 'reception' channel
UPDATE messages SET channel = 'reception' WHERE channel IS NULL;

-- Add index for faster channel queries
ALTER TABLE messages ADD INDEX idx_messages_channel (office_id, channel, created_at);
