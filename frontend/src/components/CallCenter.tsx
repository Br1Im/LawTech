import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './CallCenter.css';

type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'NO_ANSWER' | 'CALL_BACK' | 'INTERESTED' | 'BOOKED' | 'REJECTED' | 'SPAM' | 'DUPLICATE' | 'NON_TARGET' | 'CLOSED';

type Temperature = 'hot' | 'warm' | 'cold' | null;

interface Lead {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  source: string;
  status: LeadStatus;
  score: number;
  temperature: Temperature;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  assigned_to_office_id?: number | null;
  office_id?: number | null;
  office_name?: string | null;
  created_at: string;
  first_call_at?: string | null;
  last_call_at?: string | null;
  next_call_at?: string | null;
  calls_count?: number;
  operator_note?: string | null;
}

interface CallLog {
  id: number;
  result: string;
  comment: string | null;
  created_at: string;
  user_name?: string | null;
}

interface HistoryItem {
  id: number;
  action: string;
  created_at: string;
  user_name?: string | null;
  details?: string | null;
}

interface LeadDetails extends Lead {
  calls: CallLog[];
  history: HistoryItem[];
  response_time_minutes: number | null;
}

interface Operator {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  role: string;
  office_id?: number | null;
  office_name?: string | null;
  is_online: boolean;
  current_load: number;
  total_leads?: number;
  closed_leads?: number;
}

interface DashboardData {
  statuses: Record<string, number>;
  sla: {
    total_leads: number;
    contacted_leads: number;
    avg_response_time_minutes: number | null;
    overdue_leads: number;
  };
  operators: Operator[];
}

interface SourceSummary {
  source: string;
  total: number;
  statuses: Record<LeadStatus, number>;
  temperatures: { hot: number; warm: number; cold: number };
}

interface OperatorStats {
  id: number;
  name: string;
  email: string;
  role: string;
  office_id?: number | null;
  office_name?: string | null;
  is_online: boolean;
  total_leads: number;
  booked_leads: number;
  brak_leads: number;
  active_leads: number;
  booking_rate: number;
  brak_rate: number;
}

interface OfficeOption {
  id: number;
  name: string;
}

interface CcEnums {
  is_manager?: boolean;
  is_call_center_role?: boolean;
  cross_office?: boolean;
  offices?: OfficeOption[];
}

const ALL_STATUSES: LeadStatus[] = [
  'NEW', 'IN_PROGRESS', 'NO_ANSWER', 'CALL_BACK', 'INTERESTED',
  'BOOKED', 'REJECTED', 'SPAM', 'DUPLICATE', 'NON_TARGET', 'CLOSED'
];

const TEMPERATURE_OPTIONS: Exclude<Temperature, null>[] = ['hot', 'warm', 'cold'];

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В обработке',
  NO_ANSWER: 'Не дозвонились',
  CALL_BACK: 'Перезвонить позже',
  INTERESTED: 'Заинтересован',
  BOOKED: 'Записан на консультацию',
  REJECTED: 'Отказ',
  SPAM: 'Спам',
  DUPLICATE: 'Дубль',
  NON_TARGET: 'Нецелевой лид',
  CLOSED: 'Закрыт'
};

const STATUS_SHORT: Record<LeadStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  NO_ANSWER: 'Не дозвон.',
  CALL_BACK: 'Перезвонить',
  INTERESTED: 'Заинтерес.',
  BOOKED: 'Записан',
  REJECTED: 'Отказ',
  SPAM: 'Спам',
  DUPLICATE: 'Дубль',
  NON_TARGET: 'Нецелевой',
  CLOSED: 'Закрыт'
};

const TEMPERATURE_LABELS: Record<Exclude<Temperature, null>, string> = {
  hot: 'Горячий',
  warm: 'Тёплый',
  cold: 'Холодный'
};

