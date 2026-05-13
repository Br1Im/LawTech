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

  // Формируем имя отправителя из данных JOIN
  const senderName = message.sender_name
    || `${message.first_name || ''} ${message.last_name || ''}`.trim()
    || message.user_email
    || 'Пользователь';
  
  return {
    id: message.id.toString(),
    text: message.content || message.text || '',
    sender: senderName,
    senderRole: message.user_role || null,
    senderFirstName: message.first_name || null,
    senderLastName: message.last_name || null,
    timestamp,
    office_id: message.office_id.toString(),
    isRead: !!message.is_read,
    isMine: message.sender_id === currentUserId,
    status: message.status || (message.is_read ? 'read' : 'sent'),
    createdAt: message.created_at,
    fileUrl: message.file_url || null,
    fileName: message.file_name || null,
    fileType: message.file_type || null,
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