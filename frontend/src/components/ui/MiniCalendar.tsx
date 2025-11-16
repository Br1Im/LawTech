import React, { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './MiniCalendar.css';

dayjs.locale('ru');

const MiniCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDate = startOfMonth.startOf('week');
  const endDate = endOfMonth.endOf('week');

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const handleDateClick = (date: Dayjs) => {
    setSelectedDate(date);
  };

  const renderCalendarDays = () => {
    const days = [];
    let day = startDate;

    while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
      days.push(day);
      day = day.add(1, 'day');
    }

    return days;
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <button className="mini-calendar-nav" onClick={handlePrevMonth}>
          <FaChevronLeft />
        </button>
        <span className="mini-calendar-title">
          {currentDate.format('MMMM YYYY')}
        </span>
        <button className="mini-calendar-nav" onClick={handleNextMonth}>
          <FaChevronRight />
        </button>
      </div>

      <div className="mini-calendar-weekdays">
        {weekDays.map((day) => (
          <div key={day} className="mini-calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="mini-calendar-days">
        {renderCalendarDays().map((day, index) => {
          const isToday = day.isSame(dayjs(), 'day');
          const isSelected = day.isSame(selectedDate, 'day');
          const isCurrentMonth = day.isSame(currentDate, 'month');

          return (
            <button
              key={index}
              className={`mini-calendar-day ${isToday ? 'today' : ''} ${
                isSelected ? 'selected' : ''
              } ${!isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => handleDateClick(day)}
            >
              {day.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