const HISTORY_LABELS: Record<string, string> = {
  LEAD_CREATED: 'Лид поступил',
  ASSIGNED: 'Назначен оператору',
  STATUS_CHANGED: 'Изменён статус',
  CALL_LOGGED: 'Звонок зафиксирован',
  BOOKED: 'Записан на консультацию',
  MERGED_DUPLICATE: 'Объединён с дубликатом',
  TEMPERATURE_CHANGED: 'Изменена температура',
  COMMENT_ADDED: 'Добавлен комментарий'
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Сегодня, ${time}`;
  if (isYesterday) return `Вчера, ${time}`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) + `, ${time}`;
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const operatorName = (op: Pick<Operator, 'first_name' | 'last_name' | 'email'>) =>
  [op.first_name, op.last_name].filter(Boolean).join(' ') || op.email;

const SOURCE_ICONS: Record<string, string> = {
  gynet: '🟢', gainnet: '🟢', facebook: '🔵', '2gis': '🟠', avito: '🟣',
  website: '🌐', telegram: '📱', referral: '👥', ads: '📢'
};

const SOURCE_LABEL = (source: string) => {
  const known: Record<string, string> = {
    'pravoved.ru': 'Pravoved.ru', pravoved: 'Pravoved.ru',
    gainnet: 'Gainnet', gynet: 'Gynet',
    facebook: 'Facebook', '2gis': '2GIS', avito: 'Avito'
  };
  return known[source.toLowerCase()] || source;
};

const MANAGER_ROLES = ['cc_manager', 'admin', 'director'];

const CallCenter: React.FC = () => {
  const { user } = useAuth();
  const isManager = useMemo(() => MANAGER_ROLES.includes(user?.role || ''), [user?.role]);
  const isOperatorOnly = user?.role === 'cc_operator';
  const isCrossOffice = useMemo(
    () => user?.role === 'cc_manager' || user?.role === 'cc_operator',
    [user?.role]
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [enums, setEnums] = useState<CcEnums | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | LeadStatus>('ALL');
  const [selectedTemperature, setSelectedTemperature] = useState<'ALL' | Exclude<Temperature, null>>('ALL');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'created_at:desc' | 'created_at:asc' | 'score:desc'>('created_at:desc');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOperatorId, setBulkOperatorId] = useState<string>('');

  const [callComment, setCallComment] = useState('');
  const [nextCallAt, setNextCallAt] = useState('');
  const [assignedDraft, setAssignedDraft] = useState<string>('');
  const [temperatureDraft, setTemperatureDraft] = useState<'' | Exclude<Temperature, null>>('');
  const [isOnline, setIsOnline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operatorComment, setOperatorComment] = useState('');

  const [bookingClientName, setBookingClientName] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingComment, setBookingComment] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const fetchDashboard = async () => {
    const response = await apiInstance.get('/call-center/dashboard');
    setDashboard(response.data.data);
  };

  const fetchOperators = async () => {
    const response = await apiInstance.get('/call-center/operators');
    const operatorList = response.data.data as Operator[];
    setOperators(operatorList);
    const currentOperator = operatorList.find((op) => op.id === user?.id);
    setIsOnline(Boolean(currentOperator?.is_online));
  };

  const fetchSources = async () => {
    const response = await apiInstance.get('/call-center/sources');
    setSources(response.data.data as SourceSummary[]);
  };

  const fetchEnums = async () => {
    try {
      const response = await apiInstance.get('/call-center/meta');
      setEnums(response.data.data as CcEnums);
    } catch (error) {
      console.error('Failed to fetch CC meta:', error);
    }
  };

  const fetchOperatorStats = async () => {
    if (!isManager) return;
    try {
      const response = await apiInstance.get('/call-center/stats/operators');
      setOperatorStats(response.data.data as OperatorStats[]);
    } catch (error) {
      console.error('Failed to fetch operator stats:', error);
    }
  };

  const fetchLeads = async () => {
    const params: Record<string, string> = {};
    if (selectedStatus !== 'ALL') params.status = selectedStatus;
    if (selectedTemperature !== 'ALL') params.temperature = selectedTemperature;
    if (selectedSource !== 'ALL') params.source = selectedSource;
    if (search.trim()) params.search = search.trim();
    if (sort) params.sort = sort;

    const response = await apiInstance.get('/call-center/leads', { params });
    const leadList = response.data.data as Lead[];
    setLeads(leadList);
    setSelectedIds((prev) => {
      const next = new Set<number>();
      const valid = new Set(leadList.map((l) => l.id));
      prev.forEach((id) => { if (valid.has(id)) next.add(id); });
      return next;
    });
    if (selectedLead && !leadList.some((lead) => lead.id === selectedLead.id)) {
      setSelectedLead(null);
    }
  };

  const fetchLeadDetails = useCallback(async (leadId: number) => {
    const response = await apiInstance.get(`/call-center/leads/${leadId}`);
    const lead = response.data.data as LeadDetails;
    setSelectedLead(lead);
    setAssignedDraft(lead.assigned_to ? String(lead.assigned_to) : '');
    setTemperatureDraft(lead.temperature || '');
    setNextCallAt(lead.next_call_at ? lead.next_call_at.slice(0, 16) : '');
    setCallComment('');
    setShowBookingForm(false);
    setShowCallbackPicker(false);
    setOperatorComment('');
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboard(),
        fetchOperators(),
        fetchSources(),
        fetchLeads(),
        fetchOperatorStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEnums(); }, []);
  useEffect(() => {
    refreshData();
  }, [selectedStatus, selectedTemperature, selectedSource, sort]);

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await refreshData();
  };

  const handleOperatorStatusToggle = async () => {
    const nextValue = !isOnline;
    setIsOnline(nextValue);
    try {
      await apiInstance.patch('/call-center/operators/me/status', { is_online: nextValue });
      await fetchOperators();
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to toggle operator status:', error);
      setIsOnline(!nextValue);
    }
  };

  const handleSaveLead = async () => {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        status: selectedLead.status,
        next_call_at: nextCallAt || null
      };
      if (isManager) {
        payload.assigned_to = assignedDraft ? Number(assignedDraft) : null;
      }
      await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, payload);

      if (isManager && temperatureDraft !== (selectedLead.temperature || '')) {
        await apiInstance.patch(`/call-center/leads/${selectedLead.id}/temperature`, {
          temperature: temperatureDraft || null
        });
      }

      await Promise.all([
        fetchDashboard(), fetchOperators(), fetchSources(),
        fetchLeads(), fetchLeadDetails(selectedLead.id), fetchOperatorStats()
      ]);
    } catch (error) {
      console.error('Failed to save lead:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatus = async (status: LeadStatus) => {
    if (!selectedLead) return;

    if (status === 'NO_ANSWER') {
      setSubmitting(true);
      try {
        await apiInstance.post('/call-center/calls', {
          lead_id: selectedLead.id,
          result: 'NO_ANSWER',
          comment: callComment || 'Попытка звонка — не дозвонились'
        });
        setCallComment('');
        await Promise.all([refreshData(), fetchLeadDetails(selectedLead.id)]);
      } finally { setSubmitting(false); }
      return;
    }

    if (status === 'CALL_BACK') {
      setShowCallbackPicker(true);
      setShowBookingForm(false);
      return;
    }

    if (status === 'BOOKED') {
      setBookingClientName(selectedLead.name || '');
      setShowBookingForm(true);
      setShowCallbackPicker(false);
      return;
    }

    if (status === 'REJECTED' || status === 'SPAM' || status === 'DUPLICATE' || status === 'NON_TARGET') {
      setSubmitting(true);
      try {
        await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, { status });
        if (callComment) {
          await apiInstance.post('/call-center/calls', {
            lead_id: selectedLead.id,
            result: 'REJECTED',
            comment: callComment
          });
        }
        setCallComment('');
        setSelectedLead(null);
        await refreshData();
      } finally { setSubmitting(false); }
      return;
    }

    setSubmitting(true);
    try {
      await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, { status });
      await Promise.all([refreshData(), fetchLeadDetails(selectedLead.id)]);
    } finally { setSubmitting(false); }
  };

  const handleScheduleCallback = async () => {
    if (!selectedLead || !nextCallAt) return;
    setSubmitting(true);
    try {
      await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, {
        status: 'CALL_BACK',
        next_call_at: nextCallAt
      });
      setShowCallbackPicker(false);
      await Promise.all([refreshData(), fetchLeadDetails(selectedLead.id)]);
    } finally { setSubmitting(false); }
  };

  const handleBookClient = async () => {
    if (!selectedLead) return;
    if (!bookingClientName.trim()) { alert('Укажите ФИО клиента'); return; }
    if (!bookingDate) { alert('Выберите дату консультации'); return; }
    if (!bookingTime) { alert('Выберите время консультации'); return; }

    setSubmitting(true);
    try {
      await apiInstance.post(`/call-center/leads/${selectedLead.id}/book`, {
        client_name: bookingClientName,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        comment: bookingComment || null
      });
      setBookingClientName('');
      setBookingDate('');
      setBookingTime('');
      setBookingComment('');
      setShowBookingForm(false);
      setSelectedLead(null);
      await refreshData();
    } catch (error) {
      console.error('Failed to book client:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickTemperature = async (leadId: number, temperature: Temperature) => {
    if (!isManager) return;
    try {
      await apiInstance.patch(`/call-center/leads/${leadId}/temperature`, { temperature });
      await Promise.all([fetchSources(), fetchLeads()]);
      if (selectedLead?.id === leadId) await fetchLeadDetails(leadId);
    } catch (error) {
      console.error('Failed to set temperature:', error);
    }
  };

  const toggleLeadSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleBulkAssign = async (operatorIdRaw: string) => {
    if (!isManager || selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await apiInstance.post('/call-center/leads/bulk-assign', {
        lead_ids: Array.from(selectedIds),
        operator_id: operatorIdRaw === '' ? null : Number(operatorIdRaw)
      });
      setSelectedIds(new Set());
      setBulkOperatorId('');
      await refreshData();
    } catch (error) {
      console.error('Bulk assign failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTestLead = async () => {
    setSubmitting(true);
    try {
      await apiInstance.post('/call-center/test-lead');
      await refreshData();
    } catch (error) {
      console.error('Failed to create test lead:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedOperatorFilter !== 'ALL') {
      result = result.filter(l =>
        selectedOperatorFilter === 'NONE'
          ? !l.assigned_to
          : l.assigned_to === Number(selectedOperatorFilter)
      );
    }
    return result;
  }, [leads, selectedOperatorFilter]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalSelected = selectedIds.size;
  const allSelected = filteredLeads.length > 0 && totalSelected === filteredLeads.length;

  useEffect(() => { setPage(1); }, [selectedStatus, selectedTemperature, selectedSource, selectedOperatorFilter, search]);

  const statuses = dashboard?.statuses || {};
  const newCount = statuses['NEW'] || 0;
  const inProgressCount = statuses['IN_PROGRESS'] || 0;
  const bookedCount = statuses['BOOKED'] || 0;
  const totalLeads = dashboard?.sla?.total_leads || 0;
  const conversionRate = totalLeads > 0 ? Math.round((bookedCount / totalLeads) * 100) : 0;

  const getNextAction = (lead: LeadDetails) => {
    if (lead.status === 'BOOKED') return { text: 'Консультация назначена', color: '#0a8f52' };
    if (lead.status === 'CALL_BACK' && lead.next_call_at) {
      return { text: `Перезвонить ${formatDateTime(lead.next_call_at)}`, color: '#1976d2' };
    }
    if (lead.status === 'NEW') return { text: 'Позвонить клиенту', color: '#c77700' };
    if (lead.status === 'NO_ANSWER') return { text: 'Повторный звонок', color: '#5f6b7a' };
    if (lead.status === 'IN_PROGRESS') return { text: 'Продолжить обработку', color: '#c77700' };
    return { text: '—', color: '#6b7280' };
  };

  const isLeadClosed = false;

  return (
    <div className="call-center-page">
      {/* TOOLBAR */}
      <div className="cc-toolbar">
        <div>
          <h2 className="cc-title">Колл-центр</h2>
          <p className="cc-subtitle">
            {isManager
              ? 'Распределение лидов, контроль операторов, статистика КЦ'
              : isOperatorOnly
                ? 'Ваши лиды и звонки'
                : 'Приём лидов и работа операторов'}
          </p>
        </div>
        <div className="cc-toolbar-actions">
          <button className="cc-btn cc-btn-primary" onClick={handleCreateTestLead} disabled={submitting}>
            + Добавить тестовый лид
          </button>
        </div>
      </div>



      {/* MAIN LAYOUT: TABLE + DRAWER */}
      <div className={`cc-main-layout ${selectedLead ? 'drawer-open' : ''}`}>
        {/* LEFT: LEADS TABLE */}
        <div className="cc-table-section">
          {/* FILTERS */}
          <form className="cc-filters" onSubmit={handleSearchSubmit}>
            <select
              className="cc-filter-select"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="ALL">Все источники</option>
              {sources.map(s => (
                <option key={s.source} value={s.source}>{SOURCE_LABEL(s.source)}</option>
              ))}
            </select>
            <select
              className="cc-filter-select"
              value={selectedTemperature}
              onChange={(e) => setSelectedTemperature(e.target.value as 'ALL' | Exclude<Temperature, null>)}
            >
              <option value="ALL">Все температуры</option>
              {TEMPERATURE_OPTIONS.map(t => (
                <option key={t} value={t}>{TEMPERATURE_LABELS[t]}</option>
              ))}
            </select>
            <select
              className="cc-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | LeadStatus)}
            >
              <option value="ALL">Все статусы</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            {isManager && (
              <select
                className="cc-filter-select"
                value={selectedOperatorFilter}
                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
              >
                <option value="ALL">Все операторы</option>
                <option value="NONE">Не назначен</option>
                {operators
                  .filter(op => ['cc_operator', 'cc_manager', 'manager', 'okk'].includes(op.role))
                  .map(op => (
                    <option key={op.id} value={op.id}>{operatorName(op)}</option>
                  ))}
              </select>
            )}
            <div className="cc-search-wrap">
              <svg className="cc-search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по ФИО, телефону…"
                className="cc-search-input"
              />
              {search && (
                <button type="button" className="cc-search-clear" onClick={() => { setSearch(''); refreshData(); }}>×</button>
              )}
            </div>
            <button type="button" className="cc-btn-reset" onClick={() => {
              setSelectedSource('ALL'); setSelectedTemperature('ALL');
              setSelectedStatus('ALL'); setSelectedOperatorFilter('ALL');
              setSearch('');
            }}>Сбросить</button>
          </form>

          {/* BULK BAR */}
          {isManager && totalSelected > 0 && (
            <div className="cc-bulk-bar">
              <span>Выбрано: <strong>{totalSelected}</strong></span>
              <select value={bulkOperatorId} onChange={(e) => setBulkOperatorId(e.target.value)}>
                <option value="">— Снять назначение —</option>
                {operators
                  .filter(op => ['cc_operator', 'cc_manager', 'manager', 'okk'].includes(op.role))
                  .map(op => (
                    <option key={op.id} value={op.id}>
                      {operatorName(op)} {op.is_online ? '🟢' : '⚪'} (загр. {op.current_load})
                      {isCrossOffice && op.office_name ? ` · ${op.office_name}` : ''}
                    </option>
                  ))}
              </select>
              <button type="button" onClick={() => handleBulkAssign(bulkOperatorId)} disabled={submitting}>Назначить</button>
              <button type="button" onClick={() => setSelectedIds(new Set())} className="cc-link-btn">Сбросить</button>
            </div>
          )}

          {/* TABLE */}
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  {isManager && (
                    <th className="cc-th-check">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                  )}
                  <th>Лид</th>
                  <th>Описание</th>
                  <th>Источник</th>
                  <th>Темпер.</th>
                  <th>Статус</th>
                  <th>Пометка</th>
                  <th>Оператор</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={isManager ? 9 : 8} className="cc-td-empty">Загрузка лидов…</td></tr>
                )}
                {!loading && filteredLeads.length === 0 && (
                  <tr><td colSpan={isManager ? 9 : 8} className="cc-td-empty">Лидов нет по выбранным фильтрам</td></tr>
                )}
                {paginatedLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);
                  const isOpen = selectedLead?.id === lead.id;
                  return (
                    <tr
                      key={lead.id}
                      className={`cc-row ${isOpen ? 'is-open' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => fetchLeadDetails(lead.id)}
                    >
                      {isManager && (
                        <td className="cc-td-check" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleLeadSelection(lead.id)} />
                        </td>
                      )}
                      <td>
                        <div className="cc-lead-name">{lead.name}</div>
                        <div className="cc-lead-phone">{lead.phone || '—'}</div>
                      </td>
                      <td className="cc-td-desc">
                        {lead.description ? (
                          <span className="cc-lead-desc">{lead.description.length > 60 ? lead.description.slice(0, 60) + '…' : lead.description}</span>
                        ) : (
                          <span className="cc-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="cc-source-badge">
                          {SOURCE_ICONS[lead.source.toLowerCase()] && <span className="cc-source-icon">{SOURCE_ICONS[lead.source.toLowerCase()]}</span>}
                          {SOURCE_LABEL(lead.source)}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {isManager ? (
                          <select
                            className={`cc-temp-sel cc-temp-${lead.temperature || 'none'}`}
                            value={lead.temperature || ''}
                            onChange={(e) => handleQuickTemperature(lead.id, (e.target.value || null) as Temperature)}
                          >
                            <option value="">—</option>
                            {TEMPERATURE_OPTIONS.map(t => <option key={t} value={t}>{TEMPERATURE_LABELS[t]}</option>)}
                          </select>
                        ) : (
                          <span className={`cc-temp-badge cc-temp-${lead.temperature || 'none'}`}>
                            {lead.temperature ? TEMPERATURE_LABELS[lead.temperature] : '—'}
                          </span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className={`cc-status-sel status-${lead.status.toLowerCase()}`}
                          value={lead.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as LeadStatus;
                            if (newStatus === lead.status) return;
                            try {
                              await apiInstance.patch(`/call-center/leads/${lead.id}`, { status: newStatus });
                              await refreshData();
                            } catch (err: any) {
                              console.error('Failed to update status', err);
                              alert(err?.response?.data?.message || 'Ошибка при смене статуса');
                            }
                          }}
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_SHORT[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="cc-td-note" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          className="cc-note-input"
                          defaultValue={lead.operator_note || ''}
                          placeholder="—"
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val === (lead.operator_note || '')) return;
                            try {
                              await apiInstance.patch(`/call-center/leads/${lead.id}`, { operator_note: val || null });
                              await refreshData();
                            } catch (err) {
                              console.error('Failed to save note', err);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                        />
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {isManager ? (
                          <select
                            className="cc-operator-sel"
                            value={lead.assigned_to || ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              apiInstance.put(`/call-center/leads/${lead.id}/assign`, { operator_id: val }).then(() => refreshData());
                            }}
                          >
                            <option value="">—</option>
                            {operators
                              .filter(op => ['cc_operator', 'cc_manager', 'manager', 'okk'].includes(op.role))
                              .map(op => <option key={op.id} value={op.id}>{operatorName(op)}</option>)}
                          </select>
                        ) : (
                          lead.assigned_to_name ? (
                            <span>{lead.assigned_to_name}</span>
                          ) : (
                            <span className="cc-muted">—</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="cc-pagination">
              <span className="cc-page-info">Показано {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredLeads.length)} из {filteredLeads.length} лидов</span>
              <div className="cc-page-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="cc-page-btn">&laquo;</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                  Math.max(0, page - 3), Math.min(totalPages, page + 2)
                ).map(p => (
                  <button key={p} className={`cc-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                {totalPages > page + 2 && <span className="cc-page-ellipsis">…</span>}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="cc-page-btn">&raquo;</button>
              </div>
              <select className="cc-page-size" value={ITEMS_PER_PAGE}>
                <option value="50">50 / стр.</option>
              </select>
            </div>
          )}
        </div>

        {/* RIGHT DRAWER */}
        {selectedLead && (
          <div className="cc-drawer">
            <div className="cc-drawer-header">
              <button className="cc-drawer-close" onClick={() => { setSelectedLead(null); setShowBookingForm(false); setShowCallbackPicker(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h3 className="cc-drawer-name">{selectedLead.name}</h3>
              <div className="cc-drawer-badges">
                <span className={`cc-temp-badge cc-temp-${selectedLead.temperature || 'none'}`}>
                  {selectedLead.temperature ? TEMPERATURE_LABELS[selectedLead.temperature] : '—'}
                </span>
                <span className={`cc-status-badge status-${selectedLead.status.toLowerCase()}`}>
                  {STATUS_SHORT[selectedLead.status]}
                </span>
              </div>
            </div>

            {/* LEAD INFO */}
            <div className="cc-drawer-info">
              <div className="cc-info-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <span>{selectedLead.phone || '—'}</span>
              </div>
              <div className="cc-info-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Источник: <strong>{SOURCE_LABEL(selectedLead.source)}</strong></span>
              </div>
              {selectedLead.description && (
                <div className="cc-info-row cc-info-description">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  <span>Вопрос: <strong>{selectedLead.description}</strong></span>
                </div>
              )}
              <div className="cc-info-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>Поступил: <strong>{formatDateTime(selectedLead.created_at)}</strong></span>
              </div>
              <div className="cc-info-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Оператор: <strong>{selectedLead.assigned_to_name || 'не назначен'}</strong></span>
              </div>
            </div>

            {/* QUICK STATUS ACTIONS */}
            {!isLeadClosed && (
              <div className="cc-drawer-section">
                <h4 className="cc-section-title">Быстрые действия</h4>
                <div className="cc-quick-grid">
                  <button className="cc-qbtn cc-qbtn-noanswer" disabled={submitting} onClick={() => handleQuickStatus('NO_ANSWER')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/></svg>
                    Не дозвонились
                  </button>
                  <button className="cc-qbtn cc-qbtn-callback" disabled={submitting} onClick={() => handleQuickStatus('CALL_BACK')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Перезвонить позже
                  </button>
                  <button className="cc-qbtn cc-qbtn-inprogress" disabled={submitting} onClick={() => handleQuickStatus('IN_PROGRESS')}>
                    В обработке
                  </button>
                  <button className="cc-qbtn cc-qbtn-reject" disabled={submitting} onClick={() => handleQuickStatus('REJECTED')}>Отказ</button>
                  <button className="cc-qbtn cc-qbtn-spam" disabled={submitting} onClick={() => handleQuickStatus('SPAM')}>Спам</button>
                  <button className="cc-qbtn cc-qbtn-dup" disabled={submitting} onClick={() => handleQuickStatus('DUPLICATE')}>Дубль</button>
                  <button className="cc-qbtn cc-qbtn-nontarget" disabled={submitting} onClick={() => handleQuickStatus('NON_TARGET')}>Нецелевой</button>
                </div>
              </div>
            )}

            {/* CALLBACK PICKER */}
            {showCallbackPicker && (
              <div className="cc-drawer-section cc-callback-section">
                <h4 className="cc-section-title">Назначить перезвон</h4>
                <input
                  type="datetime-local"
                  className="cc-datetime-input"
                  value={nextCallAt}
                  onChange={(e) => setNextCallAt(e.target.value)}
                />
                <div className="cc-callback-actions">
                  <button className="cc-btn cc-btn-primary" onClick={handleScheduleCallback} disabled={submitting || !nextCallAt}>
                    Назначить
                  </button>
                  <button className="cc-link-btn" onClick={() => setShowCallbackPicker(false)}>Отмена</button>
                </div>
              </div>
            )}

            {/* BOOKING FORM */}
            {showBookingForm && !isLeadClosed && (
              <div className="cc-drawer-section cc-booking-section">
                <h4 className="cc-section-title">Запись на консультацию</h4>
                <div className="cc-booking-form">
                  <label>
                    <span>ФИО клиента *</span>
                    <input type="text" value={bookingClientName} onChange={(e) => setBookingClientName(e.target.value)} placeholder="Фамилия Имя Отчество" />
                  </label>
                  <div className="cc-booking-row">
                    <label>
                      <span>Дата *</span>
                      <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                    </label>
                    <label>
                      <span>Время *</span>
                      <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
                    </label>
                  </div>
                  <label>
                    <span>Комментарий</span>
                    <textarea rows={2} value={bookingComment} onChange={(e) => setBookingComment(e.target.value)} placeholder="Доп. информация" />
                  </label>
                  <div className="cc-booking-actions">
                    <button className="cc-btn cc-btn-book" onClick={handleBookClient} disabled={submitting || !bookingClientName.trim() || !bookingDate || !bookingTime}>
                      Записать
                    </button>
                    <button className="cc-link-btn" onClick={() => setShowBookingForm(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}

            {/* BOOK CONSULTATION CTA */}
            {!isLeadClosed && !showBookingForm && (
              <div className="cc-drawer-cta">
                <button
                  className="cc-btn cc-btn-consult"
                  onClick={() => handleQuickStatus('BOOKED')}
                  disabled={submitting}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Записать на консультацию
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallCenter;
