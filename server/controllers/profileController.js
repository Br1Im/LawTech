/**
 * Контроллер для управления профилем пользователя
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Список тестовых пользователей (в реальном приложении нужно использовать базу данных)
// Используем тот же массив, что и в auth.js
const users = [
    { 
        id: 1, 
        username: 'admin', 
        password: 'admin123', 
        role: 'admin',
        email: 'admin@example.com',
        avatar: null,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+7 (999) 123-45-67',
        bio: 'Администратор системы'
    },
    { 
        id: 2, 
        username: 'user', 
        password: 'user123', 
        role: 'user',
        email: 'user@example.com',
        avatar: null,
        firstName: 'Test',
        lastName: 'User',
        phone: '',
        bio: ''
    }
];

/**
 * Получение профиля пользователя
 */
const getProfile = (req, res) => {
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
        
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Ошибка при получении профиля пользователя:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

/**
 * Обновление профиля пользователя
 */
const updateProfile = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Пользователь не авторизован'
            });
        }

        const { username, email, firstName, lastName, phone, bio } = req.body;
        
        // Находим индекс пользователя в массиве
        const userIndex = users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }
        
        // Проверка, не занят ли email другим пользователем
        if (email && email !== users[userIndex].email) {
            const emailExists = users.some(u => u.email === email && u.id !== req.user.id);
            if (emailExists) {
                return res.status(400).json({
                    error: 'Пользователь с таким email уже существует'
                });
            }
        }
        
        // Проверка, не занято ли имя пользователя другим пользователем
        if (username && username !== users[userIndex].username) {
            const usernameExists = users.some(u => u.username === username && u.id !== req.user.id);
            if (usernameExists) {
                return res.status(400).json({
                    error: 'Пользователь с таким именем уже существует'
                });
            }
        }

        // Обновляем данные пользователя
        if (username) users[userIndex].username = username;
        if (email) users[userIndex].email = email;
        if (firstName) users[userIndex].firstName = firstName;
        if (lastName) users[userIndex].lastName = lastName;
        if (phone !== undefined) users[userIndex].phone = phone;
        if (bio !== undefined) users[userIndex].bio = bio;

        // Если передан пароль, обновляем его
        if (req.body.password) {
            users[userIndex].password = req.body.password;
        }

        // Отправляем обновленные данные пользователя (без пароля)
        const { password, ...userWithoutPassword } = users[userIndex];
        
        res.json({
            message: 'Профиль успешно обновлен',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Ошибка при обновлении профиля пользователя:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

/**
 * Загрузка аватара пользователя
 */
const uploadAvatar = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Пользователь не авторизован'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'Файл не загружен'
            });
        }

        // Находим индекс пользователя в массиве
        const userIndex = users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }

        // Если у пользователя уже был аватар, удаляем старый файл
        if (users[userIndex].avatar) {
            const oldAvatarPath = path.join(config.paths.uploads, path.basename(users[userIndex].avatar));
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        // Сохраняем путь к новому аватару
        const avatarUrl = `/uploads/${req.file.filename}`;
        users[userIndex].avatar = avatarUrl;

        // Отправляем обновленные данные пользователя (без пароля)
        const { password, ...userWithoutPassword } = users[userIndex];
        
        res.json({
            message: 'Аватар успешно загружен',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Ошибка при загрузке аватара:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

/**
 * Удаление аватара пользователя
 */
const deleteAvatar = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Пользователь не авторизован'
            });
        }

        // Находим индекс пользователя в массиве
        const userIndex = users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }

        // Если у пользователя был аватар, удаляем файл
        if (users[userIndex].avatar) {
            const avatarPath = path.join(config.paths.uploads, path.basename(users[userIndex].avatar));
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
            users[userIndex].avatar = null;
        }

        // Отправляем обновленные данные пользователя (без пароля)
        const { password, ...userWithoutPassword } = users[userIndex];
        
        res.json({
            message: 'Аватар успешно удален',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Ошибка при удалении аватара:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar
}; 