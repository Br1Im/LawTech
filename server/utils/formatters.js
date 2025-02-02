/**
 * Форматирует данные сообщения для ответа API
 * @param {Object} message - Сообщение из БД
 * @param {number} currentUserId - ID текущего пользователя
 * @returns {Object} - Отформатированное сообщение
 */
const formatMessageResponse = (message, currentUserId) => {
  const timestamp = message.created_at 
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  
  return {
    id: message.id.toString(),
    text: message.text,
    sender: message.sender,
    timestamp,
    office_id: message.office_id.toString(),
    isRead: !!message.is_read,
    isMine: message.user_id === currentUserId,
    createdAt: message.created_at
  };
};

/**
 * Форматирует данные офиса для ответа API
 * @param {Object} office - Офис из БД
 * @returns {Object} - Отформатированный офис
 */
const formatOfficeResponse = (office) => {
  // Преобразуем last_activity в удобочитаемый формат
  let lastActivity = '';
  
  if (office.last_activity) {
    const lastActiveTime = new Date(office.last_activity);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActiveTime) / (1000 * 60));
    
    if (diffMinutes < 5) {
      lastActivity = 'только что';
    } else if (diffMinutes < 60) {
      lastActivity = `${diffMinutes} мин. назад`;
    } else if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      lastActivity = `${hours} ч. назад`;
    } else {
      lastActivity = lastActiveTime.toLocaleDateString('ru-RU');
    }
  }
  
  return {
    id: office.id.toString(),
    name: office.name,
    title: office.name,
    description: office.address || '',
    address: office.address || '',
    contact_phone: office.contact_phone || null,
    website: office.website || null,
    online: !!office.online,
    lastActivity,
    employee_count: office.employee_count || 0,
    revenue: office.revenue || 0,
    orders: office.orders || 0,
    data: [0, 0] // Заглушка для совместимости с фронтендом
  };
};

module.exports = {
  formatMessageResponse,
  formatOfficeResponse
}; 