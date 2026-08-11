-- Safe E2E test-office isolation.
ALTER TABLE offices
  ADD COLUMN is_test TINYINT(1) NOT NULL DEFAULT 0 AFTER owner_id,
  ADD COLUMN external_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER is_test;

CREATE INDEX idx_offices_owner_test ON offices(owner_id, is_test);
