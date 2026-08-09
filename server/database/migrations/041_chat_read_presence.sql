CREATE TABLE IF NOT EXISTS chat_message_reads (
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id,user_id),
  KEY idx_chat_reads_user (user_id,message_id),
  CONSTRAINT fk_chat_reads_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_reads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS chat_user_presence (
  user_id INT NOT NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_chat_presence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Old global read state cannot identify who read it. Backfill only active channel members
-- so existing messages do not suddenly become unread for everyone after deployment.
INSERT IGNORE INTO chat_message_reads (message_id,user_id,read_at)
SELECT m.id,cm.user_id,COALESCE(m.created_at,NOW())
FROM messages m
JOIN chat_channel_members cm ON cm.office_id=m.office_id AND cm.channel=m.channel
WHERE m.status='read' AND cm.user_id<>m.sender_id;

-- Repair historical system chat labels with byte-safe UTF-8 literals.
UPDATE chat_channels SET name=CONVERT(UNHEX('D0A0D0B5D181D0B5D0BFD188D0B5D0BD') USING utf8mb4) WHERE channel='reception';
 UPDATE chat_channels SET name=CONVERT(UNHEX('D09AD0BED0BBD0BB2DD186D0B5D0BDD182D180') USING utf8mb4) WHERE channel='call_center';
 UPDATE chat_channels SET name=CONVERT(UNHEX('D09AD0BED0BCD0B0D0BDD0B4D0B020D0BAD0BED0BBD0BB2DD186D0B5D0BDD182D180D0B0') USING utf8mb4) WHERE channel='cc_internal';
