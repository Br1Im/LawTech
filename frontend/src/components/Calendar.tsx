import React, { useState, useEffect } from 'react';
import { Calendar as AntCalendar, Badge, Modal, Form, Input, DatePicker, TimePicker, Select, Button, List, Card, ConfigProvider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/locale/ru_RU';
import { useAuth } from '../shared/lib/hooks/useAuth';
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
  type: 'meeting' | 'court' | 'deadline' | 'appointment' | 'other';
  priority: 'low' | 'medium' | 'high';
  participants?: string[];
  location?: string;
  createdBy: string;
  officeId: string;
}

const { Option } = Select;
const { TextArea } = Input;

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Загрузка событий
  useEffect(() => {
    if (isAuthenticated && user?.office_id) {
      fetchEvents();
    }
  }, [isAuthenticated, user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token || !user?.office_id) return;

      const response = await fetch(buildApiUrl(`/office/${user.office_id}/calendar-events`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки событий:', err);
      setError('Не удалось загрузить события календаря');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  const getEventsForDate = (date: Dayjs) => {
    return events.filter(event => dayjs(event.date).isSame(date, 'day'));
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
                    actions={[
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
                    ]}
                  >
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