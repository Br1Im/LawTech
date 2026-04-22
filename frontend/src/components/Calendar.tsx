import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as AntCalendar,
  Badge,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Button,
  List,
  Card,
  ConfigProvider,
  notification,
  Switch,
  Alert,
  Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import locale from 'antd/locale/ru_RU';
import { useAuth } from '@/shared/lib/hooks/useAuth';
import { useOffice } from '@/shared/contexts/OfficeContext';
import { buildApiUrl } from '@/shared/utils/apiUtils';
import './Calendar.css';

dayjs.locale('ru');
dayjs.extend(weekday);
dayjs.extend(localeData);

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

interface Contract {
  id: string;
  contract_date: string;
  contractNumber?: string;
  contract_number?: string;
  client_name: string;
  amount: number;
  contract_type: string;
  status: string;
  subject?: string;
}

interface Office {
  id: string;
  name: string;
  contracts: Contract[];
}

const { Option } = Select;
const { TextArea } = Input;

interface CalendarProps {
  onOpenContract: (contractId: string) => void;
}

const CalendarComponent: React.FC<CalendarProps> = ({ onOpenContract }) => {
  const { token, user } = useAuth();
  const { selectedOffice } = useOffice();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();
  
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Логируем состояние при монтировании и изменениях
  useEffect(() => {
    console.log('📅 Calendar Component State:', {
      hasToken: !!token,
      userId: user?.id,
      selectedOffice: selectedOffice ? { id: selectedOffice.id, name: selectedOffice.name } : null,
      showAllEvents,
      eventsCount: events.length
    });
  }, [token, user, selectedOffice, showAllEvents, events.length]);

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token, selectedOffice, showAllEvents]);

  // Логируем события при изменении
  useEffect(() => {
    console.log('🔄 Events state updated:', {
      total: events.length,
      contracts: events.filter(e => e.type === 'contract').length,
      events: events.map(e => ({ id: e.id, type: e.type, date: e.date, title: e.title }))
    });
  }, [events]);

  const fetchEvents = async () => {
    console.log('📅 fetchEvents called', { token: !!token, selectedOffice: selectedOffice?.id, showAllEvents });
    
    if (!token) {
      console.log('❌ No token, skipping fetch');
      return;
    }
    
    setLoading(true);
    setError(null);

    let url = '';
    if (showAllEvents) {
      url = buildApiUrl('/calendar-events/all');
    } else if (selectedOffice) {
      url = buildApiUrl(`/office/${selectedOffice.id}/calendar-events`);
    } else {
      console.log('❌ No office selected, skipping fetch');
      setEvents([]);
      setLoading(false);
      return;
    }

    console.log('🔍 Fetching calendar events from:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log('📊 Calendar API response:', { ok: response.ok, success: data.success, eventsCount: data.events?.length });
      
      if (response.ok && data.success) {
        console.log('✅ Setting events:', data.events);
        console.log('📋 Events details:', data.events.map((e: any) => ({ 
          id: e.id, 
          type: e.type, 
          date: e.date, 
          title: e.title 
        })));
        
        // Проверяем договоры
        const contractEvents = data.events.filter((e: any) => e.type === 'contract');
        console.log('📝 Contract events found:', contractEvents.length, contractEvents);
        
        setEvents(data.events);
      } else {
        throw new Error(data.message || 'Failed to fetch events');
      }
    } catch (error: any) {
      console.error('❌ Error fetching events:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  const getEventsForDate = (date: Dayjs) => {
    const filtered = events.filter(event => {
      const eventDate = dayjs(event.date);
      const isSame = eventDate.isSame(date, 'day');
      if (event.type === 'contract' && isSame) {
        console.log('📅 Contract event matched:', { 
          eventDate: event.date, 
          selectedDate: date.format('YYYY-MM-DD'),
          title: event.title 
        });
      }
      return isSame;
    });
    return filtered;
  };

  const dateCellRender = (date: Dayjs) => {
    const dayEvents = getEventsForDate(date);
    
    // Группируем договоры
    const contracts = dayEvents.filter(e => e.type === 'contract');
    const otherEvents = dayEvents.filter(e => e.type !== 'contract');
    
    // Логируем только если есть события
    if (dayEvents.length > 0) {
      console.log(`📅 Рендер даты ${date.format('YYYY-MM-DD')}:`, {
        total: dayEvents.length,
        contracts: contracts.length,
        other: otherEvents.length
      });
    }
    
    return (
      <ul className="events">
        {contracts.length > 0 && (
          <li key="contracts">
            <Badge
              status="success"
              text={`Договор (${contracts.length})`}
            />
          </li>
        )}
        {otherEvents.slice(0, 2).map(event => (
          <li key={event.id}>
            <Badge
              status={getEventBadgeStatus(event.type)}
              text={event.title.length > 15 ? `${event.title.substring(0, 15)}...` : event.title}
            />
          </li>
        ))}
        {(contracts.length + otherEvents.length) > 3 && (
          <li className="more-events">+{(contracts.length + otherEvents.length) - 3} еще</li>
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
      case 'contract': return 'success';
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
      form.resetFields();
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
    if (!token || !user?.id || !selectedOffice?.id) {
        notification.error({ message: 'Ошибка', description: 'Не удалось определить пользователя или офис.' });
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const eventData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        officeId: selectedOffice.id,
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
      const result = await response.json();

      if (response.ok && result.success) {
        notification.success({ message: 'Успех', description: 'Событие успешно сохранено!' });
        await fetchEvents();
        handleModalCancel();
      } else {
        throw new Error(result.message || 'Ошибка при сохранении события');
      }
    } catch (err: any) {
      setError(err.message);
      notification.error({ message: 'Ошибка', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl(`/calendar-events/${eventId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (response.ok && result.success) {
        notification.success({ message: 'Успех', description: 'Событие удалено.' });
        await fetchEvents();
      } else {
        throw new Error(result.message || 'Ошибка при удалении события');
      }
    } catch (err: any) {
      setError(err.message);
      notification.error({ message: 'Ошибка', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const renderContractEventDetails = (event: CalendarEvent) => {
    if (!event || event.type !== 'contract') return null;

    // Получаем все события-договоры на выбранную дату
    const contractEvents = selectedDateEvents.filter(e => e.type === 'contract');

    if (contractEvents.length === 0) {
      return <div className="no-contracts"><p>Нет договоров на эту дату</p></div>;
    }

    const handleContractClick = (contractEvent: CalendarEvent) => {
      const contractId = (contractEvent as any).contract_id;
      if (onOpenContract && contractId) {
        onOpenContract(contractId);
      } else {
        notification.info({
          message: 'Информация о договоре',
          description: contractEvent.description || 'Детали договора',
        });
      }
    };

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
          <span>Договоры ({contractEvents.length})</span>
          <span className="event-time">{event.time}</span>
        </div>
        <div className="contract-list">
          {contractEvents.map((contractEvent) => (
            <div
              key={contractEvent.id}
              className="contract-item clickable"
              onClick={() => handleContractClick(contractEvent)}
              title="Нажмите для просмотра деталей договора"
            >
              <div className="contract-main-info">
                <span className="contract-client">📄 {contractEvent.title}</span>
                <span className="contract-status">{getStatusText((contractEvent as any).status || 'active')}</span>
              </div>
              <div className="contract-secondary-info">
                <span className="contract-time">⏰ {contractEvent.time}</span>
              </div>
              {contractEvent.description && (
                <div className="contract-subject">
                  {contractEvent.description}
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
          <div className="calendar-header__right">
            <div className="calendar-controls">
              <span>Показать все события</span>
              <Switch checked={showAllEvents} onChange={setShowAllEvents} size="small" />
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              Добавить событие
            </Button>
          </div>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
        )}

        <div className="calendar-content">
          <div className="calendar-main">
            <AntCalendar
              cellRender={dateCellRender}
              onSelect={handleDateSelect}
              value={selectedDate}
              disabledDate={(current) => loading && current.isSame(selectedDate, 'day')}
            />
          </div>

          <div className="calendar-sidebar">
            <Card
              title={`События на ${selectedDate.format('DD.MM.YYYY')}`}
              loading={loading}
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
                        <Popconfirm
                            title="Удалить событие?"
                            description="Вы уверены, что хотите удалить это событие?"
                            onConfirm={() => handleDeleteEvent(event.id)}
                            okText="Да"
                            cancelText="Нет"
                        >
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Popconfirm>
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
          destroyOnHidden
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ priority: 'medium', type: 'meeting' }}
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

export default CalendarComponent;