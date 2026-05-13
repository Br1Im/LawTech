/**
 * Middleware-хелперы для отправки WebSocket-событий из контроллеров.
 * Контроллер вызывает emitXxx() после успешного ответа клиенту.
 */
const socket = require('../socketManager');

const ROLE_LABELS = {
  director: 'Директор',
  manager: 'Менеджер',
  admin: 'Администратор',
  administrator: 'Администратор',
  lawyer: 'Юрист',
  expert: 'Эксперт',
  okk: 'ОКК',
  representative: 'Представитель',
  cc_manager: 'Начальник КЦ',
  cc_operator: 'Оператор КЦ',
};

function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

module.exports = {
  /**
   * Новый лид поступил
   */
  emitLeadNew(officeId, lead) {
    socket.emitToOffice(officeId, 'lead:new', {
      title: 'Новый лид',
      message: `Поступил лид: ${lead.name || lead.client_name || 'Без имени'}`,
      type: 'info',
      data: lead,
    });
  },

  /**
   * Лид обновлён (статус / назначен оператор)
   */
  emitLeadUpdated(officeId, lead, action) {
    socket.emitToOffice(officeId, 'lead:updated', {
      title: 'Лид обновлён',
      message: action || `Лид ${lead.client_name || ''} обновлён`,
      type: 'info',
      data: lead,
    });
  },

  /**
   * Клиент записан на консультацию
   */
  emitAppointmentNew(officeId, appointment) {
    socket.emitToOffice(officeId, 'appointment:new', {
      title: 'Новая запись',
      message: `Записан ${appointment.client_name || ''} на ${appointment.date || ''} ${appointment.time || ''}`,
      type: 'info',
      data: appointment,
    });
  },

  /**
   * Статус записи изменён (пришёл / не пришёл)
   */
  emitAppointmentStatus(officeId, appointment) {
    const statusText = appointment.status === 'arrived' ? 'Клиент пришёл' : 'Клиент не пришёл';
    socket.emitToOffice(officeId, 'appointment:status', {
      title: statusText,
      message: `${appointment.client_name || 'Клиент'}: ${statusText}`,
      type: appointment.status === 'arrived' ? 'success' : 'warning',
      data: appointment,
    });
  },

  /**
   * Результат консультации
   */
  emitVisitResult(officeId, data) {
    const result = data.result === 'signed' ? 'Договор заключён' : 'Договор не заключён';
    socket.emitToOffice(officeId, 'visit:result', {
      title: result,
      message: `${data.client_name || 'Клиент'}: ${result}`,
      type: data.result === 'signed' ? 'success' : 'warning',
      data,
    });
  },

  /**
   * Новый договор создан
   */
  emitContractNew(officeId, contract) {
    socket.emitToOffice(officeId, 'contract:new', {
      title: 'Новый договор',
      message: `Договор ${contract.contract_number || ''} создан`,
      type: 'success',
      data: contract,
    });
  },

  /**
   * Договор обновлён
   */
  emitContractUpdated(officeId, contract) {
    socket.emitToOffice(officeId, 'contract:updated', {
      title: 'Договор обновлён',
      message: `Договор ${contract.contract_number || ''} обновлён`,
      type: 'info',
      data: contract,
    });
  },

  /**
   * Новый акт
   */
  emitActNew(officeId, act) {
    socket.emitToOffice(officeId, 'act:new', {
      title: 'Новый акт',
      message: `Акт на ${act.amount || 0} ₽ создан`,
      type: 'info',
      data: act,
    });
  },

  /**
   * Акт подтверждён
   */
  emitActConfirmed(officeId, act) {
    socket.emitToOffice(officeId, 'act:confirmed', {
      title: 'Акт подтверждён',
      message: `Акт на ${act.amount || 0} ₽ подтверждён`,
      type: 'success',
      data: act,
    });
  },

  /**
   * Новое сообщение в чате
   */
  emitChatMessage(officeId, channel, message) {
    // Определяем, каким ролям доступен канал
    const channelRoles = {
      reception: ['admin', 'administrator', 'manager', 'okk', 'director'],
      call_center: ['cc_manager', 'manager', 'okk', 'director'],
      cc_internal: ['cc_manager', 'cc_operator'],
    };
    const roles = channelRoles[channel] || [];
    socket.emitToOfficeRoles(officeId, roles, 'chat:message', {
      title: 'Новое сообщение',
      message: `${message.sender_name || ''}: ${(message.content || '').substring(0, 50)}`,
      type: 'info',
      channel,
      data: message,
    });
  },

  /**
   * Новый расход
   */
  emitExpenseNew(officeId, expense) {
    socket.emitToOffice(officeId, 'expense:new', {
      title: 'Новый расход',
      message: `${expense.title || 'Расход'}: ${expense.amount || 0} ₽`,
      type: 'warning',
      data: expense,
    });
  },

  /**
   * Сотрудник обновлён
   */
  emitEmployeeUpdated(officeId, employee) {
    socket.emitToOffice(officeId, 'employee:updated', {
      title: 'Сотрудник обновлён',
      message: `${employee.name || ''} обновлён`,
      type: 'info',
      data: employee,
    });
  },
};
