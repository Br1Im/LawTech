-- LT-005: explicit timezone for legacy offices.
UPDATE offices SET timezone = 'Asia/Tomsk' WHERE timezone IS NULL OR TRIM(timezone) = '';
ALTER TABLE offices MODIFY timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tomsk';
