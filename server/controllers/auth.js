/**
 * Контроллеры для аутентификации пользователей
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const { generateUniqueConnectionCode } = require('../utils/callCenterCode');

/**
 * Генерирует пару access + refresh токенов
 */
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,   // 7d
  });
  const refreshToken = jwt.sign(payload, config.REFRESH_SECRET, {
    expiresIn: config.REFRESH_EXPIRES_IN, // 30d
  });
  return { accessToken, refreshToken };
}

// Обработчик для регистрации новых пользователей
const register = async (req, res) => {
    const connection = await db.getClient();
    try {
        const { name, email, password, userType, officeType, officeId, callCenterName, phone } = req.body;

        if (!name || !email || !password || !userType) {
            return res.status(400).json({ 
                success: false, message: 'Не все обязательные поля заполнены' 
            });
        }

        const isCallCenter = userType === 'call_center';
        if (isCallCenter && (!callCenterName || !phone)) {
            return res.status(400).json({
                success: false, message: 'Укажите название колл-центра и телефон'
            });
        }

        // Проверка, есть ли уже пользователь с таким email
        const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                success: false, message: 'Пользователь с таким email уже существует' 
            });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Для директора (userType === 'office') — НЕ привязываем к офису.
        // Он создаст офис(ы) на следующем шаге.
        const isDirector = userType === 'office';
        const role = isDirector ? 'director' : (isCallCenter ? 'cc_manager' : userType);

        let finalOfficeId = null;
        if (!isDirector && officeType === 'existing' && officeId) {
            finalOfficeId = officeId;
        }

        // Создаем нового пользователя в БД
        await connection.beginTransaction();
        const [result] = await connection.query(`
            INSERT INTO users (first_name, last_name, email, password, office_id, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [name, '', email, hashedPassword, finalOfficeId, role]);

        const newUserId = result.insertId;
        let callCenter = null;

        if (isCallCenter) {
            const connectionCode = await generateUniqueConnectionCode(connection);
            const [centerResult] = await connection.query(
                `INSERT INTO call_centers
                   (name, phone, owner_user_id, connection_code)
                 VALUES (?, ?, ?, ?)`,
                [String(callCenterName).trim(), String(phone).trim(), newUserId, connectionCode]
            );
            const callCenterId = centerResult.insertId;
            const publicId = `CC-${String(callCenterId).padStart(6, '0')}`;
            await connection.query('UPDATE call_centers SET public_id = ? WHERE id = ?', [publicId, callCenterId]);
            await connection.query(
                `INSERT INTO call_center_members (call_center_id, user_id, member_role)
                 VALUES (?, ?, 'chief')`,
                [callCenterId, newUserId]
            );
            callCenter = {
                id: callCenterId,
                public_id: publicId,
                name: String(callCenterName).trim(),
                connection_code: connectionCode
            };
        }

        await connection.commit();

        // Генерируем пару токенов
        const { accessToken, refreshToken } = generateTokens({
            id: newUserId, email, role, call_center_id: callCenter?.id || null
        });

        const newUser = {
            id: newUserId,
            first_name: name,
            last_name: '',
            email: email,
            role: role,
            office_id: finalOfficeId,
            needs_office_setup: isDirector,
            call_center: callCenter
        };

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token: accessToken,
            refreshToken,
            user: newUser
        });

    } catch (error) {
        try { await connection.rollback(); } catch { /* noop */ }
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ 
            success: false, message: 'Внутренняя ошибка сервера' 
        });
    } finally {
        connection.release();
    }
};

// Обработчик для логина пользователей
const login = async (req, res) => {
    try {
        const { login: loginField, email, password } = req.body;
        const identifier = loginField || email;

        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, message: 'Отсутствует логин или пароль' 
            });
        }

        // Поиск пользователя по логину или email
        const [users] = await db.query(
            'SELECT id, first_name, last_name, email, login, password, role, office_id, must_change_password, is_active, deleted_at FROM users WHERE login = ? OR email = ?', 
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, message: 'Неверный логин или пароль' 
            });
        }

        const user = users[0];

        if (Number(user.is_active) !== 1 || user.deleted_at) {
            return res.status(401).json({
                success: false,
                message: 'Доступ к аккаунту прекращён',
                code: 'ACCOUNT_DISABLED'
            });
        }

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, message: 'Неверный логин или пароль' 
            });
        }

        let callCenter = null;
        let connectedOffices = [];
        if (['cc_manager', 'cc_operator'].includes(user.role)) {
            const [centers] = await db.query(
                `SELECT cc.id, cc.public_id, cc.name, ccm.member_role
                   FROM call_center_members ccm
                   JOIN call_centers cc ON cc.id = ccm.call_center_id
                  WHERE ccm.user_id = ? AND cc.is_active = 1 LIMIT 1`,
                [user.id]
            );
            callCenter = centers[0] || null;
            if (callCenter) {
                const [offices] = await db.query(
                    `SELECT o.id, o.name, o.address
                       FROM office_call_centers occ
                       JOIN offices o ON o.id = occ.office_id
                      WHERE occ.call_center_id = ? AND occ.is_active = 1
                      ORDER BY o.name`,
                    [callCenter.id]
                );
                connectedOffices = offices;
                if (!user.office_id && offices.length) user.office_id = offices[0].id;
            }
        }

        // Генерируем пару токенов
        const { accessToken, refreshToken } = generateTokens({
            id: user.id, email: user.email, login: user.login,
            role: user.role, office_id: user.office_id,
            call_center_id: callCenter?.id || null
        });

        const { password: _, ...userWithoutPassword } = user;

        if (callCenter) {
            userWithoutPassword.call_center = callCenter;
            userWithoutPassword.offices = connectedOffices;
        }

        // Для директора — добавляем список его офисов
        if (user.role === 'director') {
            const [offices] = await db.query(
                'SELECT id, name, address, contact_phone FROM offices WHERE owner_id = ? ORDER BY name',
                [user.id]
            );
            userWithoutPassword.offices = offices;
            userWithoutPassword.needs_office_setup = offices.length === 0;
        }

        res.json({
            token: accessToken,
            refreshToken,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Ошибка при входе в систему:', error);
        res.status(500).json({ 
            success: false, message: 'Внутренняя ошибка сервера' 
        });
    }
};

// Обновление access-токена по refresh-токену
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false, message: 'Refresh-токен не предоставлен'
            });
        }

        // Верифицируем refresh-токен
        let payload;
        try {
            payload = jwt.verify(refreshToken, config.REFRESH_SECRET);
        } catch (err) {
            const isExpired = err.name === 'TokenExpiredError';
            return res.status(401).json({
                success: false,
                message: isExpired ? 'Refresh-токен истёк, войдите снова' : 'Невалидный refresh-токен',
                code: isExpired ? 'REFRESH_EXPIRED' : 'REFRESH_INVALID'
            });
        }

        // Проверяем, что пользователь ещё существует в БД
        const [users] = await db.query(
            'SELECT id, email, login, role, office_id, is_active, deleted_at FROM users WHERE id = ?',
            [payload.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false, message: 'Пользователь не найден', code: 'USER_NOT_FOUND'
            });
        }

        const user = users[0];

        if (Number(user.is_active) !== 1 || user.deleted_at) {
            return res.status(401).json({
                success: false,
                message: 'Доступ к аккаунту прекращён',
                code: 'ACCOUNT_DISABLED'
            });
        }

        if (['cc_manager', 'cc_operator'].includes(user.role)) {
            const [memberships] = await db.query(
                `SELECT ccm.call_center_id
                   FROM call_center_members ccm
                   JOIN call_centers cc ON cc.id = ccm.call_center_id AND cc.is_active = 1
                  WHERE ccm.user_id = ? LIMIT 1`,
                [user.id]
            );
            if (memberships.length) {
                user.call_center_id = memberships[0].call_center_id;
                if (!user.office_id) {
                    const [offices] = await db.query(
                        `SELECT office_id FROM office_call_centers
                          WHERE call_center_id = ? AND is_active = 1 ORDER BY connected_at LIMIT 1`,
                        [user.call_center_id]
                    );
                    if (offices.length) user.office_id = offices[0].office_id;
                }
            }
        }

        // Генерируем новую пару токенов (rolling refresh)
        const tokens = generateTokens({
            id: user.id, email: user.email, login: user.login,
            role: user.role, office_id: user.office_id,
            call_center_id: user.call_center_id || null
        });

        res.json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });

    } catch (error) {
        console.error('Ошибка при обновлении токена:', error);
        res.status(500).json({
            success: false, message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение информации о текущем пользователе
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false, message: 'Пользователь не авторизован'
            });
        }

        const [users] = await db.query(
            'SELECT id, first_name, last_name, email, role, office_id, created_at FROM users WHERE id = ?', 
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false, message: 'Пользователь не найден'
            });
        }

        const user = users[0];

        const userResponse = {
            ...user,
            officeId: user.office_id
        };

        if (['cc_manager', 'cc_operator'].includes(user.role)) {
            const [centers] = await db.query(
                `SELECT cc.id, cc.public_id, cc.name, ccm.member_role
                   FROM call_center_members ccm
                   JOIN call_centers cc ON cc.id = ccm.call_center_id
                  WHERE ccm.user_id = ? AND cc.is_active = 1 LIMIT 1`,
                [user.id]
            );
            if (centers.length) {
                userResponse.call_center = centers[0];
                const [offices] = await db.query(
                    `SELECT o.id, o.name, o.address
                       FROM office_call_centers occ
                       JOIN offices o ON o.id = occ.office_id
                      WHERE occ.call_center_id = ? AND occ.is_active = 1 ORDER BY o.name`,
                    [centers[0].id]
                );
                userResponse.offices = offices;
                if (!userResponse.office_id && offices.length) {
                    userResponse.office_id = offices[0].id;
                    userResponse.officeId = offices[0].id;
                }
            }
        }

        // Для директора — добавляем список его офисов
        if (user.role === 'director') {
            const [offices] = await db.query(
                'SELECT id, name, address, contact_phone FROM offices WHERE owner_id = ? ORDER BY name',
                [user.id]
            );
            userResponse.offices = offices;
            userResponse.needs_office_setup = offices.length === 0;
        }

        res.json({
            user: userResponse
        });

    } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
        res.status(500).json({ 
            success: false, message: 'Внутренняя ошибка сервера' 
        });
    }
};

/**
 * Обновление собственного профиля (имя, email, пароль).
 * Доступно ТОЛЬКО директору и только для своего аккаунта.
 */
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Пользователь не авторизован' });
        }

        const userId = req.user.id;
        const role = String(req.user.role || '').toLowerCase();
        if (role !== 'director') {
            return res.status(403).json({ success: false, message: 'Изменять профиль может только директор' });
        }

        const { name, email, password } = req.body || {};

        const updates = [];
        const params = [];

        // Имя -> first_name / last_name (middle_name не трогаем)
        if (typeof name === 'string' && name.trim().length > 0) {
            const parts = name.trim().split(/\s+/);
            const firstName = parts.shift();
            const lastName = parts.join(' ');
            updates.push('first_name = ?');
            params.push(firstName);
            updates.push('last_name = ?');
            params.push(lastName);
        }

        // Email — проверка формата и уникальности
        if (typeof email === 'string' && email.trim().length > 0) {
            const emailNorm = email.trim();
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(emailNorm)) {
                return res.status(400).json({ success: false, message: 'Некорректный email' });
            }
            const [dupes] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ?', [emailNorm, userId]);
            if (dupes.length > 0) {
                return res.status(400).json({ success: false, message: 'Этот email уже используется' });
            }
            updates.push('email = ?');
            params.push(emailNorm);
        }

        // Пароль
        if (typeof password === 'string' && password.length > 0) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Пароль должен быть не менее 6 символов' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashedPassword);
            updates.push('must_change_password = 0');
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
        }

        updates.push('updated_at = NOW()');
        params.push(userId);

        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        const [users] = await db.query(
            'SELECT id, first_name, last_name, email, role, office_id, created_at FROM users WHERE id = ?',
            [userId]
        );
        const user = users[0];

        return res.json({
            success: true,
            message: 'Профиль обновлён',
            user: { ...user, officeId: user.office_id }
        });
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};

module.exports = {
    login,
    register,
    refresh,
    getCurrentUser,
    updateProfile
};
