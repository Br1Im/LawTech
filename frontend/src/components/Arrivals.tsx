import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { Table, Select, Button, Space, App, Input, Tabs, DatePicker, TimePicker, Modal, Alert } from 'antd';
import { TableSkeleton, EmptyState } from './ui';
import type { ColumnsType } from 'antd/es/table';
import ConsultationAnalysisModal from './ConsultationAnalysisModal';
import { PlusOutlined, ReloadOutlined, CheckCircleFilled, CloseCircleFilled, LeftOutlined, RightOutlined, CalendarOutlined, FileDoneOutlined, FileSearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import AdminContractRegister from './AdminContractRegister';
import { formatRussianPhone } from '../shared/lib/phone';
import './Appointments.css';
import './Arrivals.css';

dayjs.locale('ru');

/* ─── styled (Scandinavian minimal, matching Salary) ─── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 0;
`;

const StatRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
`;

const Stat = styled.div`
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  padding: 9px 12px;
  min-width: 132px;
  flex: 1;
  .lbl { color: var(--color-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  .val { font-weight: 700; font-size: 18px; }
`;

const TableCard = styled.div`
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 8px 8px 4px;
  overflow: hidden;
  .ant-table-thead > tr > th { background: var(--color-table-head-bg, #FAFAFA) !important; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .ant-table-tbody > tr > td { background: transparent !important; }
`;

const ToolRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const Badge = styled.span<{ bg: string; border: string; color: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-sm, 6px);
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.bg};
  border: 1px solid ${p => p.border};
  color: ${p => p.color};
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

const BadgeStatic = styled.span<{ bg: string; border: string; color: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-sm, 6px);
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.bg};
  border: 1px solid ${p => p.border};
  color: ${p => p.color};
`;

const FormCard = styled.div`
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 16px 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
  flex: 1;
  label { font-size: 12px; font-weight: 500; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
`;

/* ─── interfaces ─── */

interface PrimaryVisit {
  id: number;
  client_name: string;
  client_phone: string;
  source: string | null;
  appointment_date: string;
  appointment_time: string;
  comment: string | null;
  operator_name: string | null;
  consultation_result: 'contract_signed' | 'not_signed' | null;
  signed_by_name: string | null;
  contract_signed_by: number | null;
  assigned_lawyer_id: number | null;
  assigned_lawyer_name: string | null;
  assigned_lawyer_id_2: number | null;
  assigned_lawyer_name_2: string | null;
  arrived_at: string | null;
  created_at: string;
  linked_contract_id: number | null;
  linked_contract_type: 'docs' | 'court_rep' | null;
  linked_contract_number: string | null;
  linked_needs_input: number;
  analysis_id?: number | null;
  analysis_category?: string | null;
  analysis_sufficiency?: string | null;
  linked_contracts: Array<{ id: number; contract_type: 'docs' | 'court_rep'; contract_number: string; needs_lawyer_input: number }>;
}

interface ExistingVisit {
  id: number;
  client_name: string;
  employee_id: number | null;
  employee_name: string | null;
  visited_at: string;
  created_by_name: string | null;
  comment: string | null;
}

interface VisitsStats {
  primary: { total: number; contracts_signed: number; contracts_not_signed: number; pending: number; conversion: number };
  existing: { total: number };
  total_visits: number;
}

interface Employee { id: number; name: string; role: string; }
interface AppointmentSource { id: number; name: string; is_active: number | boolean; }

/* ─── helpers ─── */

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};
const fmtTime = (t: string) => (t ? t.substring(0, 5) : '');
const fmtDT = (d: string) => {
  try { return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};
// Фактическое время прихода (когда нажали «Пришёл»); fallback — время записи.
const fmtArrivedTime = (arrivedAt: string | null, scheduled: string) => {
  if (arrivedAt) {
    try { return new Date(arrivedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
    catch { /* fallthrough */ }
  }
  return fmtTime(scheduled);
};
// День из даты/датавремени в формате YYYY-MM-DD (как в «Записях»).
const toDayKey = (d: string) => { const x = String(d || ''); const m = x.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})/); return m ? m[1] : (dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : ''); };
const getInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map(part => part.charAt(0).toUpperCase())
  .join('') || 'К';

