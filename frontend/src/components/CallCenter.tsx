import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { DatePicker } from 'antd';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './CallCenter.css';

dayjs.locale('ru');

type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'NO_ANSWER' | 'CALL_BACK' | 'INTERESTED' | 'BOOKED' | 'REJECTED' | 'SPAM' | 'DUPLICATE' | 'NON_TARGET' | 'UNREACHABLE' | 'CLOSED';

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
  details?: string | Record<string, any> | null;
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
  arrived_leads: number;
  brak_leads: number;
  booking_rate: number;
  arrival_rate: number;
  brak_rate: number;
}

interface StatsPeriod {
  from: string;
  to: string;
  cycle_index?: number | null;
  current_cycle_index?: number | null;
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

const ARCHIVE_STATUSES: LeadStatus[] = ['REJECTED', 'SPAM', 'DUPLICATE', 'NON_TARGET', 'UNREACHABLE', 'CLOSED'];

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
  NO_ANSWER: 'Нет ответа',
  CALL_BACK: 'Перезвонить',
  INTERESTED: 'Заинтересован',
  BOOKED: 'Записан',
  REJECTED: 'Отказ',
  SPAM: 'Спам',
  DUPLICATE: 'Дубль',
  NON_TARGET: 'Нецелевой',
  UNREACHABLE: 'Недозвон',
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

const operatorName = (op: Pick<Operator, 'first_name' | 'last_name' | 'email'>) =>
  [op.first_name, op.last_name].filter(Boolean).join(' ') || op.email;

const SOURCE_LABEL = (source: string) => {
  const known: Record<string, string> = {
    'pravoved.ru': 'Pravoved.ru', pravoved: 'Pravoved.ru',
    gainnet: 'Gainnet', gynet: 'Gynet',
    facebook: 'Facebook', '2gis': '2GIS', avito: 'Avito'
  };
  return known[source.toLowerCase()] || source;
};

interface TargetOffice {
  id: number;
  name: string;
}

const MANAGER_ROLES = ['cc_manager', 'admin', 'director'];

const CallCenter: React.FC = () => {
  const { user } = useAuth();
  const isManager = useMemo(() => MANAGER_ROLES.includes(user?.role || ''), [user?.role]);
  const showStatsTab = useMemo(() => isManager && user?.role !== 'cc_manager', [isManager, user?.role]);
  const isOperatorOnly = user?.role === 'cc_operator';
  const isCrossOffice = useMemo(
    () => user?.role === 'cc_manager' || user?.role === 'cc_operator',
    [user?.role]
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod | null>(null);
  // Смещение периода офиса для статистики (0 = текущий, -1 = предыдущий).
  const [statsCycleOffset, setStatsCycleOffset] = useState<number>(0);
  const statsCycleOffsetRef = React.useRef<number>(0);
  const [activeMainTab, setActiveMainTab] = useState<'leads' | 'stats'>('leads');
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [enums, setEnums] = useState<CcEnums | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calOpen, setCalOpen] = useState(false);

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
  const [targetOffices, setTargetOffices] = useState<TargetOffice[]>([]);
  const [bookingOfficeId, setBookingOfficeId] = useState<number | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportSource, setExportSource] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [activeListTab, setActiveListTab] = useState<'active' | 'archive'>('active');

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

