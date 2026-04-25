ALTER TABLE employees ADD COLUMN middle_name VARCHAR(100) NULL AFTER last_name;
ALTER TABLE employees ADD COLUMN birth_date DATE NULL AFTER middle_name;
ALTER TABLE employees ADD COLUMN passport_series VARCHAR(10) NULL;
ALTER TABLE employees ADD COLUMN passport_number VARCHAR(20) NULL;
ALTER TABLE employees ADD COLUMN passport_issued_by VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN passport_issue_date DATE NULL;
ALTER TABLE employees ADD COLUMN passport_department_code VARCHAR(10) NULL;
