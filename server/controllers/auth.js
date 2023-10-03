/**
 * Контроллеры для аутентификации пользователей
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

// Список тестовых пользователей (в реальном приложении нужно использовать базу данных)
const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, username: 'user', password: 'user123', role: 'user' }
];

// Обработчик для регистрации новых пользователей
const register = (req, res) => {
    try {
        const { name, email, password, userType, officeType, officeId } = req.body;

        if (!name || !email || !password || !userType) {
            return res.status(400).json({ 
                error: 'Не все обязательные поля заполнены' 
            });
        }

        // Проверка, есть ли уже пользователь с таким email
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({ 
                error: 'Пользователь с таким email уже существует' 
            });
        }

        // Создаем нового пользователя
        const newUser = {
            id: users.length + 1,
            username: name,
            email,
            password,
            role: userType,
            isNewOffice: userType === 'office' && officeType === 'new'
        };

        // Если это существующий офис, сохраняем ID офиса
        if (userType === 'office' && officeType === 'existing' && officeId) {
            newUser.officeId = officeId;
        }

        // Добавляем пользователя в массив (в реальном приложении - в БД)
        users.push(newUser);

        // Создаем JWT токен для автоматической авторизации
        const token = jwt.sign(
            { 
                id: newUser.id, 
                email: newUser.email,
                role: newUser.role 
            }, 
            config.JWT_SECRET, 
            { 
                expiresIn: '24h' 
            }
        );

        // Возвращаем успех и токен (без пароля)
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Обработчик для логина пользователей
const login = (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Отсутствует email или пароль' 
            });
        }

        // Поиск пользователя в базе (в данном случае просто массив)
        const user = users.find(u => 
            (u.email === email || u.username === email) && u.password === password
        );

        if (!user) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }

        // Создаем JWT токен (срок действия 24 часа)
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email || user.username,
                role: user.role 
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
const getCurrentUser = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Пользователь не авторизован'
            });
        }

        // Находим полную информацию о пользователе
        const user = users.find(u => u.id === req.user.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }

        // Отправляем данные пользователя (без пароля)
        const { password, ...userWithoutPassword } = user;
        
        res.json({
            user: userWithoutPassword
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