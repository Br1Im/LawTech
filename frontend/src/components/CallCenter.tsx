import React, { useEffect, useMemo, useState } from 'react';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './CallCenter.css';

type LeadStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'NO_ANSWER'
  | 'CALL_BACK'
  | 'INTERESTED'
  | 'REJECTED'
  | 'CLOSED';

type CallResult =
  | 'NO_ANSWER'
  | 'CALL_BACK'
  | 'INTERESTED'
  | 'REJECTED'
  | 'CLOSED'
  | 'FAILED';

interface Lead {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  source: string;
  status: LeadStatus;
  score: number;
  assigned_to: number | null;
  assigned_to_name?: string | null;
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

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'NO_ANSWER',
  'CALL_BACK',
  'INTERESTED',
  'REJECTED',
  'CLOSED'
];

const CALL_RESULT_OPTIONS: CallResult[] = [
  'NO_ANSWER',
  'CALL_BACK',
  'INTERESTED',
  'REJECTED',
  'CLOSED',
  'FAILED'
];

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  NO_ANSWER: 'Не дозвонились',
  CALL_BACK: 'Перезвонить',
  INTERESTED: 'Заинтересован',
  REJECTED: 'Отказ',
  CLOSED: 'Закрыт'
};

const CALL_LABELS: Record<string, string> = {
  NO_ANSWER: 'Не ответил',
  CALL_BACK: 'Перезвонить',
  INTERESTED: 'Заинтересован',
  REJECTED: 'Отказ',
  CLOSED: 'Закрыт',
  FAILED: 'Ошибка'
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeSla = (minutes: number | null) => {
  if (minutes === null || Number.isNaN(minutes)) {
    return '—';
  }

  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours} ч ${restMinutes} мин`;
};

const CallCenter: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState('');
  const [callResult, setCallResult] = useState<CallResult>('NO_ANSWER');
  const [callComment, setCallComment] = useState('');
  const [nextCallAt, setNextCallAt] = useState('');
  const [statusDraft, setStatusDraft] = useState<LeadStatus>('NEW');
  const [assignedDraft, setAssignedDraft] = useState<string>('');
  const [isOnline, setIsOnline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManage = useMemo(
    () => ['director', 'manager', 'okk', 'admin'].includes(user?.role || ''),
    [user?.role]
  );

  const fetchDashboard = async () => {
    const response = await apiInstance.get('/call-center/dashboard');
    setDashboard(response.data.data);
  };

  const fetchOperators = async () => {
    const response = await apiInstance.get('/call-center/operators');
    const operatorList = response.data.data as Operator[];
    setOperators(operatorList);
    const currentOperator = operatorList.find((operator) => operator.id === user?.id);
    setIsOnline(Boolean(currentOperator?.is_online));
  };

  const fetchLeads = async () => {
    const params: Record<string, string> = {};
    if (selectedStatus !== 'ALL') {
      params.status = selectedStatus;
    }
    if (onlyMine) {
      params.assigned_to = 'me';
    }
    if (search.trim()) {
      params.search = search.trim();
    }

    const response = await apiInstance.get('/call-center/leads', { params });
    const leadList = response.data.data as Lead[];
    setLeads(leadList);
    if (!selectedLead && leadList.length > 0) {
      await fetchLeadDetails(leadList[0].id);
    }
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
    setNextCallAt(lead.next_call_at ? lead.next_call_at.slice(0, 16) : '');
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchDashboard(), fetchOperators(), fetchLeads()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedStatus, onlyMine]);

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await refreshData();
  };

  const handleOperatorStatusToggle = async () => {
    const nextValue = !isOnline;
    setIsOnline(nextValue);
    try {
      await apiInstance.patch('/call-center/operators/me/status', {
        is_online: nextValue
      });
      await fetchOperators();
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to toggle operator status:', error);
      setIsOnline(!nextValue);
    }
  };

  const handleSaveLead = async () => {
    if (!selectedLead) {
      return;
    }

    setSubmitting(true);
    try {
      await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, {
        status: statusDraft,
        assigned_to: assignedDraft ? Number(assignedDraft) : null,
        next_call_at: nextCallAt || null
      });
      await Promise.all([fetchDashboard(), fetchOperators(), fetchLeads(), fetchLeadDetails(selectedLead.id)]);
    } catch (error) {
      console.error('Failed to save lead:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogCall = async () => {
    if (!selectedLead) {
      return;
    }

    setSubmitting(true);
    try {
      await apiInstance.post('/call-center/calls', {
        lead_id: selectedLead.id,
        result: callResult,
        comment: callComment || null,
        next_call_at: nextCallAt || null
      });
      setCallComment('');
      await Promise.all([fetchDashboard(), fetchOperators(), fetchLeads(), fetchLeadDetails(selectedLead.id)]);
    } catch (error) {
      console.error('Failed to log call:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="call-center-page">
      <div className="call-center-toolbar">
        <div>
          <h2>Колл-центр</h2>
          <p>Приём лидов, работа операторов и SLA первого контакта.</p>
        </div>
        <button className={`availability-toggle ${isOnline ? 'online' : 'offline'}`} onClick={handleOperatorStatusToggle}>
          {isOnline ? 'Оператор онлайн' : 'Оператор оффлайн'}
        </button>
      </div>

      <div className="call-center-stats">
        <div className="stat-card">
          <span>Всего лидов</span>
          <strong>{dashboard?.sla.total_leads ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>Контактировано</span>
          <strong>{dashboard?.sla.contacted_leads ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>Средний SLA</span>
          <strong>{formatRelativeSla(dashboard?.sla.avg_response_time_minutes ?? null)}</strong>
        </div>
        <div className="stat-card danger">
          <span>Просрочено</span>
          <strong>{dashboard?.sla.overdue_leads ?? 0}</strong>
        </div>
      </div>

      <div className="call-center-status-grid">
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className={`status-chip-card status-${status.toLowerCase()}`}>
            <span>{STATUS_LABELS[status]}</span>
            <strong>{dashboard?.statuses?.[status] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div className="call-center-layout">
        <div className="leads-panel">
          <form className="lead-filters" onSubmit={handleSearchSubmit}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по имени, телефону, email"
            />
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              <option value="ALL">Все статусы</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <label className="mine-toggle">
              <input type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
              <span>Только мои</span>
            </label>
            <button type="submit">Обновить</button>
          </form>

          <div className="lead-list">
            {loading && <div className="empty-state">Загрузка лидов...</div>}
            {!loading && leads.length === 0 && <div className="empty-state">Лидов пока нет</div>}
            {leads.map((lead) => (
              <button
                key={lead.id}
                className={`lead-card ${selectedLead?.id === lead.id ? 'active' : ''}`}
                onClick={() => fetchLeadDetails(lead.id)}
              >
                <div className="lead-card-top">
                  <strong>{lead.name}</strong>
                  <span className={`lead-status status-${lead.status.toLowerCase()}`}>{STATUS_LABELS[lead.status]}</span>
                </div>
                <div className="lead-card-meta">
                  <span>{lead.phone || lead.email || 'Без контактов'}</span>
                  <span>Score {lead.score}</span>
                </div>
                <div className="lead-card-meta">
                  <span>{lead.assigned_to_name || 'Без оператора'}</span>
                  <span>{lead.calls_count || 0} звонков</span>
                </div>
                <div className="lead-card-foot">
                  <span>{lead.source}</span>
                  <span>{formatDateTime(lead.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lead-details-panel">
          {!selectedLead && <div className="empty-state">Выберите лид, чтобы открыть карточку</div>}

          {selectedLead && (
            <>
              <div className="lead-header">
                <div>
                  <h3>{selectedLead.name}</h3>
                  <p>{selectedLead.description || 'Описание не заполнено'}</p>
                </div>
                <div className="lead-header-metrics">
                  <div>
                    <span>Источник</span>
                    <strong>{selectedLead.source}</strong>
                  </div>
                  <div>
                    <span>Score</span>
                    <strong>{selectedLead.score}</strong>
                  </div>
                  <div>
                    <span>SLA</span>
                    <strong>{formatRelativeSla(selectedLead.response_time_minutes)}</strong>
                  </div>
                </div>
              </div>

              <div className="lead-contact-grid">
                <div>
                  <span>Телефон</span>
                  <strong>{selectedLead.phone || '—'}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{selectedLead.email || '—'}</strong>
                </div>
                <div>
                  <span>Первый звонок</span>
                  <strong>{formatDateTime(selectedLead.first_call_at)}</strong>
                </div>
                <div>
                  <span>Следующий контакт</span>
                  <strong>{formatDateTime(selectedLead.next_call_at)}</strong>
                </div>
              </div>

              <div className="editor-grid">
                <div className="editor-card">
                  <h4>Управление лидом</h4>
                  <label>
                    <span>Статус</span>
                    <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as LeadStatus)}>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Оператор</span>
                    <select value={assignedDraft} onChange={(event) => setAssignedDraft(event.target.value)}>
                      <option value="">Не назначен</option>
                      {operators.map((operator) => (
                        <option key={operator.id} value={operator.id}>
                          {[operator.first_name, operator.last_name].filter(Boolean).join(' ') || operator.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Дата следующего звонка</span>
                    <input
                      type="datetime-local"
                      value={nextCallAt}
                      onChange={(event) => setNextCallAt(event.target.value)}
                    />
                  </label>

                  <button onClick={handleSaveLead} disabled={submitting}>
                    Сохранить изменения
                  </button>
                </div>

                <div className="editor-card">
                  <h4>Логирование звонка</h4>
                  <label>
                    <span>Результат</span>
                    <select value={callResult} onChange={(event) => setCallResult(event.target.value as CallResult)}>
                      {CALL_RESULT_OPTIONS.map((result) => (
                        <option key={result} value={result}>
                          {CALL_LABELS[result]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Комментарий</span>
                    <textarea
                      rows={4}
                      value={callComment}
                      onChange={(event) => setCallComment(event.target.value)}
                      placeholder="Кратко зафиксируйте результат разговора"
                    />
                  </label>
                  <button onClick={handleLogCall} disabled={submitting}>
                    Сохранить звонок
                  </button>
                </div>
              </div>

              <div className="lead-history-layout">
                <div className="history-card">
                  <h4>История звонков</h4>
                  {selectedLead.calls.length === 0 && <div className="empty-state compact">Звонков ещё не было</div>}
                  {selectedLead.calls.map((call) => (
                    <div key={call.id} className="timeline-item">
                      <div className="timeline-top">
                        <strong>{CALL_LABELS[call.result]}</strong>
                        <span>{formatDateTime(call.created_at)}</span>
                      </div>
                      <p>{call.comment || 'Без комментария'}</p>
                      <small>{call.user_name || 'Система'}</small>
                    </div>
                  ))}
                </div>

                <div className="history-card">
                  <h4>История изменений</h4>
                  {selectedLead.history.length === 0 && <div className="empty-state compact">История пуста</div>}
                  {selectedLead.history.map((item) => (
                    <div key={item.id} className="timeline-item">
                      <div className="timeline-top">
                        <strong>{item.action}</strong>
                        <span>{formatDateTime(item.created_at)}</span>
                      </div>
                      <p>{item.details || 'Без деталей'}</p>
                      <small>{item.user_name || 'Система'}</small>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {canManage && (
          <div className="operators-panel">
            <h3>Операторы</h3>
            <div className="operators-list">
              {operators.map((operator) => (
                <div key={operator.id} className="operator-card">
                  <div className="operator-head">
                    <strong>{[operator.first_name, operator.last_name].filter(Boolean).join(' ') || operator.email}</strong>
                    <span className={operator.is_online ? 'operator-online' : 'operator-offline'}>
                      {operator.is_online ? 'online' : 'offline'}
                    </span>
                  </div>
                  <div className="operator-meta">
                    <span>{operator.role}</span>
                    <span>Нагрузка: {operator.current_load}</span>
                  </div>
                  {'closed_leads' in operator && (
                    <div className="operator-meta">
                      <span>Всего лидов: {operator.total_leads || 0}</span>
                      <span>Закрыто: {operator.closed_leads || 0}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallCenter;
