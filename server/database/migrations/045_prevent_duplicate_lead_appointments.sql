-- LT-001: one appointment per call-center lead.
-- Preserve the earliest appointment. Repoint related contracts before removing duplicates.
DROP TEMPORARY TABLE IF EXISTS appointment_duplicate_map;
CREATE TEMPORARY TABLE appointment_duplicate_map AS
SELECT duplicate.id AS duplicate_id, keeper.keep_id
FROM appointments duplicate
JOIN (
  SELECT lead_id, MIN(id) AS keep_id
  FROM appointments
  WHERE lead_id IS NOT NULL
  GROUP BY lead_id
  HAVING COUNT(*) > 1
) keeper ON keeper.lead_id = duplicate.lead_id
WHERE duplicate.id <> keeper.keep_id;

UPDATE contracts c
JOIN appointment_duplicate_map m ON m.duplicate_id = c.appointment_id
SET c.appointment_id = m.keep_id;

DELETE a
FROM appointments a
JOIN appointment_duplicate_map m ON m.duplicate_id = a.id;

DROP TEMPORARY TABLE appointment_duplicate_map;
ALTER TABLE appointments ADD UNIQUE KEY uq_appointments_lead (lead_id);
