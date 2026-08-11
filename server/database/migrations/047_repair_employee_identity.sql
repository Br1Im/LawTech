-- LT-009: repair active operational users missing their employee identity.
INSERT INTO employees (user_id, first_name, last_name, middle_name, email, phone, position, office_id)
SELECT u.id, u.first_name, u.last_name, u.middle_name, u.email, u.phone,
       CASE u.role
         WHEN 'lawyer' THEN 'Юрист' WHEN 'manager' THEN 'Менеджер'
         WHEN 'admin' THEN 'Администратор' WHEN 'administrator' THEN 'Администратор'
         WHEN 'okk' THEN 'ОКК' WHEN 'expert' THEN 'Эксперт'
         WHEN 'representative' THEN 'Представитель' ELSE u.role END,
       u.office_id
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE e.id IS NULL AND u.office_id IS NOT NULL AND u.is_active = 1 AND u.deleted_at IS NULL
  AND u.role NOT IN ('director', 'owner', 'cc_manager', 'cc_operator');