  const fetchOperatorStats = async (dateFrom?: string, dateTo?: string) => {
    if (!isManager) return;
    try {
      const params: Record<string, string | number> = {};
      if (dateFrom && dateTo) {
        params.date_from = dateFrom;
        params.date_to = dateTo;
      } else if (statsCycleOffsetRef.current !== 0) {
        params.cycle_offset = statsCycleOffsetRef.current;
      }
      const response = await apiInstance.get('/call-center/stats/operators', { params });
      setOperatorStats(response.data.data as OperatorStats[]);
      if (response.data.period) {
        setStatsPeriod(response.data.period as StatsPeriod);
      }
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

  const initialRef = React.useRef(true);
  const refreshData = async () => {
    if (initialRef.current) setLoading(true);
    try {
      await Promise.all([
        fetchDashboard(),
        fetchOperators(),
        fetchSources(),
        fetchLeads(),
        fetchOperatorStats()
      ]);
    } finally {
      if (initialRef.current) { setLoading(false); initialRef.current = false; }
    }
  };

  useEffect(() => {
    fetchEnums();
    // Загружаем доступные офисы для кросс-офисной записи
    apiInstance.get('/call-center/target-offices')
      .then(res => {
        const offices = res.data?.data || [];
        setTargetOffices(offices);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedTemperature, selectedSource, sort]);

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await refreshData();
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
        comment: bookingComment || null,
        ...(bookingOfficeId ? { target_office_id: bookingOfficeId } : {})
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

  const handleExport = async () => {
    if (!exportDateFrom || !exportDateTo) {
      alert('Укажите период');
      return;
    }
    setExporting(true);
    try {
      const params: Record<string, string> = {
        date_from: exportDateFrom,
        date_to: exportDateTo
      };
      if (exportSource) params.source = exportSource;
      if (exportStatus) params.status = exportStatus;

      const response = await apiInstance.get('/export/leads-report', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_report_${exportDateFrom}_${exportDateTo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Ошибка при экспорте отчёта');
    } finally {
      setExporting(false);
    }
  };

  /* ──── derived data ──── */
  const todayStr = dayjs().format('YYYY-MM-DD');
  const selectedDateStr = selectedDate.format('YYYY-MM-DD');

  const filteredLeads = useMemo(() => {
    let result = leads;
    // filter by selected date
    result = result.filter(l => {
      if (!l.created_at) return false;
      return l.created_at.slice(0, 10) === selectedDateStr;
    });
    if (activeListTab === 'archive') {
      result = result.filter(l => ARCHIVE_STATUSES.includes(l.status));
    } else {
      result = result.filter(l => !ARCHIVE_STATUSES.includes(l.status));
    }
    if (selectedOperatorFilter !== 'ALL') {
      result = result.filter(l =>
        selectedOperatorFilter === 'NONE'
          ? !l.assigned_to
          : l.assigned_to === Number(selectedOperatorFilter)
      );
    }
    return result;
  }, [leads, selectedOperatorFilter, activeListTab, selectedDateStr]);

  const dateLeads = useMemo(() => leads.filter(l => l.created_at && l.created_at.slice(0, 10) === selectedDateStr), [leads, selectedDateStr]);
  const activeCount = useMemo(() => dateLeads.filter(l => !ARCHIVE_STATUSES.includes(l.status)).length, [dateLeads]);
  const archiveCount = useMemo(() => dateLeads.filter(l => ARCHIVE_STATUSES.includes(l.status)).length, [dateLeads]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalSelected = selectedIds.size;
  const allSelected = filteredLeads.length > 0 && totalSelected === filteredLeads.length;

  useEffect(() => { setPage(1); }, [selectedStatus, selectedTemperature, selectedSource, selectedOperatorFilter, search, activeListTab]);

  const colCount = isManager ? 8 : 7;

  /* ──── render ──── */

  return (
    <div className="call-center-page">
      {/* ── TOOLBAR ── */}
      <div className="cc-toolbar">
        <h2 className="cc-title">Колл-центр</h2>
        <div className="cc-toolbar-actions">
          <button className="cc-btn cc-btn-export" onClick={() => setShowExportModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Экспорт в Excel
          </button>
        </div>
      </div>

      {/* ── DATE NAVIGATION ── */}
      <div className="cc-date-nav">
        <button className="cc-date-arrow" onClick={() => { setSelectedDate(d => d.subtract(1, 'day')); setPage(1); }} title="Предыдущий день">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="cc-date-current" onClick={() => { setSelectedDate(dayjs()); setPage(1); }} title="Вернуться к сегодня">
          {selectedDateStr === todayStr ? `Сегодня, ${selectedDate.format('D MMM')}` : selectedDate.format('D MMMM, dd')}
        </span>
        <button className="cc-date-arrow" onClick={() => { setSelectedDate(d => d.add(1, 'day')); setPage(1); }} title="Следующий день">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button className="cc-date-cal-btn" onClick={() => setCalOpen(v => !v)} title="Выбрать дату">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </button>
          <DatePicker
            value={selectedDate}
            onChange={d => { if (d) { setSelectedDate(d); setCalOpen(false); setPage(1); } }}
            open={calOpen}
            onOpenChange={setCalOpen}
            allowClear={false}
            style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
          />
        </div>
      </div>

      {/* ── TABS: Active / Archive ── */}
      <div className="cc-tabs">
        <button
          className={`cc-tab ${activeListTab === 'active' ? 'active' : ''}`}
          onClick={() => { setActiveListTab('active'); setPage(1); }}
        >
          Активные лиды&nbsp;<span className="cc-tab-count">{activeCount}</span>
        </button>
        <button
          className={`cc-tab ${activeListTab === 'archive' ? 'active' : ''}`}
          onClick={() => { setActiveListTab('archive'); setPage(1); }}
        >
          Архив лидов&nbsp;<span className="cc-tab-count">{archiveCount}</span>
        </button>
      </div>

      {/* ── MAIN TABS: Leads / Stats ── */}
      {showStatsTab && (
        <div className="cc-main-tabs">
          <button
            className={`cc-main-tab ${activeMainTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('leads')}
          >
            Лиды
          </button>
          <button
            className={`cc-main-tab ${activeMainTab === 'stats' ? 'active' : ''}`}
            onClick={() => { setActiveMainTab('stats'); fetchOperatorStats(); }}
          >
            Статистика операторов
          </button>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      {(!isManager || activeMainTab === 'leads') && <div className={`cc-main-layout ${selectedLead ? 'drawer-open' : ''}`}>
        {/* LEFT: table */}
        <div className="cc-table-section">
          {/* FILTERS */}
          <form className="cc-filters" onSubmit={handleSearchSubmit}>
            <select className="cc-filter-select" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
              <option value="ALL">Все источники</option>
              {sources.map(s => <option key={s.source} value={s.source}>{SOURCE_LABEL(s.source)}</option>)}
            </select>
            <select className="cc-filter-select" value={selectedTemperature} onChange={(e) => setSelectedTemperature(e.target.value as any)}>
              <option value="ALL">Все температуры</option>
              {TEMPERATURE_OPTIONS.map(t => <option key={t} value={t}>{TEMPERATURE_LABELS[t]}</option>)}
            </select>
            <select className="cc-filter-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
              <option value="ALL">Все статусы</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {isManager && (
              <select className="cc-filter-select" value={selectedOperatorFilter} onChange={(e) => setSelectedOperatorFilter(e.target.value)}>
                <option value="ALL">Все операторы</option>
                <option value="NONE">Не назначен</option>
                {operators.filter(op => ['cc_operator', 'cc_manager'].includes(op.role)).map(op => (
                  <option key={op.id} value={String(op.id)}>{operatorName(op)}</option>
                ))}
              </select>
            )}
            <div className="cc-search-wrap">
              <svg className="cc-search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по ФИО, телефону…" className="cc-search-input" />
              {search && <button type="button" className="cc-search-clear" onClick={() => { setSearch(''); refreshData(); }}>×</button>}
            </div>
          </form>

          {/* BULK BAR */}
          {isManager && totalSelected > 0 && (
            <div className="cc-bulk-bar">
              <span>Выбрано: <strong>{totalSelected}</strong></span>
              <select value={bulkOperatorId} onChange={(e) => setBulkOperatorId(e.target.value)}>
                <option value="">— Снять назначение —</option>
                {operators.filter(op => ['cc_operator', 'cc_manager'].includes(op.role)).map(op => (
                  <option key={op.id} value={String(op.id)}>{operatorName(op)}</option>
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
                  {isManager && <th className="cc-th-check"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>}
                  <th>ЛИД</th>
                  <th>ОПИСАНИЕ</th>
                  <th>ПОМЕТКИ</th>
                  <th>СТАТУС</th>
                  <th>ОПЕРАТОР</th>
                  <th>ДАТА ПОСТУПЛЕНИЯ</th>
                  <th className="cc-th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={colCount} className="cc-td-empty">Загрузка лидов…</td></tr>}
                {!loading && filteredLeads.length === 0 && <tr><td colSpan={colCount} className="cc-td-empty">Лидов нет по выбранным фильтрам</td></tr>}
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
                      <td className="cc-td-clamp">
                        <span className="cc-text-clamp" title={lead.description || ''}>{lead.description || <span className="cc-muted">—</span>}</span>
                      </td>
                      <td className="cc-td-clamp">
                        <span className="cc-text-clamp" title={lead.operator_note || ''}>{lead.operator_note || <span className="cc-muted">—</span>}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className={`cc-status-sel status-${lead.status.toLowerCase()}`}
                          value={lead.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as LeadStatus;
                            if (newStatus === lead.status) return;
                            const oldStatus = lead.status;
                            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
                            try {
                              await apiInstance.patch(`/call-center/leads/${lead.id}`, { status: newStatus });
                              await refreshData();
                            } catch (err: any) {
                              console.error('Failed to update status', err);
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: oldStatus } : l));
                              alert(err?.response?.data?.message || 'Ошибка при смене статуса');
                            }
                          }}
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_SHORT[s]}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className="cc-operator-name">{lead.assigned_to_name || <span className="cc-muted">—</span>}</span>
                      </td>
                      <td>
                        <div className="cc-date-cell">
                          <span>{new Date(lead.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          <span className="cc-date-time">{new Date(lead.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="cc-td-actions" onClick={e => e.stopPropagation()}>
                        <button className="cc-row-menu" onClick={() => fetchLeadDetails(lead.id)}>⋯</button>
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
              <span className="cc-page-info">Показано {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredLeads.length)} из {filteredLeads.length}</span>
              <div className="cc-page-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="cc-page-btn">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                  .map(p => (
                    <button key={p} className={`cc-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                {totalPages > page + 2 && <span className="cc-page-ellipsis">…</span>}
                {totalPages > page + 2 && <button className="cc-page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="cc-page-btn">›</button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT DRAWER ── */}
        {selectedLead && (
          <div className="cc-drawer">
            <div className="cc-drawer-header">
              <div>
                <h3 className="cc-drawer-name">{selectedLead.name}</h3>
                <span className="cc-drawer-phone">{selectedLead.phone || '—'}</span>
              </div>
              <button className="cc-drawer-close" onClick={() => { setSelectedLead(null); setShowBookingForm(false); setShowCallbackPicker(false); }}>×</button>
            </div>

            <div className="cc-drawer-body">
              {/* Meta info */}
              <div className="cc-drawer-meta">
                <div className="cc-meta-row">
                  <span className="cc-meta-label">Источник:</span>
                  <span className="cc-meta-value">{SOURCE_LABEL(selectedLead.source)}</span>
                </div>
                <div className="cc-meta-row">
                  <span className="cc-meta-label">Температура:</span>
                  <span className={`cc-meta-value cc-temp-inline cc-temp-${selectedLead.temperature || 'none'}`}>
                    <span className="cc-temp-dot-icon">●</span> {selectedLead.temperature ? TEMPERATURE_LABELS[selectedLead.temperature] : '—'}
                  </span>
                </div>
                <div className="cc-meta-row">
                  <span className="cc-meta-label">Оператор:</span>
                  {isManager ? (
                    <select
                      className="cc-meta-operator-select"
                      value={selectedLead.assigned_to || ''}
                      onChange={async (e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        try {
                          await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, { assigned_to: val });
                          await Promise.all([fetchLeads(), fetchLeadDetails(selectedLead.id)]);
                        } catch (err) {
                          console.error('Failed to assign operator', err);
                        }
                      }}
                    >
                      <option value="">—</option>
                      {operators.filter(op => ['cc_operator', 'cc_manager'].includes(op.role)).map(op => (
                        <option key={op.id} value={String(op.id)}>{operatorName(op)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="cc-meta-value">{selectedLead.assigned_to_name || '—'}</span>
                  )}
                </div>
                <div className="cc-meta-row">
                  <span className="cc-meta-label">Дата поступления:</span>
                  <span className="cc-meta-value">{formatDateTime(selectedLead.created_at)}</span>
                </div>
              </div>

              {/* Full description */}
              {selectedLead.description && (
                <div className="cc-drawer-section">
                  <h4 className="cc-section-title">Полное описание</h4>
                  <p className="cc-section-text">{selectedLead.description}</p>
                </div>
              )}

              {/* Operator notes */}
              <div className="cc-drawer-section">
                <div className="cc-section-title-row">
                  <h4 className="cc-section-title">Пометки оператора</h4>
                  <svg className="cc-edit-pencil" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <input
                  type="text"
                  className="cc-drawer-note-input"
                  defaultValue={selectedLead.operator_note || ''}
                  placeholder="Нет пометки"
                  key={selectedLead.id + '_note'}
                  onBlur={async (e) => {
                    const val = e.target.value.trim();
                    if (val === (selectedLead.operator_note || '')) return;
                    try {
                      await apiInstance.patch(`/call-center/leads/${selectedLead.id}`, { operator_note: val || null });
                      await fetchLeadDetails(selectedLead.id);
                    } catch (err) { console.error('Failed to save note', err); }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />
              </div>

              {/* History timeline */}
              {!isOperatorOnly && selectedLead.history && selectedLead.history.length > 0 && (
                <div className="cc-drawer-section">
                  <h4 className="cc-section-title">История взаимодействий</h4>
                  <div className="cc-timeline">
                    {selectedLead.history.map((item) => (
                      <div key={item.id} className="cc-timeline-item">
                        <div className={`cc-timeline-dot ${
                          item.action === 'LEAD_CREATED' ? 'dot-blue' :
                          item.action === 'ASSIGNED' ? 'dot-red' :
                          item.action === 'CALL_LOGGED' ? 'dot-orange' :
                          item.action === 'STATUS_CHANGED' ? 'dot-green' :
                          'dot-gray'
                        }`} />
                        <div className="cc-timeline-content">
                          <span className="cc-timeline-date">{formatDateTime(item.created_at)}</span>
                          <span className="cc-timeline-text">
                            {HISTORY_LABELS[item.action] || item.action}
                            {item.details ? ` ${typeof item.details === 'object' ? (item.details.comment || item.details.source || '') : item.details}` : ''}
                            {item.user_name ? ` ${item.user_name}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer footer: main CTA */}
            <div className="cc-drawer-footer">
              <button
                className="cc-btn cc-btn-consult"
                onClick={() => handleQuickStatus('BOOKED')}
                disabled={submitting}
              >
                {selectedLead.status === 'BOOKED' ? 'Перезаписать на консультацию' : 'Записать на консультацию'}
              </button>
            </div>
          </div>
        )}
      </div>}

      {/* ── OPERATOR STATS TABLE ── */}
      {showStatsTab && activeMainTab === 'stats' && (
        <div className="cc-stats-section">
          <div className="cc-stats-period-info" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {(() => {
              const cIdx = statsPeriod?.cycle_index ?? null;
              const curIdx = statsPeriod?.current_cycle_index ?? null;
              const atCurrent = cIdx == null || curIdx == null ? statsCycleOffset >= 0 : cIdx >= curIdx;
              const canPrev = cIdx == null ? true : cIdx > 0;
              const go = (next: number) => { statsCycleOffsetRef.current = next; setStatsCycleOffset(next); fetchOperatorStats(); };
              const nb = (en: boolean): React.CSSProperties => ({
                padding: '4px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--color-border)',
                background: 'var(--color-bg)', color: en ? 'var(--color-text)' : 'var(--color-muted)', cursor: en ? 'pointer' : 'not-allowed', fontWeight: 500,
              });
              return (
                <>
                  <button onClick={() => { if (canPrev) go(curIdx != null ? Math.max(-curIdx, statsCycleOffset - 1) : statsCycleOffset - 1); }}
                    disabled={!canPrev} style={nb(canPrev)} title="Предыдущий период">‹ Пред. период</button>
                  {statsPeriod && (
                    <span className="cc-stats-period-label">
                      Период: {new Date(statsPeriod.from).toLocaleDateString('ru-RU')} — {new Date(statsPeriod.to).toLocaleDateString('ru-RU')}
                      {!atCurrent && <span style={{ color: '#64748b' }}> (прошлый)</span>}
                    </span>
                  )}
                  <button onClick={() => { if (!atCurrent) go(Math.min(0, statsCycleOffset + 1)); }}
                    disabled={atCurrent} style={nb(!atCurrent)} title="Следующий период">След. период ›</button>
                  {!atCurrent && (
                    <button onClick={() => go(0)} style={nb(true)} title="К текущему периоду">Текущий</button>
                  )}
                </>
              );
            })()}
          </div>
          <div className="cc-table-wrap">
            <table className="cc-table cc-stats-table">
              <thead>
                <tr>
                  <th>Оператор</th>
                  <th>Все лиды</th>
                  <th>Записано</th>
                  <th>Пришли</th>
                  <th>% записи</th>
                  <th>% прихода</th>
                  <th>% брака</th>
                </tr>
              </thead>
              <tbody>
                {operatorStats.map((op) => (
                  <tr key={op.id}>
                    <td>
                      <div className="cc-stats-operator-name">
                        <span className={`cc-stats-online-dot ${op.is_online ? 'online' : 'offline'}`} />
                        {op.name}
                      </div>
                    </td>
                    <td><strong>{op.total_leads}</strong></td>
                    <td>{op.booked_leads}</td>
                    <td>{op.arrived_leads}</td>
                    <td>
                      <span className={`cc-stats-pct ${op.booking_rate >= 50 ? 'pct-green' : op.booking_rate >= 25 ? 'pct-yellow' : 'pct-red'}`}>
                        {op.booking_rate}%
                      </span>
                    </td>
                    <td>
                      <span className={`cc-stats-pct ${op.arrival_rate >= 70 ? 'pct-green' : op.arrival_rate >= 40 ? 'pct-yellow' : 'pct-red'}`}>
                        {op.arrival_rate}%
                      </span>
                    </td>
                    <td>
                      <span className={`cc-stats-pct ${op.brak_rate <= 15 ? 'pct-green' : op.brak_rate <= 30 ? 'pct-yellow' : 'pct-red'}`}>
                        {op.brak_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
                {operatorStats.length === 0 && (
                  <tr><td colSpan={7} className="cc-td-empty">Нет данных по операторам</td></tr>
                )}
              </tbody>
              {operatorStats.length > 0 && (
                <tfoot>
                  <tr className="cc-stats-total-row">
                    <td><strong>ИТОГО</strong></td>
                    <td><strong>{operatorStats.reduce((s, o) => s + o.total_leads, 0)}</strong></td>
                    <td><strong>{operatorStats.reduce((s, o) => s + o.booked_leads, 0)}</strong></td>
                    <td><strong>{operatorStats.reduce((s, o) => s + o.arrived_leads, 0)}</strong></td>
                    <td>
                      {(() => {
                        const tl = operatorStats.reduce((s, o) => s + o.total_leads, 0);
                        const bl = operatorStats.reduce((s, o) => s + o.booked_leads, 0);
                        const pct = tl > 0 ? Math.round(bl / tl * 100) : 0;
                        return <span className={`cc-stats-pct ${pct >= 50 ? 'pct-green' : pct >= 25 ? 'pct-yellow' : 'pct-red'}`}><strong>{pct}%</strong></span>;
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const bl = operatorStats.reduce((s, o) => s + o.booked_leads, 0);
                        const al = operatorStats.reduce((s, o) => s + o.arrived_leads, 0);
                        const pct = bl > 0 ? Math.round(al / bl * 100) : 0;
                        return <span className={`cc-stats-pct ${pct >= 70 ? 'pct-green' : pct >= 40 ? 'pct-yellow' : 'pct-red'}`}><strong>{pct}%</strong></span>;
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const tl = operatorStats.reduce((s, o) => s + o.total_leads, 0);
                        const brk = operatorStats.reduce((s, o) => s + o.brak_leads, 0);
                        const pct = tl > 0 ? Math.round(brk / tl * 100) : 0;
                        return <span className={`cc-stats-pct ${pct <= 15 ? 'pct-green' : pct <= 30 ? 'pct-yellow' : 'pct-red'}`}><strong>{pct}%</strong></span>;
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── BOOKING MODAL ── */}
      {showBookingForm && selectedLead && (
        <div className="cc-modal-overlay" onClick={() => setShowBookingForm(false)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3>Запись на консультацию</h3>
              <button className="cc-modal-close" onClick={() => setShowBookingForm(false)}>×</button>
            </div>
            <div className="cc-modal-body">
              <label className="cc-form-field">
                <span className="cc-form-label">ФИО клиента *</span>
                <input type="text" className="cc-form-input" value={bookingClientName} onChange={(e) => setBookingClientName(e.target.value)} placeholder="Фамилия Имя Отчество" />
              </label>
              {targetOffices.length > 1 && (
                <label className="cc-form-field">
                  <span className="cc-form-label">Город *</span>
                  <select
                    className="cc-form-input"
                    value={bookingOfficeId ?? ''}
                    onChange={(e) => setBookingOfficeId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Выберите город —</option>
                    {targetOffices.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="cc-form-row">
                <label className="cc-form-field">
                  <span className="cc-form-label">Дата *</span>
                  <input type="date" className="cc-form-input" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                </label>
                <label className="cc-form-field">
                  <span className="cc-form-label">Время *</span>
                  <input type="time" className="cc-form-input" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
                </label>
              </div>
              <label className="cc-form-field">
                <span className="cc-form-label">Комментарий</span>
                <textarea className="cc-form-textarea" rows={3} value={bookingComment} onChange={(e) => setBookingComment(e.target.value)} placeholder="Дополнительная информация" />
              </label>
            </div>
            <div className="cc-modal-footer">
              <button className="cc-btn cc-btn-consult" onClick={handleBookClient} disabled={submitting || !bookingClientName.trim() || !bookingDate || !bookingTime || (targetOffices.length > 1 && !bookingOfficeId)}>
                Записать
              </button>
              <button className="cc-link-btn" onClick={() => setShowBookingForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT MODAL ── */}
      {showExportModal && (
        <div className="cc-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3>Экспорт лидов в Excel</h3>
              <button className="cc-modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="cc-modal-body">
              <div className="cc-form-row">
                <label className="cc-form-field">
                  <span className="cc-form-label">Дата начала *</span>
                  <input type="date" className="cc-form-input" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)} />
                </label>
                <label className="cc-form-field">
                  <span className="cc-form-label">Дата окончания *</span>
                  <input type="date" className="cc-form-input" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)} />
                </label>
              </div>
              <div className="cc-form-row">
                <label className="cc-form-field">
                  <span className="cc-form-label">Источник</span>
                  <select className="cc-form-input" value={exportSource} onChange={e => setExportSource(e.target.value)}>
                    <option value="">Все источники</option>
                    {sources.map(s => <option key={s.source} value={s.source}>{SOURCE_LABEL(s.source)}</option>)}
                  </select>
                </label>
                <label className="cc-form-field">
                  <span className="cc-form-label">Статус</span>
                  <select className="cc-form-input" value={exportStatus} onChange={e => setExportStatus(e.target.value)}>
                    <option value="">Все статусы</option>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="cc-modal-footer">
              <button className="cc-btn cc-btn-consult" onClick={handleExport} disabled={exporting || !exportDateFrom || !exportDateTo}>
                {exporting ? 'Формирование...' : 'Скачать отчёт'}
              </button>
              <button className="cc-link-btn" onClick={() => setShowExportModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallCenter;