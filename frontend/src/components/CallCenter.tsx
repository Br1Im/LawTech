import React, { useEffect, useMemo, useState } from 'react';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './CallCenter.css';

// TZ-compliant lead statuses: Новый / В работе / Не дозвонился / Записан / Отказ
type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'NO_ANSWER' | 'BOOKED' | 'REJECTED';

type CallResult = 'NO_ANSWER' | 'BOOKED' | 'REJECTED' | 'IN_PROGRESS' | 'FAILED';

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
}

interface CallLog {
  id: number;
  result: CallResult;
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

const STATUS_OPTIONS: LeadStatus[] = ['NEW', 'IN_PROGRESS', 'NO_ANSWER', 'BOOKED', 'REJECTED'];
const CALL_RESULT_OPTIONS: CallResult[] = ['NO_ANSWER', 'BOOKED', 'REJECTED', 'IN_PROGRESS', 'FAILED'];
const TEMPERATURE_OPTIONS: Exclude<Temperature, null>[] = ['hot', 'warm', 'cold'];

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  NO_ANSWER: 'Не дозвонился',
  BOOKED: 'Записан',
  REJECTED: 'Отказ'
};

const CALL_LABELS: Record<CallResult, string> = {
  NO_ANSWER: 'Не дозвонился',
  BOOKED: 'Записан',
  REJECTED: 'Отказ',
  IN_PROGRESS: 'В работе',
  FAILED: 'Ошибка связи'
};

const TEMPERATURE_LABELS: Record<Exclude<Temperature, null>, string> = {
  hot: 'Горячий',
  warm: 'Тёплый',
  cold: 'Холодный'
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeSla = (minutes: number | null) => {
  if (minutes === null || Number.isNaN(minutes)) return '—';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
};

const operatorName = (op: Pick<Operator, 'first_name' | 'last_name' | 'email'>) =>
  [op.first_name, op.last_name].filter(Boolean).join(' ') || op.email;

const SOURCE_LABEL = (source: string) => {
  const known: Record<string, string> = {
    'pravoved.ru': 'Pravoved.ru',
    pravoved: 'Pravoved.ru',
    gainnet: 'Gainnet'
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

  // Filters
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | LeadStatus>('ALL');
  const [selectedTemperature, setSelectedTemperature] = useState<'ALL' | Exclude<Temperature, null>>('ALL');
  const [selectedOfficeId, setSelectedOfficeId] = useState<'ALL' | number>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'created_at:desc' | 'created_at:asc' | 'score:desc'>('created_at:desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOperatorId, setBulkOperatorId] = useState<string>('');

  // Lead detail editor state
  const [callResult, setCallResult] = useState<CallResult>('NO_ANSWER');
  const [callComment, setCallComment] = useState('');
  const [nextCallAt, setNextCallAt] = useState('');
  const [statusDraft, setStatusDraft] = useState<LeadStatus>('NEW');
  const [assignedDraft, setAssignedDraft] = useState<string>('');
  const [temperatureDraft, setTemperatureDraft] = useState<'' | Exclude<Temperature, null>>('');
  const [isOnline, setIsOnline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Booking form state
  const [bookingClientName, setBookingClientName] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingComment, setBookingComment] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);

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
    if (selectedOfficeId !== 'ALL') params.office_id = String(selectedOfficeId);
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

  const fetchLeadDetails = async (leadId: number) => {
    const response = await apiInstance.get(`/call-center/leads/${leadId}`);
    const lead = response.data.data as LeadDetails;
    setSelectedLead(lead);
    setStatusDraft(lead.status);
    setAssignedDraft(lead.assigned_to ? String(lead.assigned_to) : '');
    setTemperatureDraft(lead.temperature || '');
    setNextCallAt(lead.next_call_at ? lead.next_call_at.slice(0, 16) : '');
  };

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

  useEffect(() => {
    fetchEnums();
  }, []);

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedTemperature, selectedSource, selectedOfficeId, sort]);

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
        status: statusDraft,
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
        fetchDashboard(),
        fetchOperators(),
        fetchSources(),
        fetchLeads(),
        fetchLeadDetails(selectedLead.id),
        fetchOperatorStats()
      ]);
    } catch (error) {
      console.error('Failed to save lead:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogCall = async () => {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      await apiInstance.post('/call-center/calls', {
        lead_id: selectedLead.id,
        result: callResult,
        comment: callComment || null,
        next_call_at: nextCallAt || null
      });
      setCallComment('');
      await Promise.all([
        fetchDashboard(),
        fetchOperators(),
        fetchSources(),
        fetchLeads(),
        fetchLeadDetails(selectedLead.id),
        fetchOperatorStats()
      ]);
    } catch (error) {
      console.error('Failed to log call:', error);
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
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
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

  const totalSelected = selectedIds.size;
  const allSelected = leads.length > 0 && totalSelected === leads.length;

  return (
    <div className="call-center-page">
      <div className="call-center-toolbar">
        <div>
          <h2>Колл-центр</h2>
          <p>{isManager ? 'Распределение лидов, контроль операторов, статистика КЦ.' : isOperatorOnly ? 'Ваши лиды и звонки.' : 'Приём лидов и работа операторов.'}</p>
        </div>
        <div className="cc-toolbar-actions">
          <button
            className="cc-test-lead-btn"
            onClick={handleCreateTestLead}
            disabled={submitting}
          >
            + Добавить тестовый лид
          </button>
          <button
            className={`availability-toggle ${isOnline ? 'online' : 'offline'}`}
            onClick={handleOperatorStatusToggle}
          >
            {isOnline ? 'Оператор онлайн' : 'Оператор оффлайн'}
          </button>
        </div>
      </div>



      <div className="call-center-layout">
        <div className="cc-leads-panel" style={{ flex: 1 }}>
          <form className="lead-filters cc-filters-row" onSubmit={handleSearchSubmit}>
            <div className="cc-search-wrap">
              <button type="submit" className="cc-search-icon" title="Поиск">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="cc-search-input"
              />
            </div>
            <select value={selectedTemperature} onChange={(e) => setSelectedTemperature(e.target.value as 'ALL' | Exclude<Temperature, null>)}>
              <option value="ALL">Любая температура</option>
              {TEMPERATURE_OPTIONS.map((t) => (
                <option key={t} value={t}>{TEMPERATURE_LABELS[t]}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="created_at:desc">Сначала новые</option>
              <option value="created_at:asc">Сначала старые</option>
              <option value="score:desc">По score</option>
            </select>
          </form>

          {isManager && totalSelected > 0 && (
            <div className="cc-bulk-bar">
              <span>Выбрано: <strong>{totalSelected}</strong></span>
              <select value={bulkOperatorId} onChange={(e) => setBulkOperatorId(e.target.value)}>
                <option value="">— Снять назначение —</option>
                {operators
                  .filter((op) => ['cc_operator', 'cc_manager', 'manager', 'okk'].includes(op.role))
                  .map((op) => (
                    <option key={op.id} value={op.id}>
                      {operatorName(op)} {op.is_online ? '🟢' : '⚪'} (загр. {op.current_load})
                      {isCrossOffice && op.office_name ? ` · ${op.office_name}` : ''}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => handleBulkAssign(bulkOperatorId)}
                disabled={submitting}
              >
                Назначить
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())} className="cc-link-btn">
                Сбросить
              </button>
            </div>
          )}

          <div className="cc-leads-table-wrap">
            <table className="cc-leads-table">
              <thead>
                <tr>
                  {isManager && (
                    <th className="cc-th-check">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Выбрать все"
                      />
                    </th>
                  )}
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Описание</th>
                  <th>Источник</th>

                  <th>Темпер.</th>
                  <th>Статус</th>
                  <th>Оператор</th>
                  <th>Поступил</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={isManager ? 9 : 8} className="cc-td-empty">Загрузка лидов…</td></tr>
                )}
                {!loading && leads.length === 0 && (
                  <tr><td colSpan={isManager ? 9 : 8} className="cc-td-empty">Лидов нет по выбранным фильтрам</td></tr>
                )}
                {leads.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);
                  const isOpen = selectedLead?.id === lead.id;
                  return (
                    <tr
                      key={lead.id}
                      className={`${isOpen ? 'is-open' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => fetchLeadDetails(lead.id)}
                    >
                      {isManager && (
                        <td className="cc-td-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLeadSelection(lead.id)}
                            aria-label={`Выбрать лид ${lead.id}`}
                          />
                        </td>
                      )}
                      <td><strong>{lead.name}</strong></td>
                      <td>{lead.phone || '—'}</td>
                      <td className="cc-td-desc" title={lead.description || ''}>
                        {(lead.description || '').slice(0, 60)}{(lead.description || '').length > 60 ? '…' : ''}
                      </td>
                      <td>{SOURCE_LABEL(lead.source)}</td>

                      <td onClick={(e) => e.stopPropagation()}>
                        {isManager ? (
                          <select
                            className={`cc-temp-select cc-temp-${lead.temperature || 'none'}`}
                            value={lead.temperature || ''}
                            onChange={(e) => handleQuickTemperature(lead.id, (e.target.value || null) as Temperature)}
                          >
                            <option value="">—</option>
                            {TEMPERATURE_OPTIONS.map((t) => (
                              <option key={t} value={t}>{TEMPERATURE_LABELS[t]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`cc-temp-badge cc-temp-${lead.temperature || 'none'}`}>
                            {lead.temperature ? TEMPERATURE_LABELS[lead.temperature] : '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`lead-status status-${lead.status.toLowerCase()}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td>{lead.assigned_to_name || <em className="cc-muted">не назначен</em>}</td>
                      <td className="cc-td-date">{formatDateTime(lead.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


      </div>

      {/* ===== MODAL: Lead Detail ===== */}
      {selectedLead && (
        <div className="cc-modal-overlay" onClick={() => { setSelectedLead(null); setShowBookingForm(false); }}>
          <div className="cc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <div>
                <h3>{selectedLead.name}</h3>
                <p className="cc-modal-desc">{selectedLead.description || 'Описание не заполнено'}</p>
              </div>
              <button className="cc-modal-close" onClick={() => { setSelectedLead(null); setShowBookingForm(false); }}>&times;</button>
            </div>

            <div className="cc-modal-info-row">
              <div><span>Телефон</span><strong>{selectedLead.phone || '—'}</strong></div>
              <div><span>Источник</span><strong>{SOURCE_LABEL(selectedLead.source)}</strong></div>
              <div><span>Статус</span><strong>{STATUS_LABELS[selectedLead.status]}</strong></div>
            </div>

            <div className="cc-modal-body">
              {/* Quick actions — main workflow */}
              <div className="editor-card">
                <h4>Результат звонка</h4>
                <label>
                  <span>Комментарий</span>
                  <textarea
                    rows={3}
                    value={callComment}
                    onChange={(e) => setCallComment(e.target.value)}
                    placeholder="Кратко зафиксируйте результат разговора"
                  />
                </label>
                <div className="cc-quick-actions">
                  <button
                    className="cc-action-btn cc-action-booked"
                    disabled={submitting || selectedLead.status === 'BOOKED'}
                    onClick={() => {
                      setBookingClientName(selectedLead.name || '');
                      setShowBookingForm(true);
                    }}
                  >
                    Записать на консультацию
                  </button>
                  <button
                    className="cc-action-btn cc-action-noanswer"
                    disabled={submitting || selectedLead.status === 'BOOKED'}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await apiInstance.post('/call-center/calls', { lead_id: selectedLead.id, result: 'NO_ANSWER', comment: callComment || null });
                        setCallComment('');
                        await refreshData();
                        await fetchLeadDetails(selectedLead.id);
                      } finally { setSubmitting(false); }
                    }}
                  >
                    Не дозвонились
                  </button>
                  <button
                    className="cc-action-btn cc-action-rejected"
                    disabled={submitting || selectedLead.status === 'BOOKED'}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await apiInstance.post('/call-center/calls', { lead_id: selectedLead.id, result: 'REJECTED', comment: callComment || null });
                        setCallComment('');
                        setSelectedLead(null);
                        await refreshData();
                      } finally { setSubmitting(false); }
                    }}
                  >
                    Отказ
                  </button>
                </div>
              </div>

              {/* Booking form */}
              {showBookingForm && selectedLead.status !== 'BOOKED' && (
                <div className="editor-card cc-booking-card">
                  <h4>Запись клиента на консультацию</h4>
                  <label>
                    <span>ФИО клиента *</span>
                    <input
                      type="text"
                      value={bookingClientName}
                      onChange={(e) => setBookingClientName(e.target.value)}
                      placeholder="Фамилия Имя Отчество"
                    />
                  </label>
                  <label>
                    <span>Дата консультации *</span>
                    <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                  </label>
                  <label>
                    <span>Время консультации *</span>
                    <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
                  </label>
                  <label>
                    <span>Комментарий</span>
                    <textarea rows={2} value={bookingComment} onChange={(e) => setBookingComment(e.target.value)} placeholder="Дополнительная информация" />
                  </label>
                  <div className="cc-booking-actions">
                    <button
                      className="cc-book-btn"
                      onClick={handleBookClient}
                      disabled={submitting || !bookingClientName.trim() || !bookingDate || !bookingTime}
                    >
                      Записать
                    </button>
                    <button className="cc-link-btn" onClick={() => setShowBookingForm(false)}>Отмена</button>
                  </div>
                </div>
              )}

              {/* Manager controls */}
              <div className="editor-card">
                <h4>Управление лидом</h4>
                <label>
                  <span>Статус</span>
                  <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as LeadStatus)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </label>
                {isManager && (
                  <>
                    <label>
                      <span>Оператор</span>
                      <select value={assignedDraft} onChange={(e) => setAssignedDraft(e.target.value)}>
                        <option value="">Не назначен</option>
                        {operators
                          .filter((op) => ['cc_operator', 'cc_manager', 'manager', 'okk'].includes(op.role))
                          .map((op) => (
                            <option key={op.id} value={op.id}>{operatorName(op)}</option>
                          ))}
                      </select>
                    </label>
                    <label>
                      <span>Температура</span>
                      <select
                        value={temperatureDraft}
                        onChange={(e) => setTemperatureDraft(e.target.value as '' | Exclude<Temperature, null>)}
                      >
                        <option value="">— Не задана —</option>
                        {TEMPERATURE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{TEMPERATURE_LABELS[t]}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <button onClick={handleSaveLead} disabled={submitting}>Сохранить изменения</button>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallCenter;
