import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarOutlined, PlusOutlined,
  SearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, EllipsisOutlined, UserOutlined,
  CheckOutlined, FilterOutlined,
  EditOutlined, FileTextOutlined, MessageOutlined
} from '@ant-design/icons';
import { notification, Modal, Input, DatePicker, TimePicker, Select, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { TableSkeleton } from './ui';
import './Appointments.css';

dayjs.locale('ru');

type AppointmentStatus = 'waiting' | 'confirmed' | 'arrived' | 'no_show' | 'cancelled' | 'rescheduled';

interface AppointmentData {
  id: number;
  office_id: number;
  lead_id: number | null;
  client_id: number | null;
  client_name: string;
  client_phone: string;
  source: string | null;
  appointment_date: string;
  appointment_time: string;
  comment: string | null;
  operator_id: number;
  operator_name: string | null;
  lawyer_name: string | null;
  status: AppointmentStatus;
  manager_comment: string | null;
  assigned_lawyer_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

const AVATAR_COLORS = ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED','#DB2777','#2563EB','#0D9488','#CA8A04'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(t: string): string {
  return t ? t.substring(0, 5) : '';
}

function toDate(dateStr: string): string {
  try { return new Date(dateStr).toISOString().slice(0, 10); } catch { return dateStr; }
}

const STATUS_TEXT: Record<string, string> = {
  waiting: 'Ожидается',
  confirmed: 'Подтверждён',
  arrived: 'Пришел',
  no_show: 'Не пришел',
  cancelled: 'Отменено',
  rescheduled: 'Перенесена',
};

const STATUS_CLASS: Record<string, string> = {
  waiting: 'apt-status-waiting',
  confirmed: 'apt-status-confirmed',
  arrived: 'apt-status-arrived',
  no_show: 'apt-status-noshow',
  cancelled: 'apt-status-cancelled',
  rescheduled: 'apt-status-rescheduled',
};

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const canManage = ['admin','administrator','director','manager','okk'].includes(user?.role || '');
  const canAssignLawyer = ['admin','administrator','director','manager','okk'].includes(user?.role || '');
  const isCCRole = ['cc_manager', 'cc_operator'].includes(user?.role || '');
  const canEditText = isCCRole;

  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateMode, setDateMode] = useState<'day' | 'week'>('day');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLawyer, setFilterLawyer] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source: '', assigned_lawyer_id: null as number | null });
  const [creating, setCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingText, setEditingText] = useState<{ id: number; field: 'comment' | 'manager_comment'; value: string } | null>(null);
  const [editingDateTime, setEditingDateTime] = useState<{ id: number; date: dayjs.Dayjs; time: dayjs.Dayjs } | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiInstance.get('/appointments');
      const data = res.data;
      setAppointments(data.success && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось загрузить записи' });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiInstance.get('/visits/employees');
      if (res.data?.success) setEmployees(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchEmployees();
    const iv = setInterval(fetchAppointments, 15000);
    return () => clearInterval(iv);
  }, [fetchAppointments, fetchEmployees]);

  const updateStatus = async (id: number, status: AppointmentStatus) => {
    try {
      await apiInstance.patch(`/appointments/${id}/status`, { status });
      notification.success({ message: status === 'arrived' ? 'Клиент пришёл' : status === 'no_show' ? 'Клиент не пришёл' : 'Статус обновлён' });
      fetchAppointments();
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось обновить статус' });
    }
  };

  const handleCreate = async () => {
    if (!newForm.client_name.trim()) { notification.warning({ message: 'Укажите ФИО клиента' }); return; }
    setCreating(true);
    try {
      await apiInstance.post('/appointments', {
        client_name: newForm.client_name,
        client_phone: newForm.client_phone,
        appointment_date: newForm.date.format('YYYY-MM-DD'),
        appointment_time: newForm.time.format('HH:mm'),
        comment: newForm.comment || null,
        source: newForm.source || null,
        assigned_lawyer_id: newForm.assigned_lawyer_id,
      });
      notification.success({ message: 'Запись создана' });
      setNewModal(false);
      setNewForm({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source: '', assigned_lawyer_id: null });
      fetchAppointments();
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось создать запись' });
    } finally {
      setCreating(false);
    }
  };

  const todayStr = isoDate(new Date());
  const tomorrowStr = isoDate(new Date(Date.now() + 86400000));

  /* Stats always based on today */
  const todayAppts = useMemo(() => appointments.filter(a => toDate(a.appointment_date) === todayStr), [appointments, todayStr]);

  const stats = useMemo(() => {
    const list = todayAppts;
    const total = list.length;
    const confirmed = list.filter(a => a.status === 'confirmed').length;
    const arrived = list.filter(a => a.status === 'arrived').length;
    const noShow = list.filter(a => a.status === 'no_show').length;
    const waiting = list.filter(a => a.status === 'waiting').length;
    const conv = total > 0 ? Math.round(arrived / total * 100) : 0;
    return { total, confirmed, arrived, noShow, waiting, conv };
  }, [todayAppts]);

  const uniqueSources = useMemo(() => [...new Set(appointments.map(a => a.source).filter(Boolean) as string[])], [appointments]);
  const uniqueOperators = useMemo(() => [...new Set(appointments.map(a => a.operator_name).filter(Boolean) as string[])], [appointments]);
  const uniqueLawyers = useMemo(() => [...new Set(appointments.map(a => a.lawyer_name).filter(Boolean) as string[])], [appointments]);

  const applyFilters = useCallback((list: AppointmentData[]) => {
    let r = list;
    if (filterStatus !== 'all') r = r.filter(a => a.status === filterStatus);
    if (filterLawyer !== 'all') r = r.filter(a => a.lawyer_name === filterLawyer);
    if (filterSource !== 'all') r = r.filter(a => a.source === filterSource);
    if (filterOperator !== 'all') r = r.filter(a => a.operator_name === filterOperator);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a => a.client_name.toLowerCase().includes(q) || (a.client_phone || '').includes(q));
    }
    return r;
  }, [filterStatus, filterLawyer, filterSource, filterOperator, search]);

  /* Date-filtered list */
  const mainList = useMemo(() => {
    let filtered: AppointmentData[];
    if (dateMode === 'week') {
      const weekStart = selectedDate.startOf('week');
      const weekEnd = selectedDate.endOf('week');
      filtered = appointments.filter(a => {
        const d = dayjs(toDate(a.appointment_date));
        return d.isAfter(weekStart.subtract(1, 'day')) && d.isBefore(weekEnd.add(1, 'day'));
      });
    } else {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      filtered = appointments.filter(a => toDate(a.appointment_date) === dateStr);
    }
    return applyFilters(filtered).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }, [selectedDate, dateMode, appointments, applyFilters]);

  const lawyers = employees.filter(e => ['lawyer', 'manager', 'okk'].includes(e.role));

  const getRowMenu = (apt: AppointmentData): MenuProps['items'] => {
    const items: MenuProps['items'] = [];
    if (apt.status === 'waiting' && canManage) items.push({ key: 'confirm', label: 'Подтвердить', onClick: () => updateStatus(apt.id, 'confirmed') });
    if (['waiting', 'confirmed'].includes(apt.status) && canManage) {
      items.push({ key: 'reschedule', label: 'Перенести', onClick: () => updateStatus(apt.id, 'rescheduled') });
      items.push({ key: 'cancel', label: 'Отменить', danger: true, onClick: () => updateStatus(apt.id, 'cancelled') });
    }
    return items;
  };

  const updateAppointmentField = async (appointmentId: number, field: string, value: string | null) => {
    try {
      await apiInstance.patch(`/appointments/${appointmentId}`, { [field]: value });
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, [field]: value } : a));
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось обновить запись' });
    }
  };

  const assignLawyer = async (appointmentId: number, lawyerId: number | null) => {
    try {
      await apiInstance.patch(`/appointments/${appointmentId}/assign-lawyer`, { assigned_lawyer_id: lawyerId });
      notification.success({ message: 'Юрист назначен' });
      fetchAppointments();
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось назначить юриста' });
    }
  };

  const handleSaveDateTime = async () => {
    if (!editingDateTime) return;
    const { id, date, time } = editingDateTime;
    try {
      await apiInstance.patch(`/appointments/${id}`, {
        appointment_date: date.format('YYYY-MM-DD'),
        appointment_time: time.format('HH:mm'),
      });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, appointment_date: date.format('YYYY-MM-DD'), appointment_time: time.format('HH:mm') } : a));
      notification.success({ message: 'Дата и время обновлены' });
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось обновить дату/время' });
    }
    setEditingDateTime(null);
  };

  const hasActiveFilters = filterStatus !== 'all' || filterLawyer !== 'all' || filterSource !== 'all' || filterOperator !== 'all';

  const renderCard = (apt: AppointmentData) => {
    const initials = getInitials(apt.client_name);
    const color = getAvatarColor(apt.client_name);
    const canAct = ['waiting', 'confirmed'].includes(apt.status) && canManage;
    const menu = getRowMenu(apt);
    const dateLabel = dayjs(toDate(apt.appointment_date)).format('D MMM');
    const timeLabel = formatTime(apt.appointment_time);

    return (
      <div key={apt.id} className="apt-card">
        {/* LEFT: time */}
        <div
          className="apt-card-time"
          onClick={() => setEditingDateTime({ id: apt.id, date: dayjs(toDate(apt.appointment_date)), time: dayjs(`2000-01-01 ${apt.appointment_time}`) })}
          title="Нажмите, чтобы изменить дату/время"
        >
          <span className="apt-card-time-value">{timeLabel}</span>
          <span className="apt-card-time-date">{dateLabel}</span>
        </div>

        {/* CENTER: info */}
        <div className="apt-card-body">
          <div className="apt-card-row-main">
            <div className="apt-card-avatar" style={{ background: color }}>{initials}</div>
            <div className="apt-card-client">
              <span className="apt-card-client-name">{apt.client_name}</span>
              <span className="apt-card-client-phone">{apt.client_phone || '—'}</span>
            </div>
          </div>

          <div className="apt-card-details">
            {/* Topic */}
            <div className="apt-card-field">
              <span className="apt-card-field-label"><FileTextOutlined /> Тема</span>
              {canEditText ? (
                <div
                  className={`apt-card-field-value ${apt.comment ? '' : 'empty'}`}
                  onClick={() => setEditingText({ id: apt.id, field: 'comment', value: apt.comment || '' })}
                >
                  {apt.comment ? (
                    <Tooltip title={apt.comment} placement="top" overlayStyle={{ maxWidth: 400 }}>
                      <span className="apt-card-text-clamp">{apt.comment}</span>
                    </Tooltip>
                  ) : (
                    <span className="apt-card-text-add"><PlusOutlined /> Добавить</span>
                  )}
                  <EditOutlined className="apt-card-edit-icon" />
                </div>
              ) : (
                <div className="apt-card-field-value readonly">
                  {apt.comment ? (
                    <Tooltip title={apt.comment} placement="top" overlayStyle={{ maxWidth: 400 }}>
                      <span className="apt-card-text-clamp">{apt.comment}</span>
                    </Tooltip>
                  ) : <span className="apt-card-text-na">—</span>}
                </div>
              )}
            </div>

            {/* Comment */}
            <div className="apt-card-field">
              <span className="apt-card-field-label"><MessageOutlined /> Комментарий</span>
              {canEditText ? (
                <div
                  className={`apt-card-field-value ${apt.manager_comment ? '' : 'empty'}`}
                  onClick={() => setEditingText({ id: apt.id, field: 'manager_comment', value: apt.manager_comment || '' })}
                >
                  {apt.manager_comment ? (
                    <Tooltip title={apt.manager_comment} placement="top" overlayStyle={{ maxWidth: 400 }}>
                      <span className="apt-card-text-clamp">{apt.manager_comment}</span>
                    </Tooltip>
                  ) : (
                    <span className="apt-card-text-add"><PlusOutlined /> Добавить</span>
                  )}
                  <EditOutlined className="apt-card-edit-icon" />
                </div>
              ) : (
                <div className="apt-card-field-value readonly">
                  {apt.manager_comment ? (
                    <Tooltip title={apt.manager_comment} placement="top" overlayStyle={{ maxWidth: 400 }}>
                      <span className="apt-card-text-clamp">{apt.manager_comment}</span>
                    </Tooltip>
                  ) : <span className="apt-card-text-na">—</span>}
                </div>
              )}
            </div>

            {/* Source */}
            <div className="apt-card-field apt-card-field-small">
              <span className="apt-card-field-label">Источник</span>
              <span className="apt-card-field-text">{apt.source || '—'}</span>
            </div>

            {/* Operator */}
            <div className="apt-card-field apt-card-field-small">
              <span className="apt-card-field-label">Записал</span>
              <span className="apt-card-field-text">{apt.operator_name || '—'}</span>
            </div>

            {/* Lawyer (only for non-CC roles) */}
            {!isCCRole && (
              <div className="apt-card-field apt-card-field-small">
                <span className="apt-card-field-label">Юрист</span>
                {canAssignLawyer ? (
                  <Select
                    value={apt.assigned_lawyer_id || undefined}
                    onChange={(v: number) => assignLawyer(apt.id, v)}
                    allowClear
                    onClear={() => assignLawyer(apt.id, null)}
                    placeholder="Назначить"
                    size="small"
                    style={{ width: '100%', maxWidth: 160 }}
                    popupMatchSelectWidth={false}
                    onClick={e => e.stopPropagation()}
                  >
                    {lawyers.map(e => (
                      <Select.Option key={e.id} value={e.id}>{e.name || `${e.last_name || ''} ${e.first_name || ''}`.trim()}</Select.Option>
                    ))}
                  </Select>
                ) : (
                  <span className="apt-card-field-text">{apt.lawyer_name || '—'}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: status + actions */}
        <div className="apt-card-right">
          <span className={`apt-badge ${STATUS_CLASS[apt.status] || ''}`}>{STATUS_TEXT[apt.status] || apt.status}</span>
          <div className="apt-card-actions">
            {canAct && (
              <>
                <button className="apt-icon-btn apt-icon-arrived" onClick={() => updateStatus(apt.id, 'arrived')} title="Пришёл">
                  <CheckOutlined />
                </button>
                <button className="apt-icon-btn apt-icon-noshow" onClick={() => updateStatus(apt.id, 'no_show')} title="Не пришёл">
                  <CloseCircleOutlined />
                </button>
              </>
            )}
            {menu && menu.length > 0 ? (
              <Dropdown menu={{ items: menu }} trigger={['click']}>
                <button className="apt-dots-btn"><EllipsisOutlined /></button>
              </Dropdown>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="apt-container">
        <TableSkeleton rows={6} cols={4} withToolbar />
      </div>
    );
  }

  return (
    <div className="apt-container">
      {/* Header */}
      <div className="apt-header">
        <h2 className="apt-title">Записи</h2>
        <div className="apt-header-right">
          {canManage && (
            <button className="apt-new-btn" onClick={() => setNewModal(true)}>
              <PlusOutlined /> Новая запись
            </button>
          )}
        </div>
      </div>

      {/* Date selector: quick buttons + date picker */}
      <div className="apt-date-bar">
        <div className="apt-quick-btns">
          <button
            className={`apt-quick-btn ${dateMode === 'day' && selectedDate.format('YYYY-MM-DD') === todayStr ? 'active' : ''}`}
            onClick={() => { setSelectedDate(dayjs()); setDateMode('day'); }}
          >
            Сегодня
          </button>
          <button
            className={`apt-quick-btn ${dateMode === 'day' && selectedDate.format('YYYY-MM-DD') === tomorrowStr ? 'active' : ''}`}
            onClick={() => { setSelectedDate(dayjs().add(1, 'day')); setDateMode('day'); }}
          >
            Завтра
          </button>
          <button
            className={`apt-quick-btn ${dateMode === 'week' ? 'active' : ''}`}
            onClick={() => { setSelectedDate(dayjs()); setDateMode('week'); }}
          >
            Неделя
          </button>
        </div>
        <div className="apt-date-picker-wrap">
          <DatePicker
            value={selectedDate}
            onChange={d => { if (d) { setSelectedDate(d); setDateMode('day'); } }}
            format="D MMMM, dd"
            allowClear={false}
            suffixIcon={<CalendarOutlined />}
            className="apt-date-picker"
          />
        </div>
        <span className="apt-date-label">
          {dateMode === 'week'
            ? `${selectedDate.startOf('week').format('D MMM')} – ${selectedDate.endOf('week').format('D MMM')}`
            : selectedDate.format('D MMMM YYYY, dddd')
          }
        </span>
      </div>

      {/* Compact Stats Bar */}
      <div className="apt-stats-bar">
        <div className="apt-stat-item">
          <CalendarOutlined className="apt-stat-item-icon" style={{ color: '#3B82F6' }} />
          <div className="apt-stat-item-info">
            <span className="apt-stat-item-label">Записей</span>
            <span className="apt-stat-item-value">{stats.total}</span>
          </div>
        </div>
        <div className="apt-stats-divider" />
        <div className="apt-stat-item">
          <CheckCircleOutlined className="apt-stat-item-icon" style={{ color: '#10B981' }} />
          <div className="apt-stat-item-info">
            <span className="apt-stat-item-label">Подтверждено</span>
            <span className="apt-stat-item-value">{stats.confirmed}</span>
          </div>
        </div>
        <div className="apt-stats-divider" />
        <div className="apt-stat-item">
          <UserOutlined className="apt-stat-item-icon" style={{ color: '#0D9488' }} />
          <div className="apt-stat-item-info">
            <span className="apt-stat-item-label">Пришли</span>
            <span className="apt-stat-item-value">{stats.arrived}</span>
          </div>
        </div>
        <div className="apt-stats-divider" />
        <div className="apt-stat-item">
          <CloseCircleOutlined className="apt-stat-item-icon" style={{ color: '#EF4444' }} />
          <div className="apt-stat-item-info">
            <span className="apt-stat-item-label">Не пришли</span>
            <span className="apt-stat-item-value">{stats.noShow}</span>
          </div>
        </div>
        <div className="apt-stats-divider" />
        <div className="apt-stat-item">
          <ClockCircleOutlined className="apt-stat-item-icon" style={{ color: '#F59E0B' }} />
          <div className="apt-stat-item-info">
            <span className="apt-stat-item-label">В ожидании</span>
            <span className="apt-stat-item-value">{stats.waiting}</span>
          </div>
        </div>
        <div className="apt-stats-conv">
          <span className="apt-stats-conv-label">Конверсия явки</span>
          <span className="apt-stats-conv-value">{stats.conv}%</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="apt-toolbar">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск по ФИО, телефону..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="apt-search-input"
          allowClear
        />
        <button
          className={`apt-filter-toggle ${showFilters || hasActiveFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(v => !v)}
        >
          <FilterOutlined />
          Фильтры
          {hasActiveFilters && <span className="apt-filter-dot" />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="apt-filter-panel">
          <Select value={filterStatus} onChange={setFilterStatus} style={{ minWidth: 140 }} size="small" popupMatchSelectWidth={false}>
            <Select.Option value="all">Статус: Все</Select.Option>
            <Select.Option value="waiting">Ожидается</Select.Option>
            <Select.Option value="confirmed">Подтверждён</Select.Option>
            <Select.Option value="arrived">Пришел</Select.Option>
            <Select.Option value="no_show">Не пришел</Select.Option>
            <Select.Option value="rescheduled">Перенесена</Select.Option>
            <Select.Option value="cancelled">Отменено</Select.Option>
          </Select>
          {!isCCRole && (
            <Select value={filterLawyer} onChange={setFilterLawyer} style={{ minWidth: 140 }} size="small" popupMatchSelectWidth={false}>
              <Select.Option value="all">Юрист: Все</Select.Option>
              {uniqueLawyers.map(l => <Select.Option key={l} value={l}>{l}</Select.Option>)}
            </Select>
          )}
          <Select value={filterSource} onChange={setFilterSource} style={{ minWidth: 140 }} size="small" popupMatchSelectWidth={false}>
            <Select.Option value="all">Источник: Все</Select.Option>
            {uniqueSources.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select value={filterOperator} onChange={setFilterOperator} style={{ minWidth: 150 }} size="small" popupMatchSelectWidth={false}>
            <Select.Option value="all">Оператор: Все</Select.Option>
            {uniqueOperators.map(o => <Select.Option key={o} value={o}>{o}</Select.Option>)}
          </Select>
          {hasActiveFilters && (
            <button className="apt-filter-reset" onClick={() => { setFilterStatus('all'); setFilterLawyer('all'); setFilterSource('all'); setFilterOperator('all'); }}>
              Сбросить
            </button>
          )}
        </div>
      )}

      {/* Cards list */}
      <div className="apt-cards-list">
        {mainList.length > 0 ? (
          mainList.map(a => renderCard(a))
        ) : (
          <div className="apt-empty-state">
            <div className="apt-empty-state-icon"><CalendarOutlined /></div>
            <h3 className="apt-empty-state-title">
              {dateMode === 'week' ? 'Записей на эту неделю нет' : `Записей на ${selectedDate.format('D MMMM')} нет`}
            </h3>
            <p className="apt-empty-state-text">Выберите другую дату или создайте новую запись</p>
            {canManage && (
              <button className="apt-empty-state-btn" onClick={() => setNewModal(true)}>
                <PlusOutlined /> Создать запись
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      <Modal
        title="Новая запись"
        open={newModal}
        onCancel={() => setNewModal(false)}
        onOk={handleCreate}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={creating}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>ФИО клиента *</div>
            <Input value={newForm.client_name} onChange={e => setNewForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Иванов Иван Иванович" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Телефон</div>
            <Input value={newForm.client_phone} onChange={e => setNewForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="+7 999 123-45-67" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Дата *</div>
              <DatePicker value={newForm.date} onChange={d => setNewForm(f => ({ ...f, date: d || dayjs() }))} format="DD.MM.YYYY" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Время *</div>
              <TimePicker value={newForm.time} onChange={t => setNewForm(f => ({ ...f, time: t || dayjs() }))} format="HH:mm" style={{ width: '100%' }} minuteStep={5} />
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Тема</div>
            <Input.TextArea value={newForm.comment} onChange={e => setNewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Тема консультации" rows={3} autoSize={{ minRows: 2, maxRows: 6 }} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Источник</div>
            <Input value={newForm.source} onChange={e => setNewForm(f => ({ ...f, source: e.target.value }))} placeholder="Правовед, Gainet и т.д." />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Юрист</div>
            <Select
              value={newForm.assigned_lawyer_id}
              onChange={v => setNewForm(f => ({ ...f, assigned_lawyer_id: v }))}
              style={{ width: '100%' }}
              allowClear
              placeholder="Выберите юриста"
            >
              {lawyers.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.name || `${e.last_name || ''} ${e.first_name || ''}`.trim()}</Select.Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      {/* Text Edit Modal */}
      <Modal
        title={editingText?.field === 'comment' ? 'Тема консультации' : 'Комментарий'}
        open={!!editingText}
        onCancel={() => {
          if (editingText) {
            const original = appointments.find(a => a.id === editingText.id);
            const originalVal = original ? (editingText.field === 'comment' ? original.comment : original.manager_comment) || '' : '';
            if (editingText.value.trim() !== originalVal.trim()) {
              updateAppointmentField(editingText.id, editingText.field, editingText.value.trim() || null);
            }
          }
          setEditingText(null);
        }}
        onOk={() => {
          if (editingText) {
            updateAppointmentField(editingText.id, editingText.field, editingText.value.trim() || null);
          }
          setEditingText(null);
        }}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
        width={560}
      >
        {editingText && (
          <div style={{ marginTop: 12 }}>
            <Input.TextArea
              value={editingText.value}
              onChange={e => setEditingText(prev => prev ? { ...prev, value: e.target.value } : null)}
              placeholder={editingText.field === 'comment' ? 'Введите тему консультации...' : 'Введите комментарий...'}
              autoSize={{ minRows: 4, maxRows: 12 }}
              style={{ fontSize: 14, lineHeight: '1.6' }}
              autoFocus
            />
          </div>
        )}
      </Modal>

      {/* Date/Time Edit Modal */}
      <Modal
        title="Изменить дату и время"
        open={!!editingDateTime}
        onCancel={() => setEditingDateTime(null)}
        onOk={handleSaveDateTime}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
        width={400}
      >
        {editingDateTime && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Дата</div>
              <DatePicker
                value={editingDateTime.date}
                onChange={d => setEditingDateTime(prev => prev ? { ...prev, date: d || prev.date } : null)}
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Время</div>
              <TimePicker
                value={editingDateTime.time}
                onChange={t => setEditingDateTime(prev => prev ? { ...prev, time: t || prev.time } : null)}
                format="HH:mm"
                style={{ width: '100%' }}
                minuteStep={5}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Appointments;
