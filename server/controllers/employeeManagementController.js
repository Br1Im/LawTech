/**
 * Контроллер управления сотрудниками (иерархическая система)
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');

// Иерархия: кто кого может создавать
const CREATION_HIERARCHY = {
  director: ['manager', 'okk', 'cc_manager', 'expert'],
  manager: ['lawyer', 'representative', 'admin'],
  okk: ['lawyer', 'representative', 'admin'],
  cc_manager: ['cc_operator'],
};

// Иерархия: кто какие роли может назначать (повышение/понижение)
const ROLE_CHANGE_HIERARCHY = {
  director: ['manager', 'okk', 'cc_manager', 'cc_operator', 'expert', 'lawyer', 'representative', 'admin'],
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
  try {
    const creator = req.user;
    const { first_name, last_name, middle_name, phone, role, office_id } = req.body;

    if (!first_name || !last_name || !role) {
      return res.status(400).json({ success: false, message: 'Обязательные поля: Фамилия, Имя, должность' });
    }

    // Проверяем иерархию
    const allowedRoles = CREATION_HIERARCHY[creator.role];
    if (!allowedRoles || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false, message: `Роль "${creator.role}" не может создавать сотрудников с ролью "${role}"`,
      });
    }

    // Определяем office_id
    let employeeOfficeId = office_id || creator.office_id;

    // Генерируем логин и пароль
    const login = await generateUniqueLogin(first_name, last_name);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [result] = await db.query(`
      INSERT INTO users (first_name, last_name, middle_name, email, login, phone, password, role, office_id, is_active, must_change_password, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())
    `, [first_name, last_name, middle_name || '', `${login}@staff.local`, login, phone || null, hashedPassword, role, employeeOfficeId, creator.id]);

    res.status(201).json({
      message: 'Сотрудник создан',
      employee: {
        id: result.insertId,
        first_name,
        last_name,
        middle_name: middle_name || '',
        phone,
        role,
        role_label: ROLE_LABELS[role] || role,
        office_id: employeeOfficeId,
        login,
        password: plainPassword,
      },
    });
  } catch (error) {
    console.error('Ошибка при создании сотрудника:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
};

// Список сотрудников (по офису текущего пользователя)
const getEmployees = async (req, res) => {
  try {
    const user = req.user;
    const officeId = req.query.office_id || user.office_id;

    if (officeId) {
      const allowed = await checkOfficeAccess(user, officeId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
    }

    let query = `
      SELECT id, first_name, last_name, middle_name, login, phone, email, role, office_id, is_active, created_by, created_at
      FROM users WHERE 1=1
    `;
    const params = [];

    if (officeId) {
      query += ' AND office_id = ?';
      params.push(officeId);
    }

    // Для КЦ ролей показываем только состав КЦ (начальник + операторы)
    if (user.role === 'cc_manager') {
      query += ' AND role IN (?, ?)';
      params.push('cc_manager', 'cc_operator');
    } else if (user.role === 'cc_operator') {
      query += ' AND role IN (?, ?)';
      params.push('cc_manager', 'cc_operator');
    }

    // Не показываем пароли и деактивированных (если не запрошены)
    if (req.query.include_inactive !== 'true') {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY created_at DESC';

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
        employees: employees.map(e => ({ ...e, role_label: ROLE_LABELS[e.role] || e.role, password: undefined })),
        total, page, page_size: pageSize,
      });
    }

    const [employees] = await db.query(query, params);

    res.json({
      employees: employees.map(e => ({
        ...e,
        role_label: ROLE_LABELS[e.role] || e.role,
        password: undefined,
      })),
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
    if (target.created_by !== creator.id && creator.role !== 'director') {
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

module.exports = {
  createEmployee,
  getEmployees,
  updateEmployee,
  resetPassword,
  deactivateEmployee,
  changeOwnPassword,
  getAllowedRoles,
  changeRole,
  getChangeableRoles,
  ROLE_LABELS,
};
