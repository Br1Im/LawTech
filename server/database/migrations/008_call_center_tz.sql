ALTER TABLE call_center_leads ADD COLUMN temperature VARCHAR(10) NULL AFTER score;

UPDATE call_center_leads SET status = 'IN_PROGRESS' WHERE status IN ('CALL_BACK', 'INTERESTED');

UPDATE call_center_leads SET status = 'BOOKED' WHERE status = 'CLOSED';

CREATE INDEX idx_call_center_leads_source ON call_center_leads(source);

CREATE INDEX idx_call_center_leads_temperature ON call_center_leads(temperature);
