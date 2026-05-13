/**
 * Контроллеры для аутентификации пользователей
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');

// Обработчик для регистрации новых пользователей
const register = async (req, res) => {
    try {
        const { name, email, password, userType, officeType, officeId } = req.body;

        if (!name || !email || !password || !userType) {
            return res.status(400).json({ 
                success: false, message: 'Не все обязательные поля заполнены' 
            });
        }

        // Проверка, есть ли уже пользователь с таким email
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
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
        const role = isDirector ? 'director' : userType;

        let finalOfficeId = null;
        if (!isDirector && officeType === 'existing' && officeId) {
            finalOfficeId = officeId;
        }

        // Создаем нового пользователя в БД
        const [result] = await db.query(`
            INSERT INTO users (first_name, last_name, email, password, office_id, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [name, '', email, hashedPassword, finalOfficeId, role]);

        const newUserId = result.insertId;

        // Создаем JWT токен для автоматической авторизации
        const token = jwt.sign(
            { 
                id: newUserId, 
                email: email,
                role: role
            }, 
            config.JWT_SECRET, 
            { 
                expiresIn: '24h' 
            }
        );

        const newUser = {
            id: newUserId,
            first_name: name,
            last_name: '',
            email: email,
            role: role,
            office_id: finalOfficeId,
            needs_office_setup: isDirector
        };
        
        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: newUser
        });

    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ 
            success: false, message: 'Внутренняя ошибка сервера' 
        });
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
            'SELECT id, first_name, last_name, email, login, password, role, office_id, must_change_password FROM users WHERE login = ? OR email = ?', 
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, message: 'Неверный логин или пароль' 
            });
        }

        const user = users[0];

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, message: 'Неверный логин или пароль' 
            });
        }

        // Создаем JWT токен (срок действия 24 часа)
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                login: user.login,
                role: user.role,
                office_id: user.office_id 
            }, 
            config.JWT_SECRET, 
            { 
                expiresIn: '24h' 
            }
        );

        const { password: _, ...userWithoutPassword } = user;

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
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Ошибка при входе в систему:', error);
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

module.exports = {
    login,
    register,
    getCurrentUser
};
