const User = require('../models/user');

exports.updateStatus = async (req, res) => {
  try {
    const { userId, isOnline } = req.body;
    
    if (userId === undefined || isOnline === undefined) {
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }
    
    const status = await User.updateStatus(userId, isOnline);
    res.json(status);
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'Отсутствует идентификатор пользователя' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({
      isOnline: user.isOnline,
      lastActive: user.lastActive
    });
  } catch (error) {
    console.error('Ошибка при получении статуса:', error);
    res.status(500).json({ error: 'Ошибка получения статуса' });
  }
}; 