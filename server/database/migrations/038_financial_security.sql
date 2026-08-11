CREATE TABLE IF NOT EXISTS financial_audit_log (
 id BIGINT NOT NULL AUTO_INCREMENT, office_id INT NULL, user_id INT NULL,
 action VARCHAR(80) NOT NULL, entity_type VARCHAR(80) NOT NULL, entity_id VARCHAR(80) NULL,
 amount DECIMAL(15,2) NULL, ip_address VARCHAR(64) NULL, user_agent VARCHAR(500) NULL,
 metadata JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_fin_audit_office_time(office_id,created_at), KEY idx_fin_audit_entity(entity_type,entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS financial_idempotency_keys (
 id BIGINT NOT NULL AUTO_INCREMENT,user_id INT NOT NULL,scope VARCHAR(80) NOT NULL,request_key VARCHAR(128) NOT NULL,
 office_id INT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id),UNIQUE KEY uq_fin_idem(user_id,scope,request_key),KEY idx_fin_idem_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SET @c=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='expenses' AND CONSTRAINT_NAME='chk_expenses_amount_positive');
SET @q=IF(@c=0,'ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0)','SELECT 1');PREPARE x FROM @q;EXECUTE x;DEALLOCATE PREPARE x;
SET @c=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='office_income' AND CONSTRAINT_NAME='chk_office_income_amount_positive');
SET @q=IF(@c=0,'ALTER TABLE office_income ADD CONSTRAINT chk_office_income_amount_positive CHECK (amount > 0)','SELECT 1');PREPARE x FROM @q;EXECUTE x;DEALLOCATE PREPARE x;
SET @c=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='salary_payments' AND CONSTRAINT_NAME='chk_salary_payments_amount_positive');
SET @q=IF(@c=0,'ALTER TABLE salary_payments ADD CONSTRAINT chk_salary_payments_amount_positive CHECK (amount > 0)','SELECT 1');PREPARE x FROM @q;EXECUTE x;DEALLOCATE PREPARE x;
