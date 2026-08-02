-- Internal movement between the office's three money buckets.
CREATE TABLE IF NOT EXISTS office_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  source_bucket ENUM('cash','noncash','bank') NOT NULL,
  destination_bucket ENUM('cash','noncash','bank') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transfer_date DATE NOT NULL,
  comment TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_office_transfers_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  INDEX idx_office_transfers_date (office_id, transfer_date),
  CONSTRAINT chk_office_transfers_amount CHECK (amount > 0),
  CONSTRAINT chk_office_transfers_buckets CHECK (source_bucket <> destination_bucket)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
