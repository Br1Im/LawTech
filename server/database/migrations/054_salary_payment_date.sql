-- Business date of the salary payout. paid_at remains the immutable creation timestamp.
ALTER TABLE salary_payments ADD COLUMN payment_date DATE NULL AFTER paid_at;
UPDATE salary_payments sp LEFT JOIN expenses e ON e.id=sp.expense_id SET sp.payment_date=COALESCE(e.spent_on,DATE(sp.paid_at)) WHERE sp.payment_date IS NULL;
ALTER TABLE salary_payments MODIFY payment_date DATE NOT NULL;
CREATE INDEX idx_salary_payment_date ON salary_payments (office_id, payment_date, status);
