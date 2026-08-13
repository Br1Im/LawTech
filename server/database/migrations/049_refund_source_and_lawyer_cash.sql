ALTER TABLE contracts ADD COLUMN refund_payment_method ENUM('cash','noncash','bank') NULL AFTER refund_confirmed_at;
