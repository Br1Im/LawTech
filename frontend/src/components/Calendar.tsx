import React, { useState, useEffect } from 'react';
import { Calendar as AntCalendar, Badge, Modal, Form, Input, DatePicker, TimePicker, Select, Button, List, Card, ConfigProvider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/locale/ru_RU';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { useOffice } from '../shared/contexts/OfficeContext';
import { buildApiUrl } from '../shared/utils/apiUtils';
import './Calendar.css';

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  type: 'meeting' | 'court' | 'deadline' | 'appointment' | 'contract' | 'other';
  priority: 'low' | 'medium' | 'high';
  participants?: string[];
  location?: string;
  createdBy: string;
  officeId: string;
}

const { Option } = Select;
const { TextArea } = Input;

interface CalendarProps {
  onOpenContract?: (contractNumber: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onOpenContract }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { selectedOffice } = useOffice();

  // Загрузка событий
  useEffect(() => {
    if (isAuthenticated && user?.office_id) {
      fetchEvents();
    }
  }, [isAuthenticated, user]);

  // Принудительное обновление календаря при изменении selectedOffice
  useEffect(() => {
    console.log('selectedOffice изменился:', selectedOffice);
    if (selectedOffice) {
      console.log('selectedOffice.contracts:', selectedOffice.contracts);
      // Принудительно обновляем компонент
      setSelectedDate(dayjs(selectedDate));
    }
  }, [selectedOffice]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token || !user?.office_id) {
        console.log('[CALENDAR FRONTEND] Нет токена или office_id:', { token: !!token, office_id: user?.office_id });
        return;
      }

