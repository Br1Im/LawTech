-- Расторжение договора: добавляем поля в contracts
ALTER TABLE contracts
  ADD COLUMN terminated_at DATE DEFAULT NULL,
  ADD COLUMN termination_reason TEXT DEFAULT NULL,
  ADD COLUMN refund_amount DECIMAL(15,2) DEFAULT NULL,
  ADD COLUMN refund_deadline DATE DEFAULT NULL,
  ADD COLUMN refund_confirmed TINYINT(1) DEFAULT 0,
  ADD COLUMN refund_confirmed_by INT DEFAULT NULL,
  ADD COLUMN refund_confirmed_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX idx_contracts_terminated ON contracts(status, terminated_at);
