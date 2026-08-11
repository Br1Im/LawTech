import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarOutlined, PlusOutlined,
  SearchOutlined, FilterOutlined,
  EditOutlined, FileTextOutlined, MessageOutlined,
  LeftOutlined, RightOutlined
} from '@ant-design/icons';
import { notification, Modal, Input, DatePicker, TimePicker, Select, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { TableSkeleton } from './ui';
import './Appointments.css';

import { formatRussianPhone } from "../shared/lib/phone";

dayjs.locale('ru');

type AppointmentStatus = 'waiting' | 'confirmed' | 'arrived' | 'no_show' | 'cancelled' | 'rescheduled';

interface AppointmentData {
  id: number;
  office_id: number;
  office_name?: string | null;
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
  const isAdmin = ['admin','administrator'].includes(user?.role || '');
  const canManage = ['admin','administrator','director','manager','okk','cc_manager','cc_operator'].includes(user?.role || '');
  const canChangeStatus = isAdmin;
  const canAssignLawyer = ['admin','administrator','director','manager','okk'].includes(user?.role || '');
  const isCCRole = ['cc_manager', 'cc_operator'].includes(user?.role || '');
  const canEditText = isCCRole;
  const isDirector = user?.role === 'director';
  const isCCManager = user?.role === 'cc_manager';


  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLawyer, setFilterLawyer] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [filterOfficeId, setFilterOfficeId] = useState<number | 'all'>(() => user?.office_id || 'all');
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source: '', source_id: null as number | null, assigned_lawyer_id: null as number | null });
  const [appointmentSources, setAppointmentSources] = useState<Array<{ id: number; name: string; is_active: number }>>([]);
  const [creating, setCreating] = useState(false);
  const [newErrors, setNewErrors] = useState<{ client_name?: string; client_phone?: string; source_id?: string }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [editingText, setEditingText] = useState<{ id: number; field: 'comment' | 'manager_comment'; value: string } | null>(null);
  const [editingDateTime, setEditingDateTime] = useState<{ id: number; date: dayjs.Dayjs; time: dayjs.Dayjs } | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const fetchAppointments = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const res = await apiInstance.get('/appointments');
      const data = res.data;
      setAppointments(data.success && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось загрузить записи' });
      setAppointments([]);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiInstance.get('/visits/employees');
      if (res.data?.success) setEmployees(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const [operators, setOperators] = useState<Employee[]>([]);
  const fetchOperators = useCallback(async () => {
    if (!isCCRole) return;
    try {
      const res = await apiInstance.get('/staff');
      const list = (res.data?.employees || []) as Array<{ id: number; first_name?: string; last_name?: string; role: string }>;
      const ops = list
        .filter(u => ['cc_manager', 'cc_operator'].includes(u.role))
        .map(u => ({
          id: u.id,
          name: `${u.last_name || ''} ${u.first_name || ''}`.trim() || `Оператор #${u.id}`,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
        }));
      setOperators(ops);
    } catch { /* ignore */ }
  }, [isCCRole]);

  const fetchAppointmentSources = useCallback(async () => {
    try {
      const response = await apiInstance.get('/appointment-sources');
      if (response.data?.success) setAppointmentSources(response.data.data || []);
    } catch {
      // Source directory is optional for legacy installations; the API still
      // returns a clear validation message when a source is required.
    }
  }, []);

  useEffect(() => {
    fetchAppointments(true);
    fetchEmployees();
    fetchOperators();
    fetchAppointmentSources();
    const iv = setInterval(() => fetchAppointments(), 15000);
    return () => clearInterval(iv);
  }, [fetchAppointments, fetchEmployees, fetchOperators, fetchAppointmentSources]);

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
    const errors: { client_name?: string; client_phone?: string; source_id?: string } = {};
    if (!newForm.client_name.trim()) errors.client_name = 'Укажите ФИО клиента';
    const phoneDigits = newForm.client_phone.replace(/\D/g, '');
    if (phoneDigits.length < 11) errors.client_phone = 'Укажите полный номер телефона';
    if (!newForm.source_id) errors.source_id = 'Выберите источник записи';
    setNewErrors(errors);
    if (Object.keys(errors).length) { notification.warning({ message: 'Заполните обязательные поля' }); return; }
    const selectedSource = appointmentSources.find(source => source.id === newForm.source_id);
    setCreating(true);
    try {
      await apiInstance.post('/appointments', {
        client_name: newForm.client_name,
        client_phone: newForm.client_phone,
        appointment_date: newForm.date.format('YYYY-MM-DD'),
        appointment_time: newForm.time.format('HH:mm'),
        comment: newForm.comment || null,
        source: selectedSource?.name || null,
        source_id: newForm.source_id,
        assigned_lawyer_id: newForm.assigned_lawyer_id,
      });
      notification.success({ message: 'Запись создана' });
      setNewModal(false);
      setNewForm({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source: '', source_id: null, assigned_lawyer_id: null });
      fetchAppointments();
    } catch (e: any) {
      notification.error({ message: 'Не удалось создать запись', description: e?.response?.data?.message || 'Проверьте данные и повторите попытку' });
    } finally {
      setCreating(false);
    }
  };

  const todayStr = isoDate(new Date());

  const uniqueSources = useMemo(() => [...new Set(appointments.map(a => a.source).filter(Boolean) as string[])], [appointments]);
  const uniqueOperators = useMemo(() => [...new Set(appointments.map(a => a.operator_name).filter(Boolean) as string[])], [appointments]);
  const uniqueLawyers = useMemo(() => [...new Set(appointments.map(a => a.lawyer_name).filter(Boolean) as string[])], [appointments]);
  const uniqueOffices = useMemo(() => {
    const map = new Map<number, string>();
    appointments.forEach(a => { if (a.office_id && a.office_name) map.set(a.office_id, a.office_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name: name.replace('Юридическая компания ', '') }));
  }, [appointments]);
  const showCityTabs = uniqueOffices.length > 1 && (isDirector || isCCManager);

  const applyFilters = useCallback((list: AppointmentData[]) => {
    let r = list;
    if (filterStatus !== 'all') r = r.filter(a => a.status === filterStatus);
    if (filterLawyer !== 'all') r = r.filter(a => a.lawyer_name === filterLawyer);
    if (filterSource !== 'all') r = r.filter(a => a.source === filterSource);
    if (filterOperator !== 'all') r = r.filter(a => a.operator_name === filterOperator);
    if (filterOfficeId !== 'all') r = r.filter(a => a.office_id === filterOfficeId);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a => a.client_name.toLowerCase().includes(q) || (a.client_phone || '').includes(q));
    }
    return r;
  }, [filterStatus, filterLawyer, filterSource, filterOperator, filterOfficeId, search]);

  /* Date-filtered list. When a search query is active, search across ALL dates
     so "lost" records (e.g. booked for another day) can always be found. */
  const isSearching = search.trim().length > 0;
  const mainList = useMemo(() => {
    if (isSearching) {
      return applyFilters(appointments).sort((a, b) => {
        const da = toDate(a.appointment_date);
        const db = toDate(b.appointment_date);
        if (da !== db) return db.localeCompare(da); // newest first
        return a.appointment_time.localeCompare(b.appointment_time);
      });
    }
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const filtered = appointments.filter(a => toDate(a.appointment_date) === dateStr);
    return applyFilters(filtered).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }, [selectedDate, appointments, applyFilters, isSearching]);

  const lawyers = employees.filter(e => ['lawyer', 'manager', 'okk'].includes(e.role));



  const updateAppointmentField = async (appointmentId: number, field: string, value: string | null) => {
    try {
      await apiInstance.patch(`/appointments/${appointmentId}`, { [field]: value });
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, [field]: value } : a));
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось обновить запись' });
    }
  };

  const assignLawyer = async (appointmentId: number, lawyerId: number | null) => {
    const previous = appointments.find(appointment => appointment.id === appointmentId);
    const employee = lawyerId ? employees.find(item => Number(item.id) === Number(lawyerId)) : null;
    const employeeName = employee
      ? (employee.name || `${employee.last_name || ''} ${employee.first_name || ''}`.trim())
      : null;

    setAppointments(current => current.map(appointment => appointment.id === appointmentId
      ? {
          ...appointment,
          assigned_lawyer_id: lawyerId,
          lawyer_name: lawyerId ? (employeeName || appointment.lawyer_name || `Сотрудник #${lawyerId}`) : null,
        }
      : appointment
    ));

    try {
      await apiInstance.patch(`/appointments/${appointmentId}/assign-lawyer`, { assigned_lawyer_id: lawyerId });
      notification.success({ message: lawyerId ? 'Юрист назначен' : 'Назначение снято' });
      fetchAppointments();
    } catch {
      if (previous) {
        setAppointments(current => current.map(appointment => appointment.id === appointmentId ? previous : appointment));
      }
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

  const statusMenuItems = (apt: AppointmentData): MenuProps['items'] => {
    const allStatuses: { key: AppointmentStatus; label: string }[] = [
      { key: 'waiting', label: 'Ожидается' },
      { key: 'confirmed', label: 'Подтверждён' },
      { key: 'arrived', label: 'Пришёл' },
      { key: 'no_show', label: 'Не пришёл' },
      { key: 'rescheduled', label: 'Перенесена' },
      { key: 'cancelled', label: 'Отменена' },
    ];
    return allStatuses
      .filter(s => s.key !== apt.status)
      .map(s => ({ key: s.key, label: s.label, onClick: () => updateStatus(apt.id, s.key) }));
  };

  const renderCard = (apt: AppointmentData) => {
    const initials = getInitials(apt.client_name);
    const color = getAvatarColor(apt.client_name);
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
            {apt.office_name && showCityTabs && filterOfficeId === 'all' && (
            <div className="apt-card-field">
              <span className="apt-card-field-label">Город</span>
              <span className="apt-card-city">{apt.office_name.replace('Юридическая компания ', '')}</span>
            </div>
            )}

            {/* Operator */}
            <div className="apt-card-field apt-card-field-small">
              <span className="apt-card-field-label">Записал</span>
              <span className="apt-card-field-text">{apt.operator_name || '—'}</span>
            </div>

            {/* Lawyer (only for non-CC roles) */}
            {!isCCRole && (
              <div className="apt-card-field apt-card-field-small apt-card-field-lawyer">
                <span className="apt-card-field-label">Юрист</span>
                {canAssignLawyer ? (
                  (() => {
                    const options = lawyers.map(employee => ({
                      value: employee.id,
                      label: employee.name || `${employee.last_name || ''} ${employee.first_name || ''}`.trim() || `Сотрудник #${employee.id}`,
                    }));
                    if (apt.assigned_lawyer_id && !options.some(option => Number(option.value) === Number(apt.assigned_lawyer_id))) {
                      options.push({
                        value: apt.assigned_lawyer_id,
                        label: apt.lawyer_name || `Сотрудник #${apt.assigned_lawyer_id}`,
                      });
                    }
                    return (
                      <Select
                        optionFilterProp="label"
                        value={apt.assigned_lawyer_id ?? undefined}
                        onChange={(value: number | undefined) => assignLawyer(apt.id, value ?? null)}
                        allowClear
                        placeholder="Назначить"
                        size="small"
                        className="apt-lawyer-select"
                        popupMatchSelectWidth={false}
                        onClick={event => event.stopPropagation()}
                        options={options}
                      />
                    );
                  })()
                ) : (
                  <span className="apt-card-field-text">{apt.lawyer_name || '—'}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: status */}
        <div className="apt-card-right">
          {canChangeStatus ? (
            <Dropdown menu={{ items: statusMenuItems(apt) }} trigger={['click']} placement="bottomRight">
              <span className={`apt-badge apt-badge-clickable ${STATUS_CLASS[apt.status] || ''}`} title="Нажмите, чтобы сменить статус">
                {STATUS_TEXT[apt.status] || apt.status}
              </span>
            </Dropdown>
          ) : (
            <span className={`apt-badge ${STATUS_CLASS[apt.status] || ''}`}>{STATUS_TEXT[apt.status] || apt.status}</span>
          )}
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
        <div className="apt-header-left">
          <h2 className="apt-title">Записи</h2>
        </div>
        <div className="apt-header-right">
          {canManage && (
            <button className="apt-new-btn" onClick={() => { setNewErrors({}); setNewModal(true); }}>
              <PlusOutlined /> Новая запись
            </button>
          )}
        </div>
      </div>

      <>

      {/* City tabs */}
      {showCityTabs && (
        <div className="apt-city-tabs">
          {uniqueOffices.map(o => (
            <button
              key={o.id}
              className={`apt-city-tab ${filterOfficeId === o.id ? 'active' : ''}`}
              onClick={() => setFilterOfficeId(filterOfficeId === o.id ? 'all' : o.id)}
            >
              {o.name}
            </button>
          ))}
          <button
            className={`apt-city-tab ${filterOfficeId === 'all' ? 'active' : ''}`}
            onClick={() => setFilterOfficeId('all')}
          >
            Все
          </button>
        </div>
      )}

      {/* Date navigation: ← date → + calendar */}
      <div className="apt-date-nav ui-compact-date-nav">
        <button className="apt-date-arrow" onClick={() => setSelectedDate(d => d.subtract(1, 'day'))} title="Предыдущий день">
          <LeftOutlined />
        </button>
        <span className="apt-date-current" onClick={() => setSelectedDate(dayjs())} title="Вернуться к сегодня">
          {selectedDate.format('YYYY-MM-DD') === todayStr ? `Сегодня, ${selectedDate.format('D MMM')}` : selectedDate.format('D MMMM, dd')}
        </span>
        <button className="apt-date-arrow" onClick={() => setSelectedDate(d => d.add(1, 'day'))} title="Следующий день">
          <RightOutlined />
        </button>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button className="apt-cal-btn" onClick={() => setCalOpen(v => !v)} title="Выбрать дату">
            <CalendarOutlined />
          </button>
          <DatePicker
            value={selectedDate}
            onChange={d => { if (d) { setSelectedDate(d); setCalOpen(false); } }}
            open={calOpen}
            onOpenChange={setCalOpen}
            allowClear={false}
            style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="apt-toolbar ui-compact-toolbar">
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
              {isSearching ? 'Ничего не найдено' : `Записей на ${selectedDate.format('D MMMM')} нет`}
            </h3>
            <p className="apt-empty-state-text">
              {isSearching ? 'Попробуйте изменить запрос — поиск идёт по всем датам' : 'Выберите другую дату или создайте новую запись'}
            </p>
          </div>
        )}
      </div>

      </>

      {/* New Appointment Modal */}
      <Modal
        className="unified-form-modal"
        title="Новая запись"
        open={newModal}
        onCancel={() => { setNewModal(false); setNewErrors({}); }}
        onOk={handleCreate}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={creating}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>ФИО клиента *</div>
            <Input status={newErrors.client_name ? 'error' : undefined} autoFocus value={newForm.client_name} onChange={e => setNewForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Иванов Иван Иванович" />
            {newErrors.client_name && <div className="apt-field-error">{newErrors.client_name}</div>}
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Телефон *</div>
            <Input status={newErrors.client_phone ? 'error' : undefined} value={newForm.client_phone} onChange={e => setNewForm(f => ({ ...f, client_phone: formatRussianPhone(e.target.value) }))} placeholder="+7 (___) ___-__-__" maxLength={18} inputMode="tel" />
            {newErrors.client_phone && <div className="apt-field-error">{newErrors.client_phone}</div>}
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
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Источник *</div>
            <Select
              status={newErrors.source_id ? 'error' : undefined}
              value={newForm.source_id ?? undefined}
              onChange={value => {
                const selected = appointmentSources.find(source => source.id === value);
                setNewForm(f => ({ ...f, source_id: value, source: selected?.name || '' }));
              }}
              placeholder="Выберите источник"
              style={{ width: '100%' }}
              options={appointmentSources.filter(source => source.is_active).map(source => ({ value: source.id, label: source.name }))}
            />
            {newErrors.source_id && <div className="apt-field-error">{newErrors.source_id}</div>}
          </div>
        </div>
      </Modal>

      {/* Text Edit Modal */}
      <Modal
        className="unified-form-modal"
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
        className="unified-form-modal"
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
