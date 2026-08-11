/**
 * Контроллер управления сотрудниками (иерархическая система)
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { canDelete } = require('../utils/deletePermissions');
const { checkOfficeAccess } = require('../utils/ensureOffice');

// Иерархия: кто кого может создавать
const CREATION_HIERARCHY = {
  director: ['manager', 'okk', 'expert'],
  manager: ['lawyer', 'representative', 'admin'],
  okk: ['lawyer', 'representative', 'admin'],
  cc_manager: ['cc_operator'],
};

// Иерархия: кто какие роли может назначать (повышение/понижение)
const ROLE_CHANGE_HIERARCHY = {
  director: ['manager', 'okk', 'expert', 'lawyer', 'representative', 'admin'],
  manager: ['lawyer', 'representative', 'admin'],
  okk: ['lawyer', 'representative', 'admin'],
  cc_manager: ['cc_operator'],
};

const ROLE_LABELS = {
  director: 'Генеральный директор',
  manager: 'Менеджер',
  okk: 'ОКК',
  cc_manager: 'Начальник колл-центра',
  cc_operator: 'Оператор колл-центра',
  expert: 'Эксперт',
  lawyer: 'Юрист',
  representative: 'Представитель',
  admin: 'Администратор',
};

function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

function transliterate(text) {
  const map = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',
    л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',
    ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  };
  return text.toLowerCase().split('').map(c => map[c] || c).join('').replace(/[^a-z0-9]/g, '');
}

async function generateUniqueLogin(firstName, lastName) {
  const base = transliterate(firstName[0] || '') + '.' + transliterate(lastName || 'user');
  let login = base;
  let counter = 1;
  while (true) {
    const [existing] = await db.query('SELECT id FROM users WHERE login = ?', [login]);
    if (existing.length === 0) return login;
    login = `${base}${counter}`;
    counter++;
  }
}

// Создание сотрудника
const createEmployee = async (req, res) => {
  const connection = await db.getClient();
  try {
    const creator = req.user;
    const { first_name, last_name, middle_name, phone, role, office_id } = req.body;

    if (!first_name || !last_name || !role) {
      return res.status(400).json({ success: false, message: 'Обязательные поля: Фамилия, Имя, должность' });
    }

    const allowedRoles = CREATION_HIERARCHY[creator.role];
    if (!allowedRoles || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false, message: `Роль "${creator.role}" не может создавать сотрудников с ролью "${role}"`,
      });
    }

    const creatorIsCallCenter = ['cc_manager', 'cc_operator'].includes(String(creator.role || '').toLowerCase());
    let creatorCallCenterId = null;
    if (creatorIsCallCenter) {
      const [memberships] = await connection.query(
        'SELECT call_center_id FROM call_center_members WHERE user_id = ? LIMIT 1',
        [creator.id]
      );
      if (!memberships.length) {
        return res.status(409).json({ success: false, message: 'Аккаунт не привязан к колл-центру' });
      }
      creatorCallCenterId = memberships[0].call_center_id;
    }

    const employeeOfficeId = creatorIsCallCenter ? null : (office_id || creator.office_id);
    const login = await generateUniqueLogin(first_name, last_name);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const staffEmail = `${login}@staff.local`;
    const positionMap = {
      lawyer: 'Юрист', manager: 'Менеджер', admin: 'Администратор',
      okk: 'ОКК', expert: 'Эксперт', cc_manager: 'Начальник КЦ',
      cc_operator: 'Оператор КЦ', representative: 'Представитель',
      director: 'Генеральный директор',
    };

    await connection.beginTransaction();
    const [result] = await connection.query(`
      INSERT INTO users (first_name, last_name, middle_name, email, login, phone, password, role, office_id, is_active, must_change_password, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())
    `, [first_name, last_name, middle_name || '', staffEmail, login, phone || null, hashedPassword, role, employeeOfficeId, creator.id]);
    const newUserId = result.insertId;

    if (creatorIsCallCenter) {
      await connection.query(
        `INSERT INTO call_center_members (call_center_id, user_id, member_role)
         VALUES (?, ?, ?)`,
        [creatorCallCenterId, newUserId, role === 'cc_manager' ? 'manager' : 'operator']
      );
    } else {
      if (!employeeOfficeId) {
        const error = new Error('Для сотрудника не определён офис');
        error.statusCode = 409;
        throw error;
      }
      await connection.query(
        'INSERT INTO user_offices (user_id, office_id, assigned_by, assigned_at) VALUES (?, ?, ?, NOW())',
        [newUserId, employeeOfficeId, creator.id]
      );
      // employees.id has its own lifecycle. Never force it to equal users.id:
      // legacy employee ids can already occupy that primary key.
      await connection.query(
        `INSERT INTO employees (user_id, first_name, last_name, middle_name, email, phone, position, office_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, first_name, last_name, middle_name || null, staffEmail, phone || null,
         positionMap[role] || role, employeeOfficeId]
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: 'Сотрудник создан',
      employee: {
        id: newUserId,
        first_name, last_name, middle_name: middle_name || '', phone, role,
        role_label: ROLE_LABELS[role] || role,
        office_id: employeeOfficeId, login, password: plainPassword,
      },
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { /* noop */ }
    console.error('Ошибка при создании сотрудника:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Внутренняя ошибка сервера',
    });
  } finally {
    connection.release();
  }
};

