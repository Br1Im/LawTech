import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarOutlined, PlusOutlined, LeftOutlined, RightOutlined,
  SearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, EllipsisOutlined, UserOutlined,
  CheckOutlined, PercentageOutlined, FilterOutlined
} from '@ant-design/icons';
import { notification, Modal, Input, DatePicker, TimePicker, Select, Dropdown } from 'antd';
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
  first_name: string;
  last_name: string;
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
  const isCCRole = ['cc_manager', 'cc_operator'].includes(user?.role || '');
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'tomorrow' | 'all'>('today');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLawyer, setFilterLawyer] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source: '', assigned_lawyer_id: null as number | null });
  const [creating, setCreating] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

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

  const todayAppts = useMemo(() => appointments.filter(a => toDate(a.appointment_date) === todayStr), [appointments, todayStr]);
  const tomorrowAppts = useMemo(() => appointments.filter(a => toDate(a.appointment_date) === tomorrowStr), [appointments, tomorrowStr]);

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

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = useMemo(() => {
    return todayAppts
      .filter(a => {
        const [h, m] = (a.appointment_time || '').split(':').map(Number);
        return (h * 60 + m) > nowMinutes && !['arrived', 'no_show', 'cancelled'].includes(a.status);
      })
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }, [todayAppts, nowMinutes]);

  const mainList = useMemo(() => {
    if (tab === 'today') return applyFilters(todayAppts).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    if (tab === 'tomorrow') return applyFilters(tomorrowAppts).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    return applyFilters(appointments).sort((a, b) => {
      const dc = b.appointment_date.localeCompare(a.appointment_date);
      return dc !== 0 ? dc : a.appointment_time.localeCompare(b.appointment_time);
    });
  }, [tab, todayAppts, tomorrowAppts, appointments, applyFilters]);

  const archiveDates = useMemo(() => {
    const dates = new Map<string, AppointmentData[]>();
    appointments.forEach(a => {
      const d = toDate(a.appointment_date);
      if (d < todayStr) {
        if (!dates.has(d)) dates.set(d, []);
        dates.get(d)!.push(a);
      }
    });
    return [...dates.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
  }, [appointments, todayStr]);

  const getCountdown = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const diff = (h * 60 + m) - nowMinutes;
    if (diff <= 0) return '';
    if (diff < 60) return `через ${diff} мин`;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `через ${hrs} ч ${mins} мин` : `через ${hrs} ч`;
  };

  const getRowMenu = (apt: AppointmentData): MenuProps['items'] => {
    const items: MenuProps['items'] = [];
    if (apt.status === 'waiting' && canManage) items.push({ key: 'confirm', label: 'Подтвердить', onClick: () => updateStatus(apt.id, 'confirmed') });
    if (['waiting', 'confirmed'].includes(apt.status) && canManage) {
      items.push({ key: 'reschedule', label: 'Перенести', onClick: () => updateStatus(apt.id, 'rescheduled') });
      items.push({ key: 'cancel', label: 'Отменить', danger: true, onClick: () => updateStatus(apt.id, 'cancelled') });
    }
    return items;
  };

  const renderRow = (apt: AppointmentData, showCountdown = false) => {
    const initials = getInitials(apt.client_name);
    const color = getAvatarColor(apt.client_name);
    const countdown = showCountdown ? getCountdown(apt.appointment_time) : '';
    const canAct = ['waiting', 'confirmed'].includes(apt.status) && canManage;
    const menu = getRowMenu(apt);

    return (
      <div key={apt.id} className="apt-row">
        <div className="apt-row-time">
          <span className="apt-time-value">{formatTime(apt.appointment_time)}</span>
          {countdown && <span className="apt-countdown">{countdown}</span>}
        </div>
        <div className="apt-row-avatar" style={{ background: color }}>{initials}</div>
        <div className="apt-row-client">
          <div className="apt-client-name">{apt.client_name}</div>
          <div className="apt-client-phone">{apt.client_phone || '—'}</div>
        </div>
        <div className="apt-row-col">
          <div className="apt-col-label">Тема</div>
          <div className="apt-col-value">{apt.comment || '—'}</div>
        </div>
        <div className="apt-row-col">
          <div className="apt-col-label">Источник</div>
          <div className="apt-col-value">{apt.source || '—'}</div>
        </div>
        <div className="apt-row-col">
          <div className="apt-col-label">Записал</div>
          <div className="apt-col-value">{apt.operator_name || '—'}</div>
        </div>
        {!isCCRole && (
          <div className="apt-row-col">
            <div className="apt-col-label">Юрист</div>
            <div className="apt-col-value">{apt.lawyer_name || '—'}</div>
          </div>
        )}
        <div className="apt-row-status">
          <span className={`apt-badge ${STATUS_CLASS[apt.status] || ''}`}>{STATUS_TEXT[apt.status] || apt.status}</span>
        </div>
        <div className="apt-row-actions">
          {canAct && (
            <>
              <button className="apt-btn apt-btn-arrived" onClick={() => updateStatus(apt.id, 'arrived')}>Пришел</button>
              <button className="apt-btn apt-btn-noshow" onClick={() => updateStatus(apt.id, 'no_show')}>Не пришел</button>
            </>
          )}
        </div>
        <div className="apt-row-menu">
          {menu && menu.length > 0 ? (
            <Dropdown menu={{ items: menu }} trigger={['click']}>
              <button className="apt-dots-btn"><EllipsisOutlined /></button>
            </Dropdown>
          ) : <span style={{ width: 32 }} />}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="apt-container">
        <TableSkeleton rows={6} cols={6} withToolbar />
      </div>
    );
  }

  const lawyers = employees.filter(e => ['lawyer', 'manager', 'okk'].includes(e.role));

  const hasActiveFilters = filterStatus !== 'all' || filterLawyer !== 'all' || filterSource !== 'all' || filterOperator !== 'all';

  return (
    <div className="apt-container">
      {/* Header: Title + Date Tabs */}
      <div className="apt-header">
        <h2 className="apt-title">Записи</h2>
        <div className="apt-header-right">
          <div className="apt-date-tabs">
            <button className={`apt-date-tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
              Сегодня, {dayjs().format('D MMM')} <span className="apt-date-tab-count">{todayAppts.length}</span>
            </button>
            <button className={`apt-date-tab ${tab === 'tomorrow' ? 'active' : ''}`} onClick={() => setTab('tomorrow')}>
              Завтра <span className="apt-date-tab-count">{tomorrowAppts.length}</span>
            </button>
            <button className={`apt-date-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
              Все <span className="apt-date-tab-count">{appointments.length}</span>
            </button>
          </div>
          {canManage && (
            <button className="apt-new-btn" onClick={() => setNewModal(true)}>
              <PlusOutlined /> Новая запись
            </button>
          )}
        </div>
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

      {/* Toolbar: Search + Filters toggle */}
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
        <div className="apt-toolbar-spacer" />
        <span className="apt-sort-label">Сортировка: <b>По времени</b></span>
      </div>

      {/* Collapsible filter panel */}
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

      {/* Main list */}
      <div className="apt-section">
        <div className="apt-records-card">
          <div className="apt-records-card-header">
            <span className="apt-records-card-title">
              {tab === 'today' ? 'Записи на сегодня' : tab === 'tomorrow' ? 'Записи на завтра' : 'Все записи'}
            </span>
            <span className="apt-records-card-count">{mainList.length}</span>
          </div>
          <div className="apt-rows">
            {mainList.length > 0
              ? mainList.map(a => renderRow(a))
              : (
                <div className="apt-empty-state">
                  <div className="apt-empty-state-icon">
                    <CalendarOutlined />
                  </div>
                  <h3 className="apt-empty-state-title">
                    {tab === 'today' ? 'Записей на сегодня пока нет' : tab === 'tomorrow' ? 'Записей на завтра пока нет' : 'Записи не найдены'}
                  </h3>
                  <p className="apt-empty-state-text">Новые записи появятся здесь автоматически</p>
                  {canManage && (
                    <button className="apt-empty-state-btn" onClick={() => setNewModal(true)}>
                      <PlusOutlined /> Создать запись
                    </button>
                  )}
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* Archive */}
      {tab === 'today' && archiveDates.length > 0 && (
        <div className="apt-archive-section">
          <div className="apt-archive-label">Прошедшие записи</div>
          {archiveDates.map(([date, appts]) => {
            const d = dayjs(date);
            const key = date;
            const isOpen = !!archiveOpen[key];
            return (
              <div key={key} className={`apt-archive-card ${isOpen ? 'open' : ''}`} onClick={() => setArchiveOpen(p => ({ ...p, [key]: !p[key] }))}>
                <div className="apt-archive-card-header">
                  <CalendarOutlined className="apt-archive-card-icon" />
                  <span className="apt-archive-card-date">{d.format('D MMMM, dddd')}</span>
                  <span className="apt-archive-card-count">{appts.length}</span>
                  <span className={`apt-archive-chevron ${isOpen ? 'open' : ''}`}>&#8250;</span>
                </div>
                {isOpen && (
                  <div className="apt-rows" onClick={e => e.stopPropagation()}>
                    {appts.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map(a => renderRow(a))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
            <Input value={newForm.comment} onChange={e => setNewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Тема консультации" />
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
                <Select.Option key={e.id} value={e.id}>{e.last_name} {e.first_name}</Select.Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Appointments;
