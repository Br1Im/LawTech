CREATE TABLE IF NOT EXISTS contract_payment_installments (
 id INT NOT NULL AUTO_INCREMENT,
 contract_id INT NOT NULL,
 amount DECIMAL(15,2) NOT NULL,
 paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
 due_date DATE NOT NULL,
 status ENUM('pending','partial','paid','cancelled') NOT NULL DEFAULT 'pending',
 note VARCHAR(255) NULL,
 created_by INT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id),
 KEY idx_installments_contract_date (contract_id,due_date),
 CONSTRAINT fk_installments_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO contract_payment_installments (contract_id,amount,due_date,status)
SELECT c.id,ROUND(c.amount-c.paid_amount,2),c.additional_payment_date,'pending'
FROM contracts c
WHERE c.additional_payment_date IS NOT NULL AND c.amount>c.paid_amount
  AND NOT EXISTS (SELECT 1 FROM contract_payment_installments i WHERE i.contract_id=c.id);