// Список сотрудников (по офису текущего пользователя)
const getEmployees = async (req, res) => {
  try {
    const user = req.user;
    const officeId = req.query.office_id || user.office_id;

    const isCallCenterUser = ['cc_manager', 'cc_operator'].includes(String(user.role || '').toLowerCase());
    let query = '';
    const params = [];

    if (isCallCenterUser) {
      query = `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.middle_name, u.login, u.phone,
               u.email, u.role, u.office_id, u.is_active, u.created_by, u.created_at
          FROM call_center_members mine
          JOIN call_center_members member ON member.call_center_id = mine.call_center_id
          JOIN users u ON u.id = member.user_id
         WHERE mine.user_id = ? AND u.deleted_at IS NULL
      `;
      params.push(user.id);
    } else if (officeId) {
      const allowed = await checkOfficeAccess(user, officeId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
    }

    if (isCallCenterUser) {
      // Состав уже выбран выше по членству в колл-центре.
    } else if (officeId) {
      // Показываем сотрудников основного офиса + мульти-офисных (назначенных через user_offices)
      query = `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.middle_name, u.login, u.phone, u.email, u.role, u.office_id, u.is_active, u.created_by, u.created_at
        FROM users u
        LEFT JOIN user_offices uo ON uo.user_id = u.id AND uo.office_id = ?
        WHERE (u.office_id = ? OR uo.office_id IS NOT NULL)
          AND u.deleted_at IS NULL
          AND u.role NOT IN ('cc_manager', 'cc_operator')
      `;
      params.push(officeId, officeId);
    } else {
      query = `
        SELECT id, first_name, last_name, middle_name, login, phone, email, role, office_id, is_active, created_by, created_at
        FROM users
        WHERE 1=1 AND deleted_at IS NULL
          AND role NOT IN ('cc_manager', 'cc_operator')
      `;
    }

    // Junior operational roles get a minimal directory, not the full org chart.
    // Lawyers need expert names for the supported hand-off flow; experts and
    // representatives only need their own card. Sensitive contact/login fields
    // are redacted from every junior response below.
    const viewerRole = String(user.role || '').toLowerCase();
    const juniorRoles = new Set(['lawyer', 'expert', 'representative']);
    const isJuniorDirectory = juniorRoles.has(viewerRole) && !isCallCenterUser;
    if (isJuniorDirectory) {
      if (viewerRole === 'lawyer') {
        query += " AND (u.id = ? OR u.role = 'expert')";
        params.push(user.id);
      } else {
        query += ' AND u.id = ?';
        params.push(user.id);
      }
    }

    // Не показываем пароли и деактивированных (если не запрошены)
    if (req.query.include_inactive !== 'true' && !isJuniorDirectory) {
      query += ' AND is_active = 1';
    }

    query += isCallCenterUser ? ' ORDER BY u.created_at DESC' : ' ORDER BY created_at DESC';

    const serializeEmployee = (employee) => {
      const common = {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        middle_name: employee.middle_name,
        role: employee.role,
        role_label: ROLE_LABELS[employee.role] || employee.role,
        office_id: employee.office_id,
        is_active: employee.is_active,
      };
      if (isJuniorDirectory) return common;
      return { ...employee, role_label: common.role_label, password: undefined };
    };

    // Пагинация: page и page_size (опциональные)
    const page = parseInt(req.query.page, 10);
    const pageSize = Math.min(parseInt(req.query.page_size, 10) || 50, 200);

    if (page > 0) {
      const countQuery = query.replace(/SELECT .+? FROM/, 'SELECT COUNT(*) AS total FROM');
      const [[{ total }]] = await db.query(countQuery, params);
      const offset = (page - 1) * pageSize;
      query += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);
      const [employees] = await db.query(query, params);
      return res.json({
        employees: employees.map(serializeEmployee),
        total, page, page_size: pageSize,
      });
    }

    const [employees] = await db.query(query, params);

    res.json({
      employees: employees.map(serializeEmployee),
    });
  } catch (error) {
    console.error('Ошибка при получении сотрудников:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Редактирование сотрудника
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const creator = req.user;
    const { first_name, last_name, middle_name, phone } = req.body;

    // Проверяем, что пользователь существует
    const [users] = await db.query('SELECT id, created_by, role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }

    const target = users[0];
    // Создатель или директор может редактировать
    if (target.created_by !== creator.id && creator.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Нет прав для редактирования этого сотрудника' });
    }

    const updates = [];
    const params = [];
    if (first_name) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name) { updates.push('last_name = ?'); params.push(last_name); }
    if (middle_name !== undefined) { updates.push('middle_name = ?'); params.push(middle_name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Данные сотрудника обновлены' });
  } catch (error) {
    console.error('Ошибка при обновлении сотрудника:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Сброс пароля
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const creator = req.user;
    const { password: customPassword } = req.body || {};

    const [users] = await db.query('SELECT id, created_by, first_name, last_name, login FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }

    const target = users[0];
    const __privileged = ['director', 'admin', 'owner'].includes(String(creator.role || '').toLowerCase());
    if (target.created_by !== creator.id && !__privileged) {
      return res.status(403).json({ success: false, message: 'Нет прав для смены пароля' });
    }

    // Если передан свой пароль — используем его, иначе генерируем
    let newPassword;
    let isGenerated = false;
    if (customPassword && customPassword.trim().length >= 6) {
      newPassword = customPassword.trim();
    } else if (customPassword && customPassword.trim().length > 0 && customPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Пароль должен быть не менее 6 символов' });
    } else {
      newPassword = generatePassword();
      isGenerated = true;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE users SET password = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?', [hashedPassword, id]);

    res.json({
      message: isGenerated ? 'Пароль сгенерирован и установлен' : 'Пароль успешно изменён',
      login: target.login,
      password: newPassword,
      generated: isGenerated,
    });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Деактивация сотрудника
const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const creator = req.user;

    const [users] = await db.query('SELECT id, created_by FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }

    const target = users[0];
    if (target.created_by !== creator.id && creator.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Нет прав для деактивации' });
    }

    const isActive = req.body.is_active !== undefined ? req.body.is_active : 0;
    await db.query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [isActive, id]);

    res.json({ message: isActive ? 'Сотрудник активирован' : 'Сотрудник деактивирован' });
  } catch (error) {
    console.error('Ошибка при деактивации:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Смена собственного пароля
const changeOwnPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Пароль должен быть не менее 6 символов' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Получить допустимые роли для создания
const getAllowedRoles = async (req, res) => {
  try {
    const creatorRole = req.user.role;
    const allowed = CREATION_HIERARCHY[creatorRole] || [];
    res.json({
      allowed_roles: allowed.map(r => ({ value: r, label: ROLE_LABELS[r] || r })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Смена роли сотрудника (повышение/понижение)
const changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: newRole } = req.body;
    const creator = req.user;

    if (!newRole) {
      return res.status(400).json({ success: false, message: 'Укажите новую роль' });
    }

    // Проверяем допустимые роли для назначения
    const allowedRoles = ROLE_CHANGE_HIERARCHY[creator.role];
    if (!allowedRoles || !allowedRoles.includes(newRole)) {
      return res.status(403).json({ success: false, message: `Вы не можете назначить роль "${ROLE_LABELS[newRole] || newRole}"` });
    }

    // Проверяем что сотрудник существует
    const [users] = await db.query('SELECT id, role, created_by, office_id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }

    const target = users[0];

    // Нельзя менять роль директору
    if (target.role === 'director') {
      return res.status(403).json({ success: false, message: 'Нельзя изменить роль директора' });
    }

    // Проверяем права: создатель или директор
    if (target.created_by !== creator.id && creator.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Нет прав для изменения роли этого сотрудника' });
    }

    await db.query('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [newRole, id]);

    res.json({
      message: 'Роль изменена',
      new_role: newRole,
      new_role_label: ROLE_LABELS[newRole] || newRole,
    });
  } catch (error) {
    console.error('Ошибка при смене роли:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Получить список офисов текущего генерального директора (для перевода сотрудников)
const getMyOffices = async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role === 'director') {
      // Директор видит все свои офисы
      const [offices] = await db.query(
        'SELECT id, name FROM offices WHERE owner_id = ? ORDER BY name ASC',
        [user.id]
      );
      return res.json({ offices });
    }
    
    // Мульти-офис: не-директор видит свои назначенные офисы
    const [assigned] = await db.query(
      `SELECT o.id, o.name
       FROM user_offices uo
       JOIN offices o ON o.id = uo.office_id
       WHERE uo.user_id = ?
       ORDER BY o.name ASC`,
      [user.id]
    );
    
    // Если назначен только на 1 офис — возвращаем пустой (нет нужды в переключателе)
    if (assigned.length <= 1) {
      return res.json({ offices: [] });
    }
    
    res.json({ offices: assigned });
  } catch (error) {
    console.error('Ошибка при получении офисов:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Перевод сотрудника в другой офис того же генерального директора
const transferOffice = async (req, res) => {
  try {
    const { id } = req.params;
    const { office_id: newOfficeId } = req.body;
    const creator = req.user;

    // Только генеральный директор может переводить сотрудников между офисами
    if (creator.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Только генеральный директор может переводить сотрудников между офисами' });
    }
    if (!newOfficeId) {
      return res.status(400).json({ success: false, message: 'Укажите офис назначения' });
    }

    // Проверяем, что сотрудник существует
    const [users] = await db.query('SELECT id, role, office_id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }
    const target = users[0];

    // Нельзя переводить директора
    if (target.role === 'director') {
      return res.status(403).json({ success: false, message: 'Нельзя переводить генерального директора' });
    }

    // Офис назначения должен принадлежать этому директору
    const [destOffices] = await db.query('SELECT id, name FROM offices WHERE id = ? AND owner_id = ?', [newOfficeId, creator.id]);
    if (destOffices.length === 0) {
      return res.status(403).json({ success: false, message: 'Этот офис вам не принадлежит' });
    }

    // Текущий офис сотрудника тоже должен принадлежать директору (нельзя забирать чужих)
    if (target.office_id) {
      const [srcOffices] = await db.query('SELECT id FROM offices WHERE id = ? AND owner_id = ?', [target.office_id, creator.id]);
      if (srcOffices.length === 0) {
        return res.status(403).json({ success: false, message: 'Сотрудник не относится к вашим офисам' });
      }
    }

    if (Number(target.office_id) === Number(newOfficeId)) {
      return res.status(400).json({ success: false, message: 'Сотрудник уже в этом офисе' });
    }

    await db.query('UPDATE users SET office_id = ?, updated_at = NOW() WHERE id = ?', [newOfficeId, id]);

    // Синхронизируем employees таблицу (если запись существует)
    await db.query('UPDATE employees SET office_id = ? WHERE id = ?', [newOfficeId, id]);

    // Синхронизируем user_offices: удаляем старый основной, добавляем новый
    await db.query(
      'DELETE FROM user_offices WHERE user_id = ? AND office_id = ?',
      [id, target.office_id]
    );
    await db.query(
      'INSERT IGNORE INTO user_offices (user_id, office_id, assigned_by, assigned_at) VALUES (?, ?, ?, NOW())',
      [id, newOfficeId, creator.id]
    );

    res.json({
      message: 'Сотрудник переведён в другой офис',
      office_id: Number(newOfficeId),
      office_name: destOffices[0].name,
    });
  } catch (error) {
    console.error('Ошибка при переводе сотрудника:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Получить допустимые роли для смены роли сотрудника
const getChangeableRoles = async (req, res) => {
  try {
    const creatorRole = req.user.role;
    const allowed = ROLE_CHANGE_HIERARCHY[creatorRole] || [];
    res.json({
      allowed_roles: allowed.map(r => ({ value: r, label: ROLE_LABELS[r] || r })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};


// ==========================================
// МУЛЬТИ-ОФИС: Назначение сотрудника на несколько офисов
// ==========================================

// Получить список офисов, назначенных сотруднику
const getStaffOffices = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Доступ запрещён' });
    }

    const [users] = await db.query('SELECT id, office_id, role, first_name, last_name FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }

    const [offices] = await db.query(`
      SELECT uo.office_id, o.name as office_name, uo.assigned_at,
             CASE WHEN uo.office_id = u.office_id THEN 1 ELSE 0 END as is_primary
      FROM user_offices uo
      JOIN offices o ON o.id = uo.office_id
      JOIN users u ON u.id = uo.user_id
      WHERE uo.user_id = ?
      ORDER BY is_primary DESC, o.name ASC
    `, [id]);

    const [history] = await db.query(`
      SELECT uoh.office_id, uoh.office_name, uoh.action, uoh.changed_at,
             CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
      FROM user_office_history uoh
      LEFT JOIN users u ON u.id = uoh.changed_by
      WHERE uoh.user_id = ?
      ORDER BY uoh.changed_at DESC
      LIMIT 50
    `, [id]);

    res.json({
      success: true,
      user_id: Number(id),
      primary_office_id: users[0].office_id,
      offices,
      history,
    });
  } catch (error) {
    console.error('Ошибка при получении офисов сотрудника:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Назначить сотрудника на офисы
const setStaffOffices = async (req, res) => {
  try {
    const { id } = req.params;
    const { office_ids } = req.body;
    const user = req.user;

    if (user.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Только генеральный директор может назначать офисы' });
    }

    if (!Array.isArray(office_ids) || office_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Укажите хотя бы один офис' });
    }

    const numericOfficeIds = office_ids.map(Number).filter(Boolean);

    const [users] = await db.query('SELECT id, office_id, role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }

    if (users[0].role === 'director') {
      return res.status(403).json({ success: false, message: 'Нельзя назначать офисы директору' });
    }

    const [directorOffices] = await db.query('SELECT id, name FROM offices WHERE owner_id = ?', [user.id]);
    const ownedIds = new Set(directorOffices.map(o => o.id));
    const officeNameMap = {};
    directorOffices.forEach(o => { officeNameMap[o.id] = o.name; });

    for (const oid of numericOfficeIds) {
      if (!ownedIds.has(oid)) {
        return res.status(403).json({ success: false, message: `Офис ${oid} не принадлежит вам` });
      }
    }

    const primaryOffice = users[0].office_id;
    if (primaryOffice && !numericOfficeIds.includes(primaryOffice)) {
      return res.status(400).json({
        success: false,
        message: 'Основной офис сотрудника должен быть в списке. Для перевода используйте «Перевести в офис».'
      });
    }

    const [currentUO] = await db.query('SELECT office_id FROM user_offices WHERE user_id = ?', [id]);
    const currentIds = new Set(currentUO.map(r => r.office_id));
    const newIds = new Set(numericOfficeIds);

    const toAdd = numericOfficeIds.filter(oid => !currentIds.has(oid));
    const toRemove = [...currentIds].filter(oid => !newIds.has(oid));

    const conn = await db.getClient();
    try {
      await conn.beginTransaction();

      if (toRemove.length > 0) {
        await conn.query('DELETE FROM user_offices WHERE user_id = ? AND office_id IN (?)', [id, toRemove]);
        for (const oid of toRemove) {
          await conn.query(
            'INSERT INTO user_office_history (user_id, office_id, office_name, action, changed_by) VALUES (?, ?, ?, ?, ?)',
            [id, oid, officeNameMap[oid] || `Офис #${oid}`, 'removed', user.id]
          );
        }
      }

      if (toAdd.length > 0) {
        for (const oid of toAdd) {
          await conn.query(
            'INSERT IGNORE INTO user_offices (user_id, office_id, assigned_by, assigned_at) VALUES (?, ?, ?, NOW())',
            [id, oid, user.id]
          );
          await conn.query(
            'INSERT INTO user_office_history (user_id, office_id, office_name, action, changed_by) VALUES (?, ?, ?, ?, ?)',
            [id, oid, officeNameMap[oid] || `Офис #${oid}`, 'added', user.id]
          );
        }
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [updatedOffices] = await db.query(`
      SELECT uo.office_id, o.name as office_name,
             CASE WHEN uo.office_id = ? THEN 1 ELSE 0 END as is_primary
      FROM user_offices uo
      JOIN offices o ON o.id = uo.office_id
      WHERE uo.user_id = ?
      ORDER BY is_primary DESC, o.name ASC
    `, [primaryOffice, id]);

    res.json({
      success: true,
      message: `Назначения обновлены: +${toAdd.length}, -${toRemove.length}`,
      offices: updatedOffices,
      added: toAdd.map(oid => ({ office_id: oid, office_name: officeNameMap[oid] })),
      removed: toRemove.map(oid => ({ office_id: oid, office_name: officeNameMap[oid] })),
    });
  } catch (error) {
    console.error('Ошибка при назначении офисов:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};


const DISMISSIBLE_ROLES = ['lawyer', 'expert', 'representative', 'admin', 'manager', 'okk'];
const SUCCESSOR_ROLES = ['manager', 'okk', 'director'];

const dismissalError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateDismissalTarget = (actor, target) => {
  if (!canDelete('employees', actor && actor.role)) {
    throw dismissalError(403, 'Недостаточно прав для увольнения сотрудника');
  }
  if (String(actor.id) === String(target.id)) {
    throw dismissalError(400, 'Нельзя уволить самого себя');
  }
  if (target.deleted_at) {
    throw dismissalError(409, 'Сотрудник уже уволен');
  }
  if (!DISMISSIBLE_ROLES.includes(String(target.role))) {
    throw dismissalError(400, 'Для этой роли требуется отдельный сценарий передачи обязанностей');
  }
  if (!target.office_id) {
    throw dismissalError(400, 'У сотрудника не указан основной офис');
  }
};

const getDismissalSuccessors = async (executor, officeId, employeeId) => {
  const [rows] = await executor.query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name, u.middle_name, u.role, u.office_id
       FROM users u
       LEFT JOIN user_offices uo
         ON uo.user_id = u.id AND uo.office_id = ?
       LEFT JOIN offices o
         ON o.id = ?
      WHERE u.id <> ?
        AND u.is_active = 1
        AND u.deleted_at IS NULL
        AND u.role IN ('manager', 'okk', 'director')
        AND (u.office_id = ? OR uo.office_id IS NOT NULL OR o.owner_id = u.id)
      ORDER BY FIELD(u.role, 'okk', 'manager', 'director'), u.last_name, u.first_name`,
    [officeId, officeId, employeeId, officeId]
  );
  return rows;
};

const getDismissalWorkload = async (executor, employeeId) => {
  const [contractsRows] = await executor.query(
    `SELECT COUNT(DISTINCT id) AS count
       FROM contracts
      WHERE status <> 'terminated'
        AND (id_employee = ? OR second_employee_id = ? OR expert_id = ? OR representative_id = ?)`,
    [employeeId, employeeId, employeeId, employeeId]
  );
  const [casesRows] = await executor.query(
    `SELECT COUNT(DISTINCT id) AS count
       FROM cases
      WHERE status NOT IN ('won', 'lost', 'closed')
        AND (employee_id = ? OR manager_id = ? OR expert_id = ?)`,
    [employeeId, employeeId, employeeId]
  );
  const [assignmentRows] = await executor.query(
    `SELECT COUNT(*) AS count
       FROM contract_assignments ca
       JOIN contracts c ON c.id = ca.contract_id AND c.status <> 'terminated'
      WHERE ca.user_id = ? AND ca.status IN ('pending', 'in_progress')`,
    [employeeId]
  );
  const [appointmentRows] = await executor.query(
    `SELECT COUNT(DISTINCT id) AS count
       FROM appointments
      WHERE status IN ('waiting', 'confirmed', 'rescheduled')
        AND (assigned_lawyer_id = ? OR assigned_lawyer_id_2 = ?)`,
    [employeeId, employeeId]
  );
  const [taskRows] = await executor.query(
    `SELECT COUNT(*) AS count
       FROM additional_tz
      WHERE status NOT IN ('done', 'closed')
        AND (expert_id = ? OR manager_id = ?)`,
    [employeeId, employeeId]
  );

  return {
    contracts: Number(contractsRows[0].count || 0),
    cases: Number(casesRows[0].count || 0),
    assignments: Number(assignmentRows[0].count || 0),
    appointments: Number(appointmentRows[0].count || 0),
    tasks: Number(taskRows[0].count || 0),
  };
};

// Preview is intentionally separate: the manager sees what will be transferred
// and explicitly chooses one responsible leader from the same office.
const getDismissalPreview = async (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, middle_name, role, office_id, is_active, deleted_at
         FROM users WHERE id = ? LIMIT 1`,
      [employeeId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }
    const target = rows[0];
    validateDismissalTarget(req.user, target);
    if (!(await checkOfficeAccess(req.user, target.office_id))) {
      return res.status(403).json({ success: false, message: 'Сотрудник другого офиса' });
    }

    const [successors, workload] = await Promise.all([
      getDismissalSuccessors(db, target.office_id, employeeId),
      getDismissalWorkload(db, employeeId),
    ]);
    const actorAsSuccessor = successors.find(s => Number(s.id) === Number(req.user.id));

    return res.json({
      success: true,
      employee: target,
      successors,
      suggested_successor_id: actorAsSuccessor?.id || successors[0]?.id || null,
      workload,
    });
  } catch (error) {
    console.error('Ошибка подготовки увольнения сотрудника:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Не удалось подготовить передачу дел',
    });
  }
};

const dismissEmployee = async (req, res) => {
  const employeeId = Number(req.params.id);
  const successorId = Number(req.body && req.body.successor_id);
  const reason = String((req.body && req.body.reason) || '').trim().slice(0, 500) || null;
  let connection;

  try {
    if (!successorId) {
      return res.status(400).json({ success: false, message: 'Выберите руководителя, которому передаются дела' });
    }

    connection = await db.getClient();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, first_name, last_name, middle_name, role, office_id, is_active, deleted_at
         FROM users WHERE id = ? FOR UPDATE`,
      [employeeId]
    );
    if (!rows.length) throw dismissalError(404, 'Сотрудник не найден');
    const target = rows[0];
    validateDismissalTarget(req.user, target);
    if (!(await checkOfficeAccess(req.user, target.office_id))) {
      throw dismissalError(403, 'Сотрудник другого офиса');
    }

    const successors = await getDismissalSuccessors(connection, target.office_id, employeeId);
    const successor = successors.find(item => Number(item.id) === successorId);
    if (!successor || !SUCCESSOR_ROLES.includes(String(successor.role))) {
      throw dismissalError(400, 'Выбранный руководитель недоступен или относится к другому офису');
    }

    const workload = await getDismissalWorkload(connection, employeeId);

    // Primary and secondary responsibility on all non-terminated contracts.
    await connection.query(
      `UPDATE contracts SET id_employee = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_employee = ? AND status <> 'terminated'`,
      [successorId, employeeId]
    );
    await connection.query(
      `UPDATE contracts SET second_employee_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE second_employee_id = ? AND status <> 'terminated'`,
      [successorId, employeeId]
    );

    // Specialist assignments return to the leader's queue instead of pretending
    // that a manager has the expert/representative role.
    await connection.query(
      `UPDATE contracts SET expert_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE expert_id = ? AND status <> 'terminated'`,
      [employeeId]
    );
    await connection.query(
      `UPDATE contracts SET representative_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE representative_id = ? AND status <> 'terminated'`,
      [employeeId]
    );

    await connection.query(
      `UPDATE cases SET employee_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND status NOT IN ('won', 'lost', 'closed')`,
      [successorId, employeeId]
    );
    await connection.query(
      `UPDATE cases SET manager_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE manager_id = ? AND status NOT IN ('won', 'lost', 'closed')`,
      [successorId, employeeId]
    );
    await connection.query(
      `UPDATE cases
          SET expert_id = NULL, manager_id = ?, workflow_status = 'with_manager', updated_at = CURRENT_TIMESTAMP
        WHERE expert_id = ? AND status NOT IN ('won', 'lost', 'closed')`,
      [successorId, employeeId]
    );

    await connection.query(
      `UPDATE additional_tz SET manager_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE manager_id = ? AND status NOT IN ('done', 'closed')`,
      [successorId, employeeId]
    );
    await connection.query(
      `UPDATE additional_tz
          SET expert_id = NULL, manager_id = ?, status = 'with_manager', updated_at = CURRENT_TIMESTAMP
        WHERE expert_id = ? AND status NOT IN ('done', 'closed')`,
      [successorId, employeeId]
    );

    await connection.query(
      `UPDATE appointments SET assigned_lawyer_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE assigned_lawyer_id = ? AND status IN ('waiting', 'confirmed', 'rescheduled')`,
      [successorId, employeeId]
    );
    await connection.query(
      `UPDATE appointments SET assigned_lawyer_id_2 = ?, updated_at = CURRENT_TIMESTAMP
        WHERE assigned_lawyer_id_2 = ? AND status IN ('waiting', 'confirmed', 'rescheduled')`,
      [successorId, employeeId]
    );

    // Keep the former employee's assignment rows as completed history and create
    // an active assignment for the successor where one does not already exist.
    await connection.query(
      `INSERT INTO contract_assignments
         (contract_id, user_id, role, assignment_type, status, assigned_at)
       SELECT ca.contract_id, ?, ?, 'manual', ca.status, CURRENT_TIMESTAMP
         FROM contract_assignments ca
         JOIN contracts c ON c.id = ca.contract_id AND c.status <> 'terminated'
        WHERE ca.user_id = ? AND ca.status IN ('pending', 'in_progress')
       ON DUPLICATE KEY UPDATE
         status = IF(contract_assignments.status = 'completed', VALUES(status), contract_assignments.status)`,
      [successorId, successor.role, employeeId]
    );
    await connection.query(
      `UPDATE contract_assignments ca
       JOIN contracts c ON c.id = ca.contract_id AND c.status <> 'terminated'
          SET ca.status = 'completed'
        WHERE ca.user_id = ? AND ca.status IN ('pending', 'in_progress')`,
      [employeeId]
    );

    await connection.query(
      `UPDATE users
          SET is_active = 0, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [req.user.id, employeeId]
    );
    await connection.query(
      `INSERT INTO employee_dismissals
         (employee_id, office_id, successor_id, dismissed_by, reason, transfer_summary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, target.office_id, successorId, req.user.id, reason, JSON.stringify(workload)]
    );

    await connection.commit();
    return res.json({
      success: true,
      message: 'Доступ сотрудника закрыт, действующие дела переданы руководителю',
      employee_id: employeeId,
      successor_id: successorId,
      workload,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Ошибка увольнения сотрудника:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Не удалось уволить сотрудника и передать дела',
    });
  } finally {
    if (connection) connection.release();
  }
};

// Мягкое удаление сотрудника (soft delete). Права: director/owner/manager/okk.
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const actor = req.user;

    if (!canDelete('employees', actor && actor.role)) {
      return res.status(403).json({ success: false, message: 'Недостаточно прав для удаления сотрудника' });
    }
    if (String(actor.id) === String(id)) {
      return res.status(400).json({ success: false, message: 'Нельзя удалить самого себя' });
    }

    const [rows] = await db.query('SELECT id, role, office_id, deleted_at FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Сотрудник не найден' });
    }
    const target = rows[0];
    if (target.deleted_at) {
      return res.json({ success: true, message: 'Сотрудник уже удалён', id: Number(id) });
    }
    if (['director', 'owner'].includes(String(target.role))) {
      return res.status(403).json({ success: false, message: 'Нельзя удалить генерального директора' });
    }
    // Удаление в рамках своего офиса (кроме director/owner, которым доступны все)
    if (!['director', 'owner'].includes(String(actor.role)) && actor.office_id && target.office_id && String(actor.office_id) !== String(target.office_id)) {
      return res.status(403).json({ success: false, message: 'Сотрудник другого офиса' });
    }

    await db.query('UPDATE users SET deleted_at = NOW(), deleted_by = ?, is_active = 0 WHERE id = ? AND deleted_at IS NULL', [actor.id, id]);
    return res.json({ success: true, message: 'Сотрудник удалён', id: Number(id) });
  } catch (error) {
    console.error('Ошибка при удалении сотрудника:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};
module.exports = {
  createEmployee,
  getEmployees,
  updateEmployee,
  resetPassword,
  deactivateEmployee,
  getDismissalPreview,
  dismissEmployee,
  deleteEmployee,
  changeOwnPassword,
  getAllowedRoles,
  changeRole,
  getChangeableRoles,
  getMyOffices,
  transferOffice,
  getStaffOffices,
  setStaffOffices,
  ROLE_LABELS,
};
