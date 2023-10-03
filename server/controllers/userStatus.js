/**
 * Контроллер для управления статусом пользователей (онлайн/офлайн)
 */
const User = require('../models/user');

// Временное хранилище для отслеживания статусов (пока не используем БД)
const userStatuses = new Map();

// Обновление статуса пользователя (онлайн)
const updateUserStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Обновляем статус пользователя
    userStatuses.set(userId, {
      isOnline: true,
      lastActive: new Date()
    });

    // В реальном приложении с БД использовали бы:
    // await User.findByIdAndUpdate(userId, {
    //   isOnline: true,
    //   lastActive: new Date()
    // });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка при обновлении статуса пользователя:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Получение статуса пользователей
const getUsersStatus = async (req, res) => {
  try {
    // Преобразуем Map в объект для ответа
    const statuses = {};
    userStatuses.forEach((status, userId) => {
      statuses[userId] = status;
    });

    return res.status(200).json(statuses);
  } catch (error) {
    console.error('Ошибка при получении статусов пользователей:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Функция для автоматического обновления статуса пользователей
// (вызывается периодически для проверки неактивных пользователей)
const checkInactiveUsers = () => {
  const now = new Date();
  
  userStatuses.forEach((status, userId) => {
    // Если пользователь не был активен более 2 секунд, помечаем как офлайн
    if (status.isOnline && now - new Date(status.lastActive) > 2000) {
      userStatuses.set(userId, {
        isOnline: false,
        lastActive: status.lastActive
      });
      
      // В реальном приложении с БД использовали бы:
      // User.findByIdAndUpdate(userId, { isOnline: false }).catch(err => {
      //   console.error(`Ошибка при обновлении статуса пользователя ${userId}:`, err);
      // });
    }
  });
};

// Запускаем проверку каждую секунду
setInterval(checkInactiveUsers, 1000);

module.exports = {
  updateUserStatus,
  getUsersStatus
}; 