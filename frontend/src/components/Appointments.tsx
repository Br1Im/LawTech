import React, { useState, useEffect } from 'react';
import { CalendarOutlined, ClockCircleOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import './Appointments.css';

interface Appointment {
  id: string;
  clientName: string;
  phone: string;
  time: string;
  date: string;
  service: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('today');
  const [loading, setLoading] = useState<boolean>(false);

  // Мок-данные для демонстрации
  const mockAppointments: Appointment[] = [
    {
      id: '1',
      clientName: 'Иванов Иван Иванович',
      phone: '+7 900 123-45-67',
      time: '10:00',
      date: new Date().toISOString().split('T')[0],
      service: 'Консультация по семейному праву',
      status: 'scheduled'
    },
    {
      id: '2',
      clientName: 'Петрова Мария Сергеевна',
      phone: '+7 900 234-56-78',
      time: '14:30',
      date: new Date().toISOString().split('T')[0],
      service: 'Составление договора',
      status: 'scheduled'
    },
    {
      id: '3',
      clientName: 'Сидоров Петр Александрович',
      phone: '+7 900 345-67-89',
      time: '11:00',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      service: 'Представительство в суде',
      status: 'scheduled'
    },
    {
      id: '4',
      clientName: 'Козлова Елена Викторовна',
      phone: '+7 900 456-78-90',
      time: '16:00',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      service: 'Консультация по трудовому праву',
      status: 'scheduled'
    }
  ];

  useEffect(() => {
    setLoading(true);
    // Имитация загрузки данных
    setTimeout(() => {
      setAppointments(mockAppointments);
      setLoading(false);
    }, 500);
  }, []);

  const getFilteredAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (selectedDate) {
      case 'today':
        return appointments.filter(apt => apt.date === today);
      case 'tomorrow':
        return appointments.filter(apt => apt.date === tomorrow);
      case 'all':
        return appointments;
      default:
        return appointments;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Запланировано';
      case 'completed':
        return 'Завершено';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'status-scheduled';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const filteredAppointments = getFilteredAppointments();
  const todayCount = appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length;
  const tomorrowCount = appointments.filter(apt => apt.date === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]).length;

  if (loading) {
    return (
      <div className="appointments-container">
        <div className="appointments-header">
          <h2><CalendarOutlined /> Записи</h2>
        </div>
        <div className="loading-state">
          Загрузка записей...
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h2><CalendarOutlined /> Записи</h2>
        <div className="appointments-stats">
          <div className="stat-item">
            <span className="stat-label">Сегодня:</span>
            <span className="stat-value">{todayCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Завтра:</span>
            <span className="stat-value">{tomorrowCount}</span>
          </div>
        </div>
      </div>

      <div className="appointments-filters">
        <button 
          className={`filter-btn ${selectedDate === 'today' ? 'active' : ''}`}
          onClick={() => setSelectedDate('today')}
        >
          Сегодня ({todayCount})
        </button>
        <button 
          className={`filter-btn ${selectedDate === 'tomorrow' ? 'active' : ''}`}
          onClick={() => setSelectedDate('tomorrow')}
        >
          Завтра ({tomorrowCount})
        </button>
        <button 
          className={`filter-btn ${selectedDate === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedDate('all')}
        >
          Все записи
        </button>
      </div>

      <div className="appointments-list">
        {filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <CalendarOutlined className="empty-icon" />
            <p>Нет записей на выбранную дату</p>
          </div>
        ) : (
          filteredAppointments.map(appointment => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-time">
                <ClockCircleOutlined />
                <span>{appointment.time}</span>
              </div>
              <div className="appointment-info">
                <div className="client-info">
                  <UserOutlined />
                  <span className="client-name">{appointment.clientName}</span>
                </div>
                <div className="phone-info">
                  <PhoneOutlined />
                  <span>{appointment.phone}</span>
                </div>
                <div className="service-info">
                  <span className="service">{appointment.service}</span>
                </div>
              </div>
              <div className="appointment-status">
                <span className={`status ${getStatusClass(appointment.status)}`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Appointments;