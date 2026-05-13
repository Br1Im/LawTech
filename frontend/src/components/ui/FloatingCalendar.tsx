import React, { useEffect, useRef, useState } from 'react';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';
import MiniCalendar from './MiniCalendar';
import './FloatingCalendar.css';

/**
 * Плавающий виджет календаря в правом нижнем углу.
 * Кнопка-«пилюля» разворачивает мини-календарь по клику.
 * Состояние открытости сохраняется в localStorage.
 */
const FloatingCalendar: React.FC = () => {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('floating_calendar_open') === '1';
    } catch {
      return false;
    }
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('floating_calendar_open', open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  // Закрываем по Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="floating-calendar-root" aria-live="polite">
      {open && (
        <div className="floating-calendar-panel" ref={panelRef} role="dialog" aria-label="Календарь">
          <div className="floating-calendar-panel-header">
            <span className="floating-calendar-panel-title">Календарь</span>
            <button
              type="button"
              className="floating-calendar-close"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              title="Закрыть"
            >
              <FaTimes />
            </button>
          </div>
          <div className="floating-calendar-panel-body">
            <MiniCalendar />
          </div>
        </div>
      )}

      <button
        type="button"
        className={`floating-calendar-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Свернуть календарь' : 'Открыть календарь'}
        aria-expanded={open}
      >
        <FaCalendarAlt />
      </button>
    </div>
  );
};

export default FloatingCalendar;