/* ─── component ─── */

const Arrivals: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const canSetResult = ['director', 'manager', 'okk'].includes(user?.role || '') || isAdmin;
  // Назначать юриста(ов) могут только Директор / Менеджер / Руководитель (НЕ администратор)
  const canAssignLawyer = ['director', 'manager', 'okk'].includes(user?.role || '');

  const [tab, setTab] = useState('primary');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calOpen, setCalOpen] = useState(false);
  const [primaryVisits, setPrimaryVisits] = useState<PrimaryVisit[]>([]);
  const [analysisVisit, setAnalysisVisit] = useState<PrimaryVisit | null>(null);
  const [existingVisits, setExistingVisits] = useState<ExistingVisit[]>([]);
  const [stats, setStats] = useState<VisitsStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sources, setSources] = useState<AppointmentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmployee, setFormEmployee] = useState<number | null>(null);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerAppointment, setRegisterAppointment] = useState<PrimaryVisit | null>(null);
  const [resultUpdatingId, setResultUpdatingId] = useState<number | null>(null);
  // Новый первичный приход (новый клиент) — тот же функционал, что и "Новая запись"
  const [newPrimaryModal, setNewPrimaryModal] = useState(false);
  const [creatingPrimary, setCreatingPrimary] = useState(false);
  const [newPrimary, setNewPrimary] = useState({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source_id: null as number | null, assigned_lawyer_ids: [] as number[] });
  const selectedDayKey = selectedDate.format('YYYY-MM-DD');

  const fetchPrimary = useCallback(async () => { try { const r = await apiInstance.get('/visits/primary', { params: { date: selectedDayKey } }); setPrimaryVisits(r.data?.data || []); setLoadError(null); } catch { setLoadError('Не удалось загрузить приходы. Проверьте соединение и обновите страницу.'); } }, [selectedDayKey]);
  const fetchExisting = useCallback(async () => { try { const r = await apiInstance.get('/visits/existing'); setExistingVisits(r.data?.data || []); setLoadError(null); } catch { setLoadError('Не удалось загрузить действующих клиентов.'); } }, []);
  const fetchStats = useCallback(async () => { try { const r = await apiInstance.get('/visits/stats', { params: { date: selectedDayKey } }); setStats(r.data?.data || null); } catch { setLoadError('Не удалось загрузить статистику приходов.'); } }, [selectedDayKey]);
  const fetchEmployees = useCallback(async () => { try { const r = await apiInstance.get('/visits/employees'); setEmployees(r.data?.data || []); } catch { setLoadError('Не удалось загрузить список сотрудников.'); } }, []);
  const fetchSources = useCallback(async () => { try { const r = await apiInstance.get('/appointment-sources'); setSources((r.data?.data || []).filter((x: AppointmentSource) => Boolean(x.is_active))); } catch { setLoadError('Не удалось загрузить список источников.'); } }, []);

  const initialLoadRef = React.useRef(true);
  const reload = useCallback(async () => {
    if (initialLoadRef.current) setLoading(true);
    await Promise.all([fetchPrimary(), fetchExisting(), fetchStats(), fetchEmployees(), fetchSources()]);
    if (initialLoadRef.current) { setLoading(false); initialLoadRef.current = false; }
  }, [fetchPrimary, fetchExisting, fetchStats, fetchEmployees, fetchSources]);

  useEffect(() => {
    reload();
    const iv = setInterval(() => { fetchPrimary(); fetchExisting(); fetchStats(); }, 15000);
    return () => clearInterval(iv);
  }, [reload, fetchPrimary, fetchExisting, fetchStats]);

  const handleSetResult = (row: PrimaryVisit, result: 'contract_signed' | 'not_signed') => {
    if (resultUpdatingId !== null || row.consultation_result === result) return;
    if (result === 'not_signed' && (row.linked_contracts || []).length > 0) { message.error('Нельзя отметить «Не заключён»: к консультации уже привязан договор.'); return; }
    Modal.confirm({
      title: result === 'contract_signed' ? 'Подтвердить результат консультации' : 'Подтвердите, что договор не заключён', content: row.client_name,
      okText: 'Подтвердить', cancelText: 'Отмена', okButtonProps: result === 'not_signed' ? { danger: true } : undefined,
      async onOk() {
        setResultUpdatingId(row.id);
        try {
          await apiInstance.patch(`/appointments/${row.id}/consultation-result`, { consultation_result: result });
          message.success(result === 'contract_signed' ? 'Договор заключён' : 'Договор не заключён');
          await Promise.all([fetchPrimary(), fetchStats()]);
          if (result === 'contract_signed' && isAdmin && !(row.linked_contracts || []).length) { setRegisterAppointment({ ...row, consultation_result: 'contract_signed' }); setRegisterOpen(true); }
        } catch (e: any) { message.error(e?.response?.data?.message || 'Не удалось сохранить результат'); throw e; }
        finally { setResultUpdatingId(null); }
      },
    });
  };

  const handleAssignLawyers = async (id: number, lawyerIds: number[]) => {
    if (!canAssignLawyer) { message.error('Назначение юристов доступно только руководству'); return; }
    try {
      await apiInstance.patch(`/appointments/${id}/assign-lawyer`, {
        assigned_lawyer_id: lawyerIds[0] ?? null,
        assigned_lawyer_id_2: lawyerIds[1] ?? null,
      });
      message.success('Сотрудник(и) назначен(ы)');
      fetchPrimary();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось назначить сотрудника');
    }
  };

  const handleAddExisting = async () => {
    if (!formName.trim()) { message.warning('Укажите ФИО клиента'); return; }
    setSubmitting(true);
    try {
      await apiInstance.post('/visits/existing', { client_name: formName.trim(), employee_id: formEmployee, comment: formComment.trim() || null });
      message.success('Приход добавлен');
      setFormName(''); setFormEmployee(null); setFormComment(''); setShowForm(false);
      fetchExisting(); fetchStats();
    } catch { message.error('Не удалось добавить приход'); }
    finally { setSubmitting(false); }
  };

  /* ─── разграничение по дням (как во вкладке «Записи») ─── */
  const todayStr = dayjs().format('YYYY-MM-DD');
  const handleCreatePrimary = async () => {
    if (!newPrimary.client_name.trim()) { message.warning('Укажите ФИО клиента'); return; }
    setCreatingPrimary(true);
    try {
      await apiInstance.post('/appointments', {
        client_name: newPrimary.client_name,
        client_phone: newPrimary.client_phone,
        appointment_date: newPrimary.date.format('YYYY-MM-DD'),
        appointment_time: newPrimary.time.format('HH:mm'),
        comment: newPrimary.comment || null,
        source_id: newPrimary.source_id,
        assigned_lawyer_id: canAssignLawyer ? (newPrimary.assigned_lawyer_ids[0] ?? null) : null,
        assigned_lawyer_id_2: canAssignLawyer ? (newPrimary.assigned_lawyer_ids[1] ?? null) : null,
        mark_arrived: true,
      });
      message.success('Приход добавлен');
      setNewPrimaryModal(false);
      setNewPrimary({ client_name: '', client_phone: '', date: dayjs(), time: dayjs().hour(10).minute(0), comment: '', source_id: null as number | null, assigned_lawyer_ids: [] });
      fetchPrimary();
      fetchStats();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось добавить приход');
    } finally {
      setCreatingPrimary(false);
    }
  };

  const primaryByDay = useMemo(
    () => primaryVisits.filter(v => toDayKey(v.appointment_date) === selectedDayKey),
    [primaryVisits, selectedDayKey]
  );
  const existingByDay = useMemo(
    () => existingVisits.filter(v => toDayKey(v.visited_at) === selectedDayKey),
    [existingVisits, selectedDayKey]
  );

  const DateNav = (
    <div className="apt-date-nav">
      <button className="apt-date-arrow" onClick={() => setSelectedDate(d => d.subtract(1, 'day'))} title="Предыдущий день">
        <LeftOutlined />
      </button>
      <span className="apt-date-current" onClick={() => setSelectedDate(dayjs())} title="Вернуться к сегодня">
        {selectedDayKey === todayStr ? `Сегодня, ${selectedDate.format('D MMM')}` : selectedDate.format('D MMMM, dd')}
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
  );

  /* ─── primary table columns ─── */
  const primaryCols: ColumnsType<PrimaryVisit> = [
    { title: 'ФИО', dataIndex: 'client_name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: 'Телефон', dataIndex: 'client_phone', key: 'phone', width: 140 },
    { title: 'Дата', dataIndex: 'appointment_date', key: 'date', width: 110, render: (v: string) => fmtDate(v) },
    { title: 'Время', key: 'time', width: 80, render: (_: unknown, row: PrimaryVisit) => fmtArrivedTime(row.arrived_at, row.appointment_time) },
    { title: 'Кто записал', dataIndex: 'operator_name', key: 'op', width: 150, render: (v: string) => v || '—' },
    {
      title: 'Сотрудник на консультации', key: 'lawyer', width: 240,
      render: (_: unknown, row: PrimaryVisit) => {
        // labelInValue: подпись берётся из значения (имя приходит с бэкенда),
        // поэтому имя сотрудника показывается даже если он не входит в список опций
        // (например, переведён в другой офис).
        const assignedItems = [
          row.assigned_lawyer_id ? { value: row.assigned_lawyer_id, label: row.assigned_lawyer_name || `#${row.assigned_lawyer_id}` } : null,
          row.assigned_lawyer_id_2 ? { value: row.assigned_lawyer_id_2, label: row.assigned_lawyer_name_2 || `#${row.assigned_lawyer_id_2}` } : null,
        ].filter((x): x is { value: number; label: string } => x !== null);
        if (canAssignLawyer) {
          return (
            <Select
              size="small"
              mode="multiple"
              labelInValue
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Не назначен"
              allowClear
              maxTagCount={1}
              value={assignedItems}
              onChange={(items: { value: number; label: string }[]) => {
                // не более 2 юристов одновременно
                const selected = items.map(i => i.value); if (selected.length > 2) { message.warning('Можно назначить не более двух юристов'); return; } const next = selected;
                handleAssignLawyers(row.id, next);
              }}
              options={employees.map(e => ({ value: e.id, label: e.name }))}
            />
          );
        }
        const names = [row.assigned_lawyer_name, row.assigned_lawyer_name_2].filter(Boolean);
        return <span>{names.length ? names.join(', ') : '—'}</span>;
      },
    },
    {
      title: 'Результат консультации', key: 'result', width: 180,
      align: 'center' as const,
      render: (_: unknown, row: PrimaryVisit) => {
        if (canSetResult) {
          return (
            <Space size={12}>
              <CheckCircleFilled
                style={{
                  fontSize: 24,
                  color: row.consultation_result === 'contract_signed' ? '#059669' : '#D1D5DB',
                  cursor: 'pointer',
                  transition: 'color 0.2s, transform 0.15s',
                }}
                onClick={() => handleSetResult(row, 'contract_signed')}
                title="Договор заключён"
              />
              <CloseCircleFilled
                style={{
                  fontSize: 24,
                  color: row.consultation_result === 'not_signed' ? '#DC2626' : '#D1D5DB',
                  cursor: 'pointer',
                  transition: 'color 0.2s, transform 0.15s',
                }}
                onClick={() => handleSetResult(row, 'not_signed')}
                title="Договор не заключён"
              />
            </Space>
          );
        }
        if (row.consultation_result === 'contract_signed')
          return <CheckCircleFilled style={{ fontSize: 22, color: '#059669' }} title="Заключён" />;
        if (row.consultation_result === 'not_signed')
          return <CloseCircleFilled style={{ fontSize: 22, color: '#DC2626' }} title="Не заключён" />;
        return <span style={{ color: 'var(--color-muted)' }}>Ожидает</span>;
      },
    },
    {
      title: 'Договор', key: 'contract', width: 200,
      render: (_: unknown, row: PrimaryVisit) => {
        if (row.consultation_result !== 'contract_signed') return <span style={{ color: 'var(--color-muted)' }}>—</span>;
        const contracts = row.linked_contracts || [];
        if (contracts.length > 0) {
          return (
            <Space direction="vertical" size={4}>
              {contracts.map((c) => (
                <Space key={c.id} direction="vertical" size={0}>
                  <BadgeStatic
                    bg={c.contract_type === 'docs' ? '#EFF6FF' : '#F5F3FF'}
                    border={c.contract_type === 'docs' ? '#3B82F6' : '#8B5CF6'}
                    color={c.contract_type === 'docs' ? '#2563EB' : '#7C3AED'}
                  >
                    {c.contract_type === 'docs' ? 'Документы' : 'Представление'}
                  </BadgeStatic>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>№{c.contract_number || c.id}</span>
                </Space>
              ))}
              {isAdmin && (
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => { setRegisterAppointment(row); setRegisterOpen(true); }}
                  style={{ fontSize: 12, padding: '0 8px', height: 24 }}
                >
                  Ещё договор
                </Button>
              )}
            </Space>
          );
        }
        if (isAdmin) {
          return (
            <Button size="small" type="primary" onClick={() => { setRegisterAppointment(row); setRegisterOpen(true); }}>
              Зарегистрировать
            </Button>
          );
        }
        return <span style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic' }}>Не зарегистрирован</span>;
      },
    },
  ];

  /* ─── existing table columns ─── */
  const existingCols: ColumnsType<ExistingVisit> = [
    { title: 'ФИО клиента', dataIndex: 'client_name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: 'Дата и время прихода', dataIndex: 'visited_at', key: 'dt', width: 180, render: (v: string) => fmtDT(v) },
    { title: 'К сотруднику', dataIndex: 'employee_name', key: 'emp', width: 180, render: (v: string) => v || '—' },
    { title: 'Комментарий', dataIndex: 'comment', key: 'comm', render: (v: string) => v || '—' },
  ];

  const assignedEmployees = (row: PrimaryVisit) => {
    const assignedItems = [
      row.assigned_lawyer_id ? { value: row.assigned_lawyer_id, label: row.assigned_lawyer_name || `#${row.assigned_lawyer_id}` } : null,
      row.assigned_lawyer_id_2 ? { value: row.assigned_lawyer_id_2, label: row.assigned_lawyer_name_2 || `#${row.assigned_lawyer_id_2}` } : null,
    ].filter((item): item is { value: number; label: string } => item !== null);

    if (canAssignLawyer) {
      return (
        <div className="arrival-lawyer-control">
          <Select
            size="small"
            mode="multiple"
            labelInValue
            optionFilterProp="label"
            className="arrival-employee-select"
            placeholder="Не назначен"
            allowClear
            maxTagCount={0}
            maxTagPlaceholder={() => assignedItems.length === 1 ? '1 юрист' : `${assignedItems.length} юриста`}
            value={assignedItems}
            onChange={(items: { value: number; label: string }[]) => {
              const selected = items.map(item => item.value); if (selected.length > 2) { message.warning('Можно назначить не более двух юристов'); return; } handleAssignLawyers(row.id, selected);
            }}
            options={employees.map(employee => ({ value: employee.id, label: employee.name }))}
          />
          {assignedItems.length > 0 && (
            <div className="arrival-lawyer-names">
              {assignedItems.map((item, index) => <span key={item.value}>{index + 1}. {item.label}</span>)}
            </div>
          )}
        </div>
      );
    }

    const names = [row.assigned_lawyer_name, row.assigned_lawyer_name_2].filter(Boolean);
    return names.length ? <div className="arrival-lawyer-names">{names.map((name, index) => <span key={`${name}-${index}`}>{index + 1}. {name}</span>)}</div> : <span>Не назначен</span>;
  };

  const consultationResult = (row: PrimaryVisit) => {
    if (canSetResult) return (
      <div className="arrival-result-actions" aria-label="Результат консультации">
        <button type="button" className={row.consultation_result === 'contract_signed' ? 'is-success' : ''} onClick={() => handleSetResult(row, 'contract_signed')} disabled={resultUpdatingId === row.id} title="Договор заключён" aria-label="Договор заключён" aria-pressed={row.consultation_result === 'contract_signed'}><CheckCircleFilled /></button>
        <button type="button" className={row.consultation_result === 'not_signed' ? 'is-danger' : ''} onClick={() => handleSetResult(row, 'not_signed')} disabled={resultUpdatingId === row.id || (row.linked_contracts || []).length > 0} title={(row.linked_contracts || []).length ? 'Нельзя изменить: договор уже зарегистрирован' : 'Договор не заключён'} aria-label="Договор не заключён" aria-pressed={row.consultation_result === 'not_signed'}><CloseCircleFilled /></button>
      </div>
    );
    if (row.consultation_result === 'contract_signed') return <CheckCircleFilled className="arrival-result-static is-success" title="Договор заключён" />;
    if (row.consultation_result === 'not_signed') return <CloseCircleFilled className="arrival-result-static is-danger" title="Договор не заключён" />;
    return null;
  };

  const contractAction = (row: PrimaryVisit) => {
    if (row.consultation_result !== 'contract_signed') return null;
    const contracts = row.linked_contracts || [];
    if (contracts.length) {
      return (
        <div className="arrival-contracts">
          {contracts.map(contract => (
            <span
              key={contract.id}
              className="arrival-contract-number"
              title={`${contract.contract_type === 'docs' ? 'Документы' : 'Представление'} · №${contract.contract_number || contract.id}`}
            >
              №{contract.contract_number || contract.id}
            </span>
          ))}
          {isAdmin && (
            <Button className="arrival-contract-more" size="small" type="text" icon={<PlusOutlined />} onClick={() => { setRegisterAppointment(row); setRegisterOpen(true); }} title="Добавить ещё договор" aria-label="Добавить ещё договор" />
          )}
        </div>
      );
    }
    return isAdmin ? (
      <Button className="arrival-register-contract-btn" type="primary" icon={<FileDoneOutlined />} onClick={() => { setRegisterAppointment(row); setRegisterOpen(true); }} title="Зарегистрировать договор" aria-label="Зарегистрировать договор" />
    ) : null;
  };

  return (
    <Page className="lt-page lt-page-arrivals">
      <div className="lt-page-heading">
        <div>
          <h1>Приходы</h1>
          <p>Фактические визиты клиентов и результат консультаций</p>
        </div>
      </div>
      <div className="arrival-topbar">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'primary', label: `Первичные (${primaryByDay.length})` },
            { key: 'existing', label: `Действующие клиенты (${existingByDay.length})` },
          ]}
        />
        <div className="arrival-control-row">
          <div className="arrival-topbar-date">{DateNav}</div>
          <Button className="arrival-topbar-add" type="primary" icon={<PlusOutlined />} onClick={() => {
            if (tab === 'primary') { setNewPrimary(f => ({ ...f, date: selectedDate })); setNewPrimaryModal(true); }
            else setShowForm(v => !v);
          }}>{tab === 'existing' && showForm ? 'Отменить' : 'Добавить приход'}</Button>
        </div>
      </div>

      {/* ─── Primary ─── */}
      {tab === 'primary' && (
        <>
          {loadError && <Alert type="error" showIcon message={loadError} closable onClose={() => setLoadError(null)} style={{ marginBottom: 12 }} />}
          {loading && primaryVisits.length === 0 ? (
            <TableSkeleton rows={5} cols={4} />
          ) : primaryByDay.length ? (
            <div className="arrival-cards-list">
              {primaryByDay.map(row => (
                <div
                  key={row.id}
                  className="apt-card arrival-card"
                >
                  <div className="apt-card-time">
                    <span className="apt-card-time-value">{fmtArrivedTime(row.arrived_at, row.appointment_time)}</span>
                    <span className="apt-card-time-date">{fmtDate(row.appointment_date)}</span>
                  </div>
                  <div className="apt-card-body">
                    <div className="apt-card-row-main">
                      <div className="apt-card-avatar">{getInitials(row.client_name)}</div>
                      <div className="apt-card-client">
                        <span className="apt-card-client-name">{row.client_name}</span>
                        <span className="apt-card-client-phone">{row.client_phone || 'Не указано'}</span>
                      </div>
                      {row.consultation_result === 'not_signed' && ['director','manager','okk'].includes(String(user?.role || '').toLowerCase()) && (
                        <button
                          type="button"
                          className="arrival-analysis-trigger"
                          onClick={() => setAnalysisVisit(row)}
                          title="Разобрать консультацию"
                          aria-label={`Разобрать консультацию: ${row.client_name}`}
                        >
                          <FileSearchOutlined />
                        </button>
                      )}
                    </div>
                    <div className="apt-card-details">
                      <div className="apt-card-field apt-card-field-small"><span className="apt-card-field-label">Источник</span><span className="apt-card-field-text">{row.source || 'Не указано'}</span></div>
                      <div className="apt-card-field apt-card-field-small"><span className="apt-card-field-label">Оператор</span><span className="apt-card-field-text">{row.operator_name || 'Не указано'}</span></div>
                      <div className="apt-card-field apt-card-field-lawyer"><span className="apt-card-field-label">Юрист</span>{assignedEmployees(row)}</div>
                      {row.comment && <div className="apt-card-field apt-card-field-comment"><span className="apt-card-field-label">Комментарий</span><span className="apt-card-field-text apt-card-comment-full">{row.comment}</span></div>}
                    </div>
                    {contractAction(row)}
                  </div>
                  <div className="apt-card-right arrival-card-side" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <div className="arrival-result-actions">{consultationResult(row)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="arrival-empty-card">
              <EmptyState
                title="Нет первичных приходов за этот день"
                description="Выберите другой день стрелками или календарём выше."
              />
            </div>
          )}
        </>
      )}

      {/* ─── Existing ─── */}
      {tab === 'existing' && (
        <>
          {showForm && (
            <FormCard>
              <FormField style={{ minWidth: 240 }}>
                <label>ФИО клиента *</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Иванов Иван Иванович" />
              </FormField>
              <FormField>
                <label>К какому сотруднику</label>
                <Select
                  allowClear
                  placeholder="Не указано"
                  value={formEmployee}
                  onChange={(val: number | null) => setFormEmployee(val)}
                  options={employees.map(e => ({ value: e.id, label: e.name }))}
                  style={{ width: '100%' }}
                />
              </FormField>
              <FormField>
                <label>Комментарий</label>
                <Input value={formComment} onChange={e => setFormComment(e.target.value)} placeholder="Необязательно" />
              </FormField>
              <Button type="primary" loading={submitting} onClick={handleAddExisting}>Сохранить</Button>
            </FormCard>
          )}

          {loading && existingVisits.length === 0 ? (
            <TableSkeleton rows={5} cols={3} />
          ) : existingByDay.length ? (
            <div className="arrival-cards-list">
              {existingByDay.map(row => (
                <article className="apt-card arrival-card arrival-card--existing" key={row.id}>
                  <div className="arrival-card-time">
                    <strong>{dayjs(row.visited_at).format('HH:mm')}</strong>
                    <span>{dayjs(row.visited_at).format('DD.MM.YYYY')}</span>
                  </div>
                  <div className="arrival-card-main">
                    <div className="arrival-card-client">
                      <span className="apt-card-avatar">{getInitials(row.client_name)}</span>
                      <div>
                        <h3>{row.client_name}</h3>
                        <span>Действующий клиент</span>
                      </div>
                    </div>
                    <div className="arrival-card-details">
                      <div>
                        <small>К сотруднику</small>
                        <span>{row.employee_name || 'Не указан'}</span>
                      </div>
                      <div>
                        <small>Добавил</small>
                        <span>{row.created_by_name || 'Не указан'}</span>
                      </div>
                      {row.comment && (
                        <div className="arrival-card-comment">
                          <small>Комментарий</small>
                          <span>{row.comment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="arrival-empty-card">
              <EmptyState
                title="Нет приходов действующих клиентов за этот день"
                description="Добавьте приход кнопкой выше или выберите другой день."
              />
            </div>
          )}
        </>
      )}

      {/* Новый первичный приход (новый клиент) */}
      <Modal
        title="Добавить приход"
        className="arrival-create-modal unified-form-modal"
        open={newPrimaryModal}
        onCancel={() => setNewPrimaryModal(false)}
        onOk={handleCreatePrimary}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={creatingPrimary}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>ФИО клиента *</div>
            <Input value={newPrimary.client_name} onChange={e => setNewPrimary(f => ({ ...f, client_name: e.target.value }))} placeholder="Иванов Иван Иванович" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Телефон</div>
            <Input value={newPrimary.client_phone} onChange={e => setNewPrimary(f => ({ ...f, client_phone: formatRussianPhone(e.target.value) }))} placeholder="+7 (___) ___-__-__" maxLength={18} inputMode="tel" />
          </div>
          <div className="unified-date-time-row" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Дата</div>
              <DatePicker value={newPrimary.date} onChange={d => setNewPrimary(f => ({ ...f, date: d || dayjs() }))} format="DD.MM.YYYY" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Время</div>
              <TimePicker value={newPrimary.time} onChange={t => setNewPrimary(f => ({ ...f, time: t || dayjs() }))} format="HH:mm" style={{ width: '100%' }} minuteStep={5} />
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Комментарий</div>
            <Input.TextArea value={newPrimary.comment} onChange={e => setNewPrimary(f => ({ ...f, comment: e.target.value }))} placeholder="Тема консультации" rows={3} autoSize={{ minRows: 2, maxRows: 6 }} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Источник</div>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Выберите источник"
              value={newPrimary.source_id}
              onChange={v => setNewPrimary(f => ({ ...f, source_id: v }))}
              options={sources.map(source => ({ value: source.id, label: source.name }))}
              style={{ width: '100%' }}
            />
          </div>
          {canAssignLawyer && (
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Юристы на консультации (до 2)</div>
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                maxCount={2}
                maxTagCount={2}
                placeholder="Не назначены"
                value={newPrimary.assigned_lawyer_ids}
                onChange={(ids: number[]) => setNewPrimary(f => ({ ...f, assigned_lawyer_ids: ids.slice(0, 2) }))}
                options={employees.map(e => ({ value: e.id, label: e.name }))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Contract Registration Modal */}
      <AdminContractRegister
        open={registerOpen}
        onClose={() => { setRegisterOpen(false); setRegisterAppointment(null); }}
        onSuccess={() => { fetchPrimary(); fetchStats(); }}
        appointmentData={registerAppointment ? {
          id: registerAppointment.id,
          client_name: registerAppointment.client_name,
          client_phone: registerAppointment.client_phone,
          comment: registerAppointment.comment,
          appointment_date: registerAppointment.appointment_date,
          assigned_lawyer_id: registerAppointment.assigned_lawyer_id,
          assigned_lawyer_id_2: registerAppointment.assigned_lawyer_id_2,
          assigned_lawyer_name: registerAppointment.assigned_lawyer_name,
          assigned_lawyer_name_2: registerAppointment.assigned_lawyer_name_2,
        } : null}
      />
          <ConsultationAnalysisModal open={!!analysisVisit} consultation={analysisVisit} onClose={() => setAnalysisVisit(null)} onSaved={fetchPrimary} />

</Page>
  );
};

export default Arrivals;
