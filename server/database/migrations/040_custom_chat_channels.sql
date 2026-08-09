-- 040: user-managed office chat channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id INT NOT NULL AUTO_INCREMENT,
  office_id INT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_by INT DEFAULT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chat_channel (office_id, channel),
  KEY idx_chat_channels_office (office_id, archived_at),
  CONSTRAINT fk_chat_channels_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_channels_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @has_source = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_channel_members' AND column_name='source');
SET @sql_source = IF(@has_source=0, 'ALTER TABLE chat_channel_members ADD COLUMN source VARCHAR(24) NOT NULL DEFAULT ''manual'' AFTER added_by', 'SELECT 1');
PREPARE stmt_source FROM @sql_source; EXECUTE stmt_source; DEALLOCATE PREPARE stmt_source;

SET @has_cc = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_channel_members' AND column_name='call_center_id');
SET @sql_cc = IF(@has_cc=0, 'ALTER TABLE chat_channel_members ADD COLUMN call_center_id BIGINT UNSIGNED DEFAULT NULL AFTER source', 'SELECT 1');
PREPARE stmt_cc FROM @sql_cc; EXECUTE stmt_cc; DEALLOCATE PREPARE stmt_cc;

SET @has_system = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_channels' AND column_name='is_system');
SET @sql_system = IF(@has_system=0, 'ALTER TABLE chat_channels ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER created_by', 'SELECT 1');
PREPARE stmt_system FROM @sql_system; EXECUTE stmt_system; DEALLOCATE PREPARE stmt_system;

SET @has_archived = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_channels' AND column_name='archived_at');
SET @sql_archived = IF(@has_archived=0, 'ALTER TABLE chat_channels ADD COLUMN archived_at DATETIME DEFAULT NULL AFTER created_at', 'SELECT 1');
PREPARE stmt_archived FROM @sql_archived; EXECUTE stmt_archived; DEALLOCATE PREPARE stmt_archived;

INSERT IGNORE INTO chat_channels (office_id, channel, name, created_by, is_system)
SELECT id, 'reception', 'Ресепшен', owner_id, 1 FROM offices;
INSERT IGNORE INTO chat_channels (office_id, channel, name, created_by, is_system)
SELECT id, 'call_center', 'Колл-центр', owner_id, 1 FROM offices;

-- Preserve current access, but convert it to explicit membership.
INSERT IGNORE INTO chat_channel_members (office_id, channel, user_id, added_by, source)
SELECT u.office_id, 'reception', u.id, NULL, 'migration'
FROM users u
WHERE u.office_id IS NOT NULL AND u.is_active=1
  AND u.role IN ('admin','administrator','manager','okk','director');

INSERT IGNORE INTO chat_channel_members (office_id, channel, user_id, added_by, source)
SELECT u.office_id, 'call_center', u.id, NULL, 'migration'
FROM users u
WHERE u.office_id IS NOT NULL AND u.is_active=1
  AND u.role IN ('manager','okk','director');

INSERT IGNORE INTO chat_channel_members (office_id, channel, user_id, added_by, source, call_center_id)
SELECT occ.office_id, 'call_center', cm.user_id, NULL, 'call_center', occ.call_center_id
FROM office_call_centers occ
JOIN call_center_members cm ON cm.call_center_id=occ.call_center_id
JOIN users u ON u.id=cm.user_id AND u.is_active=1
WHERE occ.is_active=1;
INSERT IGNORE INTO chat_channels (office_id, channel, name, created_by, is_system)
SELECT DISTINCT occ.office_id, 'cc_internal', CONCAT('РљРѕРјР°РЅРґР° ', cc.name), cc.owner_user_id, 1
FROM office_call_centers occ
JOIN call_centers cc ON cc.id=occ.call_center_id
WHERE occ.is_active=1 AND cc.is_active=1;

INSERT IGNORE INTO chat_channel_members (office_id, channel, user_id, added_by, source, call_center_id)
SELECT occ.office_id, 'cc_internal', cm.user_id, NULL, 'call_center', occ.call_center_id
FROM office_call_centers occ
JOIN call_centers cc ON cc.id=occ.call_center_id AND cc.is_active=1
JOIN call_center_members cm ON cm.call_center_id=occ.call_center_id
JOIN users u ON u.id=cm.user_id AND u.is_active=1
WHERE occ.is_active=1;

