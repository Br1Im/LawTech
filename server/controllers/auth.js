/**
 * Контроллеры для аутентификации пользователей
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const db = require('../db');

// Обработчик для регистрации новых пользователей
const register = async (req, res) => {
    try {
        const { name, email, password, userType, officeType, officeId } = req.body;

        if (!name || !email || !password || !userType) {
            return res.status(400).json({ 
                error: 'Не все обязательные поля заполнены' 
            });
        }

        // Проверка, есть ли уже пользователь с таким email
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                error: 'Пользователь с таким email уже существует' 
            });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Определяем office_id
        let finalOfficeId = null;
        if (userType === 'office' && officeType === 'existing' && officeId) {
            finalOfficeId = officeId;
        }

        // Создаем нового пользователя в БД
        const [result] = await db.query(`
            INSERT INTO users (username, email, password, office_id, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [name, email, hashedPassword, finalOfficeId, userType]);

        const newUserId = result.insertId;

        // Создаем JWT токен для автоматической авторизации
        const token = jwt.sign(
            { 
                id: newUserId, 
                email: email,
                role: userType 
            }, 
            config.JWT_SECRET, 
            { 
                expiresIn: '24h' 
            }
        );

        // Отправляем токен и данные пользователя (без пароля)
        const newUser = {
            id: newUserId,
            username: name,
            email: email,
            role: userType,
            office_id: finalOfficeId
        };
        
        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: newUser
        });

    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Обработчик для логина пользователей
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Отсутствует email или пароль' 
            });
        }

        // Поиск пользователя в базе данных
        const [users] = await db.query(
            'SELECT id, username, email, password, role, office_id FROM users WHERE email = ? OR username = ?', 
            [email, email]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }

        const user = users[0];

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }

        // Создаем JWT токен (срок действия 24 часа)
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                role: user.role,
                office_id: user.office_id 
            }, 
            config.JWT_SECRET, 
            { 
                expiresIn: '24h' 
            }
        );

        // Отправляем токен и данные пользователя (без пароля)
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Ошибка при входе в систему:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Получение информации о текущем пользователе
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Пользователь не авторизован'
            });
        }

        // Находим полную информацию о пользователе
        const [users] = await db.query(
            'SELECT id, username, email, role, office_id, created_at FROM users WHERE id = ?', 
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }

        const user = users[0];
        
        // Преобразуем office_id в officeId для совместимости с фронтендом
        const userResponse = {
            ...user,
            officeId: user.office_id
        };
        
        res.json({
            user: userResponse
        });

    } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

module.exports = {
    login,
    register,
    getCurrentUser
};