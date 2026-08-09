ALTER TABLE employees ADD COLUMN user_id INT NULL AFTER id;
UPDATE employees e JOIN users u ON u.id=e.id AND u.office_id=e.office_id AND LOWER(TRIM(u.first_name))=LOWER(TRIM(e.first_name)) AND LOWER(TRIM(u.last_name))=LOWER(TRIM(e.last_name)) SET e.user_id=u.id WHERE e.user_id IS NULL;
UPDATE employees e JOIN users u ON LOWER(u.email)=LOWER(e.email) AND u.office_id=e.office_id SET e.user_id=u.id WHERE e.user_id IS NULL AND e.email IS NOT NULL;
UPDATE employees e JOIN users u ON u.office_id=e.office_id AND LOWER(TRIM(u.first_name))=LOWER(TRIM(e.first_name)) AND LOWER(TRIM(u.last_name))=LOWER(TRIM(e.last_name)) SET e.user_id=u.id WHERE e.user_id IS NULL;

INSERT INTO employees (user_id,first_name,last_name,middle_name,email,phone,position,office_id)
SELECT u.id,u.first_name,u.last_name,u.middle_name,u.email,u.phone,
 CASE u.role WHEN 'lawyer' THEN 'Юрист' WHEN 'manager' THEN 'Менеджер' WHEN 'admin' THEN 'Администратор' WHEN 'okk' THEN 'ОКК' WHEN 'expert' THEN 'Эксперт' WHEN 'representative' THEN 'Представитель' WHEN 'director' THEN 'Генеральный директор' ELSE u.role END,
 u.office_id
FROM users u LEFT JOIN employees e ON e.user_id=u.id
WHERE e.id IS NULL AND u.is_active=1 AND u.deleted_at IS NULL AND u.office_id IS NOT NULL AND u.role NOT IN ('cc_manager','cc_operator');
UPDATE employees e JOIN (SELECT user_id,MIN(id) keep_id FROM employees WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*)>1) d ON d.user_id=e.user_id SET e.user_id=NULL WHERE e.id<>d.keep_id;
ALTER TABLE employees ADD UNIQUE KEY uq_employees_user_id (user_id);
ALTER TABLE employees ADD CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
