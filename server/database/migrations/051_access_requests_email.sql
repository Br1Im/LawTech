ALTER TABLE access_requests
  MODIFY company_name VARCHAR(180) NULL,
  ADD COLUMN email VARCHAR(190) NULL AFTER full_name,
  ADD KEY idx_access_requests_email (email);