      const apiUrl = buildApiUrl(`/office/${user.office_id}/calendar-events`);
      console.log('[CALENDAR FRONTEND] Отправляем запрос к API:', apiUrl);
      console.log('[CALENDAR FRONTEND] Данные пользователя:', { user_id: user.id, office_id: user.office_id });

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('[CALENDAR FRONTEND] Получен ответ от сервера:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[CALENDAR FRONTEND] Данные от сервера:', data);
        console.log('[CALENDAR FRONTEND] События в ответе:', data.events?.length || 0);
        setEvents(data.events || []);
      } else {
        const errorText = await response.text();
        console.error('[CALENDAR FRONTEND] Ошибка ответа сервера:', errorText);
        setError(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[CALENDAR FRONTEND] Ошибка загрузки событий:', err);
      setError('Не удалось загрузить события календаря');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  // Функция для преобразования договоров в события календаря
  const getContractEvents = (): CalendarEvent[] => {
    // Проверяем наличие офиса и договоров
    if (!selectedOffice) {
      console.log('Нет выбранного офиса');
      return [];
    }
    
    // Проверяем, что contracts существует и является массивом
    if (!selectedOffice.contracts || !Array.isArray(selectedOffice.contracts)) {
      console.log('Contracts не существует или не является массивом:', selectedOffice.contracts);
      return [];
    }
    
    console.log('Всего договоров:', selectedOffice.contracts.length);
    console.log('Пример договора:', selectedOffice.contracts[0]);
    
    // Фильтруем все договоры, независимо от статуса, но с датой
    const contractsWithDates = selectedOffice.contracts.filter(contract => 
      contract && 
      contract.contract_date && 
      typeof contract.contract_date === 'string' &&
      contract.contract_date.trim() !== ''
    );
    
    console.log('Договоров с датами:', contractsWithDates.length);
    
    if (contractsWithDates.length === 0) {
      console.log('Нет договоров с корректными датами');
      return [];
    }
    
    // Преобразуем даты в формат YYYY-MM-DD для корректной группировки
    const normalizedContracts = contractsWithDates.map((contract: any) => {
      let normalizedDate = contract.contract_date;
      // Если дата в формате DD.MM.YYYY, преобразуем в YYYY-MM-DD
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(contract.contract_date)) {
        const [day, month, year] = contract.contract_date.split('.');
        normalizedDate = `${year}-${month}-${day}`;
      }
      return { ...contract, normalizedDate };
    });
    
    // Группируем договоры по датам
    const contractsByDate: Record<string, any[]> = normalizedContracts.reduce((acc: Record<string, any[]>, contract: any) => {
      const date = contract.normalizedDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(contract);
      return acc;
    }, {});
    
    console.log('Группировка по датам:', Object.keys(contractsByDate).length);
    console.log('Даты договоров:', Object.keys(contractsByDate));
    
    // Создаем одно событие для каждой даты с количеством договоров
    return Object.entries(contractsByDate).map(([date, contracts]) => {
      if (!contracts || contracts.length === 0) return null;
      
      const contractsCount = contracts.length;
      const clientNames = contracts
        .filter((c: any) => c) // Проверяем, что контракт существует
        .map((c: any) => c.client_name || 'Без имени')
        .join(', ');
      
      return {
        id: `contracts-${date}`,
        title: `📝 Договоры: ${contractsCount}`, // Иконка + количество договоров
        description: `Договоры (${contractsCount}): ${clientNames}`,
        date: date,
        time: '09:00',
        type: 'contract' as const,
        priority: 'medium' as const,
        participants: contracts.map(c => c.client_name || 'Без имени'),
        location: '',
        createdBy: user?.id?.toString() || '',
        officeId: user?.office_id?.toString() || ''
      };
    }).filter(Boolean) as CalendarEvent[];
  };

  const getEventsForDate = (date: Dayjs) => {
    const calendarEvents = events.filter(event => dayjs(event.date).isSame(date, 'day'));
    const contractEvents = getContractEvents().filter(event => dayjs(event.date).isSame(date, 'day'));
    console.log(`События для даты ${date.format('YYYY-MM-DD')}:`, {
      calendarEvents: calendarEvents.length,
      contractEvents: contractEvents.length,
      total: calendarEvents.length + contractEvents.length
    });
    return [...calendarEvents, ...contractEvents];
  };

  const dateCellRender = (date: Dayjs) => {
    const dayEvents = getEventsForDate(date);
    return (
      <ul className="events">
        {dayEvents.slice(0, 3).map(event => (
          <li key={event.id}>
            <Badge 
              status={getEventBadgeStatus(event.type)} 
              text={event.title.length > 15 ? `${event.title.substring(0, 15)}...` : event.title}
            />
          </li>
        ))}
        {dayEvents.length > 3 && (
          <li className="more-events">+{dayEvents.length - 3} еще</li>
        )}
      </ul>
    );
  };

  const getEventBadgeStatus = (type: string) => {
    switch (type) {
      case 'meeting': return 'processing';
      case 'court': return 'error';
      case 'deadline': return 'warning';
      case 'appointment': return 'success';
      case 'contract': return 'success'; // Зеленый цвет для договоров - более позитивный
      default: return 'default';
    }
  };

  const showModal = (event?: CalendarEvent) => {
    setEditingEvent(event || null);
    if (event) {
      form.setFieldsValue({
        ...event,
        date: dayjs(event.date),
        time: dayjs(`${event.date} ${event.time}`, 'YYYY-MM-DD HH:mm')
      });
    } else {
      form.setFieldsValue({
        date: selectedDate,
        time: dayjs().hour(9).minute(0),
        type: 'meeting',
        priority: 'medium'
      });
    }
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingEvent(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token || !user?.office_id) return;

      const eventData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        officeId: user.office_id,
        createdBy: user.id
      };

      const url = editingEvent 
        ? buildApiUrl(`/calendar-events/${editingEvent.id}`)
        : buildApiUrl('/calendar-events');
      
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        await fetchEvents();
        handleModalCancel();
      } else {
        throw new Error('Ошибка при сохранении события');
      }
    } catch (err) {
      console.error('Ошибка сохранения события:', err);
      setError('Не удалось сохранить событие');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl(`/calendar-events/${eventId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchEvents();
      } else {
        throw new Error('Ошибка при удалении события');
      }
    } catch (err) {
      console.error('Ошибка удаления события:', err);
      setError('Не удалось удалить событие');
    } finally {
      setLoading(false);
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  // Функция для рендеринга событий договоров в детальном виде
  const renderContractEventDetails = (event: CalendarEvent) => {
    if (!event || event.type !== 'contract') return null;
    
    console.log('Рендеринг деталей договора для события:', event);
    
    // Проверяем наличие офиса и договоров
    if (!selectedOffice) {
      console.log('Нет выбранного офиса для отображения деталей');
      return (
        <div className="no-contracts">
          <p>Не удалось загрузить данные офиса</p>
        </div>
      );
    }
    
    if (!selectedOffice.contracts || !Array.isArray(selectedOffice.contracts)) {
      console.log('Нет договоров для отображения деталей:', selectedOffice);
      return (
        <div className="no-contracts">
          <p>Не удалось загрузить договоры</p>
        </div>
      );
    }
    
    console.log('Всего договоров в офисе:', selectedOffice.contracts.length);
    
    // Получаем все договоры на эту дату
    // Проверяем оба формата даты: YYYY-MM-DD и DD.MM.YYYY
    const contractsForDate = selectedOffice.contracts.filter(contract => {
      if (!contract || !contract.contract_date) return false;
      
      // Проверяем прямое совпадение
      if (contract.contract_date === event.date) return true;
      
      // Проверяем совпадение после преобразования формата
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(contract.contract_date)) {
        const [day, month, year] = contract.contract_date.split('.');
        const formattedDate = `${year}-${month}-${day}`;
        return formattedDate === event.date;
      }
      
      // Проверяем обратное преобразование
      if (/^\d{4}-\d{2}-\d{2}$/.test(contract.contract_date) && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
        const [year, month, day] = contract.contract_date.split('-');
        const [eventYear, eventMonth, eventDay] = event.date.split('-');
        return year === eventYear && month === eventMonth && day === eventDay;
      }
      
      return false;
    });

    console.log('Найдено договоров на дату', event.date, ':', contractsForDate.length);

    // Если нет договоров, показываем сообщение
    if (!contractsForDate || contractsForDate.length === 0) {
      return (
        <div className="no-contracts">
          <p>Нет договоров на эту дату</p>
        </div>
      );
    }

    // Функция для обработки клика по договору
    const handleContractClick = (contract: any) => {
      if (!contract) {
        console.log('Попытка открыть пустой договор');
        return;
      }
      
      // Проверяем наличие номера договора
      const contractNumber = contract.contractNumber || contract.contract_number || contract.id;
      
      // Переходим на страницу CRM с выбранным договором
      if (onOpenContract && contractNumber) {
        console.log('Открываем договор:', contractNumber);
        onOpenContract(contractNumber);
      } else {
        console.log('Не удалось открыть договор:', contract);
        alert('Не удалось открыть договор. Проверьте наличие номера договора.');
      }
    };

    // Функция для форматирования суммы
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Функция для получения статуса на русском
    const getStatusText = (status: string) => {
      const statusMap: { [key: string]: string } = {
        'draft': 'Черновик',
        'active': 'Активный',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
      };
      return statusMap[status] || status;
    };
    
    return (
      <div className="contract-details">
        <div className="contract-summary">
          <Badge status={getEventBadgeStatus(event.type)} />
          <span>Договоры ({contractsForDate.length})</span>
          <span className="event-time">{event.time}</span>
        </div>
        <div className="contract-list">
          {contractsForDate.map((contract) => (
            <div 
              key={contract.id} 
              className="contract-item clickable"
              onClick={() => handleContractClick(contract)}
              title="Нажмите для перехода к деталям договора"
            >
              <div className="contract-main-info">
                <span className="contract-client">📄 {contract.client_name}</span>
                <span className="contract-amount">{formatAmount(contract.amount)}</span>
              </div>
              <div className="contract-secondary-info">
                <span className="contract-type">{contract.contract_type}</span>
                <span className={`contract-status status-${contract.status}`}>
                  {getStatusText(contract.status)}
                </span>
              </div>
              {contract.subject && (
                <div className="contract-subject">
                  {contract.subject}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ConfigProvider locale={locale}>
      <div className="calendar-container">
        <div className="calendar-header">
          <h2>
            <CalendarOutlined /> Календарь
          </h2>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Добавить событие
          </Button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="calendar-content">
          <div className="calendar-main">
            <AntCalendar
              cellRender={dateCellRender}
              onSelect={handleDateSelect}
              value={selectedDate}
            />
          </div>

        <div className="calendar-sidebar">
          <Card 
            title={`События на ${selectedDate.format('DD.MM.YYYY')}`}
            extra={
              <Button 
                type="text" 
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              />
            }
          >
            {selectedDateEvents.length > 0 ? (
              <List
                dataSource={selectedDateEvents}
                renderItem={(event) => (
                  <List.Item
                    actions={event.type !== 'contract' ? [
                      <Button 
                        type="text" 
                        icon={<EditOutlined />}
                        onClick={() => showModal(event)}
                      />,
                      <Button 
                        type="text" 
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteEvent(event.id)}
                      />
                    ] : []}
                  >
                    {event.type === 'contract' ? (
                      renderContractEventDetails(event)
                    ) : (
                      <List.Item.Meta
                        title={
                          <div className="event-title">
                            <Badge status={getEventBadgeStatus(event.type)} />
                            <span>{event.title}</span>
                            <span className="event-time">{event.time}</span>
                          </div>
                        }
                        description={event.description}
                      />
                    )}
                  </List.Item>
                )}
              />
            ) : (
              <div className="no-events">
                <p>На эту дату событий нет</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        title={editingEvent ? 'Редактировать событие' : 'Новое событие'}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="Название события"
            rules={[{ required: true, message: 'Введите название события' }]}
          >
            <Input placeholder="Встреча с клиентом" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea rows={3} placeholder="Дополнительная информация о событии" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="date"
              label="Дата"
              rules={[{ required: true, message: 'Выберите дату' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="time"
              label="Время"
              rules={[{ required: true, message: 'Выберите время' }]}
              style={{ flex: 1 }}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="type"
              label="Тип события"
              rules={[{ required: true, message: 'Выберите тип события' }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="meeting">Встреча</Option>
                <Option value="court">Суд</Option>
                <Option value="deadline">Дедлайн</Option>
                <Option value="appointment">Прием</Option>
                <Option value="other">Другое</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="priority"
              label="Приоритет"
              rules={[{ required: true, message: 'Выберите приоритет' }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="low">Низкий</Option>
                <Option value="medium">Средний</Option>
                <Option value="high">Высокий</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="location"
            label="Место"
          >
            <Input placeholder="Офис, суд, онлайн" />
          </Form.Item>

          <Form.Item
            name="participants"
            label="Участники"
          >
            <Input placeholder="Имена участников через запятую" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button onClick={handleModalCancel}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingEvent ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </Form>
      </Modal>
      </div>
    </ConfigProvider>
  );
};

export default Calendar;