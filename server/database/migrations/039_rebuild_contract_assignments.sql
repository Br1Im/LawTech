UPDATE contracts c JOIN employees e ON e.id=c.signed_by SET c.signed_by=e.user_id WHERE e.user_id IS NOT NULL;
DELETE FROM contract_assignments WHERE assignment_type='auto';
INSERT IGNORE INTO contract_assignments (contract_id,user_id,role,assignment_type)
SELECT c.id,u.id,u.role,'auto' FROM contracts c JOIN users u ON u.office_id=c.office_id AND u.is_active=1 AND u.deleted_at IS NULL AND u.role IN ('director','manager','okk');
INSERT IGNORE INTO contract_assignments (contract_id,user_id,role,assignment_type)
SELECT c.id,u.id,u.role,'auto' FROM contracts c JOIN employees e ON e.id=c.id_employee JOIN users u ON u.id=e.user_id AND u.is_active=1 AND u.deleted_at IS NULL WHERE u.role='lawyer';
INSERT IGNORE INTO contract_assignments (contract_id,user_id,role,assignment_type)
SELECT c.id,c.representative_id,'representative','manual' FROM contracts c JOIN users u ON u.id=c.representative_id AND u.role='representative' WHERE c.representative_id IS NOT NULL;
INSERT IGNORE INTO contract_assignments (contract_id,user_id,role,assignment_type)
SELECT c.id,u.id,'lawyer','auto' FROM contracts c JOIN users u ON u.id=c.signed_by AND u.role='lawyer' AND u.is_active=1 AND u.deleted_at IS NULL;
UPDATE contracts c SET c.needs_lawyer_input=1 WHERE c.status NOT IN ('terminated','cancelled') AND NOT EXISTS (SELECT 1 FROM contract_assignments ca JOIN users u ON u.id=ca.user_id AND u.role='lawyer' WHERE ca.contract_id=c.id);
UPDATE contracts SET additional_payment_date=NULL,additional_payment_amount=NULL,remainder_confirmed=1,remainder_confirmed_at=COALESCE(remainder_confirmed_at,NOW()) WHERE paid_amount>=amount AND amount>0;
