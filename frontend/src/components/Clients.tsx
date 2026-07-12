import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import MobileMaterialUpload from './ui/MobileMaterialUpload';
import { useIsMobile } from '../shared/lib/useIsMobile';
import 'dayjs/locale/ru';
dayjs.locale('ru');

type DeadlineInfo = { key: 'green' | 'yellow' | 'orange' | 'red'; color: string; bg: string; label: string; icon: string };
function getDeadlineInfo(deadline?: string | null): DeadlineInfo | null {
  if (!deadline) return null;
  const d = dayjs(deadline).startOf('day');
  if (!d.isValid()) return null;
  const diff = d.diff(dayjs().startOf('day'), 'day');
  if (diff < 0) {
    const n = Math.abs(diff);
    const w = (n % 10 === 1 && n % 100 !== 11) ? 'день' : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'дня' : 'дней');
    return { key: 'red', color: '#dc2626', bg: '#fef2f2', label: `Просрочено (${n} ${w})`, icon: '🔴' };
  }
  if (diff === 0) return { key: 'orange', color: '#ea580c', bg: '#fff7ed', label: 'Сегодня', icon: '🟠' };
  if (diff === 1) return { key: 'yellow', color: '#ca8a04', bg: '#fefce8', label: 'Завтра', icon: '🟡' };
  return { key: 'green', color: '#16a34a', bg: '#f0fdf4', label: `До ${d.format('DD.MM.YYYY')}`, icon: '🟢' };
}
import {
  Table,
  Input,
  Button,
  Space,
  Tooltip,
  App,
  Empty,
  Tag,
  Modal,
  List,
  Upload,
  Popconfirm,
  Drawer,
  Timeline,
  Tabs,
  Descriptions,
  Spin,
  DatePicker,
  InputNumber,
  Result,
  Select,
  Checkbox,
  Progress,
  Image,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FileWordOutlined,
  DownloadOutlined,
  DeleteOutlined,
  UploadOutlined,
  SendOutlined,
  UserSwitchOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  FileOutlined,
  StopOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  EyeOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import {
  clientsApi,
  contractsApi,
  contractDocsApi,
  materialsApi,
  actsApi,
  cashRegisterApi,
  employeesApi,
  type CrmClient,
  type CrmContract,
  type CrmMaterial,
  type ContractDocument,
  type CrmAct,
  type CashStats,
  type CrmEmployee,
  type ContractHistoryEntry,
} from '../shared/api/crm';
import apiInstance from '../shared/api/instance';
import Documents from './Documents';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { buildApiUrl, getAuthHeaders, getAuthenticatedUrl } from '../shared/utils/apiUtils';

interface ClientsProps {
  onTabClick?: (tab: string) => void;
  onContractSelect?: (contractId: number) => void;
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 0 0;
`;

const ToolRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const TableCard = styled.div`
  border-radius: 8px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  padding: 8px 8px 4px;
  overflow: hidden;

  .ant-table-wrapper { background: transparent; }
  .ant-table { background: transparent; }
  .ant-table-thead > tr > th { background: var(--color-bg-alt) !important; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
  .ant-table-tbody > tr > td { background: var(--color-bg-elevated) !important; border-bottom: 1px solid var(--color-border); }
  .ant-table-tbody > tr:hover > td { background: var(--color-bg-hover) !important; }

  /* Цветовая индикация срока (роль Эксперт) */
  .ant-table-tbody > tr.deadline-green > td:first-child { box-shadow: inset 3px 0 0 #16a34a; }
  .ant-table-tbody > tr.deadline-yellow > td:first-child { box-shadow: inset 3px 0 0 #eab308; }
  .ant-table-tbody > tr.deadline-orange > td:first-child { box-shadow: inset 3px 0 0 #f97316; }
  .ant-table-tbody > tr.deadline-red > td:first-child { box-shadow: inset 3px 0 0 #ef4444; }
`;

const InfoBlock = styled.div`
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-alt);
  margin-bottom: 16px;
`;

const formatMoney = (value?: string | number | null) => {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

const CONTRACT_PREFIX = 'ДОГ-';
const contractNumber = (id: number, cn?: string | null) =>
  cn || `${CONTRACT_PREFIX}${String(id).padStart(8, '0')}`;

const extractTopic = (c: CrmContract): string => {
  const raw = c.title || c.description || '';
  if (!raw) return '—';
  const [topic] = raw.split(' - ');
  return (topic || raw).trim();
};

const shortName = (full?: string | null): string => {
  if (!full) return '—';
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const [last, first, middle] = parts;
  const initials = [first, middle].filter(Boolean).map((p) => `${p[0]}.`).join('');
  return `${last}${initials ? ' ' + initials : ''}`;
};

// «Юристы по делу»: один юрист или два (совместный договор, через « / »)
const lawyersLabel = (c?: Partial<CrmContract> | null): string => {
  if (!c) return '—';
  const first = shortName(c.lawyer_full_name || c.employee_name);
  if (c.is_joint && c.second_lawyer_full_name) {
    return `${first} / ${shortName(c.second_lawyer_full_name)}`;
  }
  return first;
};

type DealType = 'docs' | 'court_rep';
type ClientsView = 'contracts' | 'terminated';

interface ContractRow {
  contract: CrmContract;
  client: CrmClient | null;
  key: string;
}

interface Representative {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  office_id: number;
  cases_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  pending: 'orange',
  completed: 'blue',
  cancelled: 'red',
  draft: 'default',
  registered: 'cyan',
  terminated: 'red',
};

const Clients: React.FC<ClientsProps> = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const canAssignRep = ['director', 'manager', 'okk'].includes(user?.role || '');
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const isLawyer = user?.role === 'lawyer';
  const [data, setData] = useState<CrmClient[]>([]);
  const [contracts, setContracts] = useState<CrmContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const isMobile = useIsMobile();
  const [dealType, setDealType] = useState<DealType>('docs');
  useEffect(() => { if (user?.role === 'expert' && dealType !== 'docs') setDealType('docs'); }, [user?.role, dealType]);
  const [view, setView] = useState<ClientsView>('contracts');

  // Date filter (как в Записях)
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [calOpen, setCalOpen] = useState(false);
  const todayStr = dayjs().format('YYYY-MM-DD');


  // Cash statistics
  const [cashStats, setCashStats] = useState<CashStats | null>(null);
  const [cashStatsDate, setCashStatsDate] = useState<dayjs.Dayjs>(dayjs());

  // Assign to representative
  const [assignModal, setAssignModal] = useState<{ open: boolean; contract: CrmContract | null }>({ open: false, contract: null });
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [repsLoading, setRepsLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<CrmContract | null>(null);
  // Совместный договор: история изменений состава юристов + редактирование
  const [contractHistory, setContractHistory] = useState<ContractHistoryEntry[]>([]);
  const [officeLawyers, setOfficeLawyers] = useState<{ id: number; name: string }[]>([]);
  const [editJoint, setEditJoint] = useState(false);
  const [editSecondLawyer, setEditSecondLawyer] = useState<number | null>(null);
  const [savingLawyers, setSavingLawyers] = useState(false);
  const [detailClient, setDetailClient] = useState<CrmClient | null>(null);
  const [detailTab, setDetailTab] = useState('info');

  // Document types for the contract info tab
  const DOCUMENT_TYPE_OPTIONS = [
    'Претензия',
    'Жалоба в Прокуратуру',
    'Жалоба в Роспотребнадзор',
    'Жалоба в Трудовую Инспекцию',
    'Исковое заявление',
  ];
  const CUSTOM_DOCS_LIMIT = 15;
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [docTypesSaving, setDocTypesSaving] = useState(false);
  const [docTypesChanged, setDocTypesChanged] = useState(false);
  const [customDocs, setCustomDocs] = useState<string[]>([]);
  const [newCustomDoc, setNewCustomDoc] = useState('');
  const [circumstances, setCircumstances] = useState('');
  const [cardExpertId, setCardExpertId] = useState<number | null>(null);
  const [cardDataChanged, setCardDataChanged] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const [cardCustomerGoal, setCardCustomerGoal] = useState('');
  const [cardLegalCostComp, setCardLegalCostComp] = useState<string>('');
  const [cardMoralComp, setCardMoralComp] = useState<string>('');
  const [cardSaving, setCardSaving] = useState(false);

  // Expert documents (inside detail drawer)
  const [docsList, setDocsList] = useState<ContractDocument[]>([]);
  const [caseActions, setCaseActions] = useState<Array<{ id: number; action_type: string; description: string | null; action_date: string; created_at: string; user_name: string | null; }>>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Materials (inside detail drawer)
  const [contractMaterials, setContractMaterials] = useState<CrmMaterial[]>([]);
  const [contractMaterialsLoading, setContractMaterialsLoading] = useState(false);
  const [materialUploading, setMaterialUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Supplement form (дополнение данных после регистрации администратором)
  const [supplementForm, setSupplementForm] = useState<{
    title: string;
    customer_goal: string;
    situation_description: string;
    expert_id: number | null;
    expert_deadline_days: number | null;
    legal_cost_comp: string;
    moral_comp: string;
  }>({ title: '', customer_goal: '', situation_description: '', expert_id: null, expert_deadline_days: null, legal_cost_comp: '', moral_comp: '' });
  const [supplementSaving, setSupplementSaving] = useState(false);
  const [experts, setExperts] = useState<CrmEmployee[]>([]);

  // Termination
  const [terminatedContracts, setTerminatedContracts] = useState<CrmContract[]>([]);
  const [terminatedLoading, setTerminatedLoading] = useState(false);
  const [contractActs, setContractActs] = useState<CrmAct[]>([]);
  const [contractActsLoading, setContractActsLoading] = useState(false);
  const [terminateForm, setTerminateForm] = useState<{
    terminated_at: dayjs.Dayjs;
    termination_reason: string;
    refund_amount: number;
    refund_deadline: dayjs.Dayjs | null;
  }>({ terminated_at: dayjs(), termination_reason: '', refund_amount: 0, refund_deadline: null });
  const [terminating, setTerminating] = useState(false);
  const canConfirmRefund = ['director', 'manager', 'okk'].includes(user?.role || '');
  const canTerminate = ['director', 'manager', 'okk'].includes(user?.role || '');

  const clientsInitRef = React.useRef(true);
  const load = useCallback(async () => {
    if (clientsInitRef.current) setLoading(true);
    try {
      const [list, contractsList] = await Promise.all([
        clientsApi.list(),
        contractsApi.list().catch(() => [] as CrmContract[]),
      ]);
      setData(Array.isArray(list) ? list : []);
      setContracts(Array.isArray(contractsList) ? contractsList : []);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || 'Не удалось загрузить клиентов');
    } finally {
      if (clientsInitRef.current) { setLoading(false); clientsInitRef.current = false; }
    }
  }, [message]);

  const loadCashStats = useCallback(async (date: dayjs.Dayjs) => {
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const stats = await cashRegisterApi.stats({ date_from: dateStr, date_to: dateStr });
      setCashStats(stats);
    } catch {
      setCashStats(null);
    }
  }, []);

  useEffect(() => { load(); loadCashStats(cashStatsDate); }, [load, loadCashStats, cashStatsDate]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('contractCreated', handler);
    window.addEventListener('clientCreated', handler);
    return () => {
      window.removeEventListener('contractCreated', handler);
      window.removeEventListener('clientCreated', handler);
    };
  }, [load]);

  const loadTerminated = useCallback(async () => {
    setTerminatedLoading(true);
    try {
      const list = await contractsApi.listTerminated();
      setTerminatedContracts(Array.isArray(list) ? list : []);
    } catch {
      message.error('Не удалось загрузить расторгнутые договоры');
    } finally {
      setTerminatedLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (view === 'terminated') loadTerminated();
  }, [view, loadTerminated]);

  const loadContractActs = useCallback(async (contractId: number) => {
    setContractActsLoading(true);
    try {
      const list = await actsApi.listForContract(contractId);
      setContractActs(Array.isArray(list) ? list : []);
    } catch {
      setContractActs([]);
    } finally {
      setContractActsLoading(false);
    }
  }, []);

  const handleTerminate = async () => {
    if (!detailContract) return;
    setTerminating(true);
    try {
      await contractsApi.terminate(detailContract.id, {
        terminated_at: terminateForm.terminated_at.format('YYYY-MM-DD'),
        termination_reason: terminateForm.termination_reason || undefined,
        refund_amount: terminateForm.refund_amount || 0,
        refund_deadline: terminateForm.refund_deadline?.format('YYYY-MM-DD'),
      });
      message.success('Договор расторгнут');
      closeDetail();
      load();
      if (view === 'terminated') loadTerminated();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка при расторжении');
    } finally {
      setTerminating(false);
    }
  };

  const handleConfirmRefund = async (contractId: number) => {
    try {
      await contractsApi.confirmRefund(contractId);
      message.success('Возврат подтверждён, касса обновлена');
      load();
      loadTerminated();
      if (detailContract?.id === contractId) {
        const updated = await contractsApi.list();
        const found = updated.find((c) => c.id === contractId);
        if (found) setDetailContract(found);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка при подтверждении возврата');
    }
  };

  const handleConfirmRemainder = async (contractId: number) => {
    try {
      await contractsApi.confirmRemainder(contractId);
      message.success('Оплата остатка подтверждена');
      load();
      // Refresh detail
      const updated = await contractsApi.getById(contractId);
      setDetailContract(updated);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка при подтверждении оплаты остатка');
    }
  };

  const clientsById = useMemo(() => {
    const m = new Map<number, CrmClient>();
    for (const c of data) m.set(c.id, c);
    return m;
  }, [data]);

  const rows = useMemo<ContractRow[]>(() => {
    const selDateStr = selectedDate.format('YYYY-MM-DD');
    return contracts
      .filter((c) => {
        const t = (c.contract_type || 'docs').toString();
        if (t !== dealType) return false;
        // Юрист видит свои договоры (включая совместные, где он второй юрист)
        if (isLawyer && user?.id && c.id_employee !== user.id
            && !(c.is_joint && c.second_employee_id === user.id)) return false;
        // Фильтр по дате (если включён)
        if (dateFilterEnabled) {
          const cd = (c.contract_date || '').toString().slice(0, 10);
          if (cd !== selDateStr) return false;
        }
        return true;
      })
      .map((c) => ({
        contract: c,
        client: c.id_client ? (clientsById.get(c.id_client) || null) : null,
        key: `c-${c.id}`,
      }));
  }, [contracts, clientsById, dealType, isLawyer, user, dateFilterEnabled, selectedDate]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    const qDigits = q.replace(/\D/g, '');
    const qLatinToCyr = q
      .replace(/dog/g, 'дог')
      .replace(/d/g, 'д').replace(/o/g, 'о').replace(/g/g, 'г');
    return rows.filter((r) => {
      const name = (r.client?.name || r.contract.client_name || '').toLowerCase();
      const phone = (r.client?.phone || r.contract.client_phone || '').toLowerCase();
      const num = contractNumber(r.contract.id, r.contract.contract_number).toLowerCase();
      if (name.includes(q)) return true;
      if (phone.includes(q)) return true;
      if (num.includes(q) || num.includes(qLatinToCyr)) return true;
      if (qDigits && phone.replace(/\D/g, '').includes(qDigits)) return true;
      if (qDigits && String(r.contract.id).padStart(8, '0').includes(qDigits)) return true;
      return false;
    });
  }, [rows, searchText]);

  const setDocsStatus = async (c: CrmContract, next: 'pending' | 'ready') => {
    if ((c.docs_status || 'pending') === next) return;
    const prevStatus = c.docs_status;
    // Оптимистично меняем статус в UI сразу, чтобы значение обновлялось без перезагрузки страницы
    setContracts((list) => list.map((x) => (x.id === c.id ? { ...x, docs_status: next } : x)));
    setDetailContract((dc) => (dc && dc.id === c.id ? { ...dc, docs_status: next } : dc));
    try {
      await contractsApi.update(c.id, {
        id_client: c.id_client,
        id_employee: c.id_employee,
        contract_date: c.contract_date,
        amount: c.amount,
        paid_amount: c.paid_amount,
        status: c.status,
        docs_status: next,
      });
      message.success(next === 'ready' ? 'Документы отмечены как готовые' : 'Документы отмечены как ожидающие');
    } catch (e: any) {
      // При ошибке откатываем оптимистичное изменение
      setContracts((list) => list.map((x) => (x.id === c.id ? { ...x, docs_status: prevStatus } : x)));
      setDetailContract((dc) => (dc && dc.id === c.id ? { ...dc, docs_status: prevStatus } : dc));
      message.error(e?.response?.data?.message || 'Не удалось обновить статус документов');
    }
  };

  // ===== Expert documents =====
  const loadCaseActions = useCallback(async (contractId: number) => {
    try {
      const res = await fetch(buildApiUrl(`/representative/cases/${contractId}/actions`), { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
      const json = await res.json();
      setCaseActions(Array.isArray(json?.data) ? json.data : []);
    } catch { setCaseActions([]); }
  }, []);

  const reloadDocs = useCallback(async (contractId: number) => {
    setDocsLoading(true);
    try {
      const arr = await contractDocsApi.list(contractId);
      setDocsList(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось загрузить документы');
    } finally {
      setDocsLoading(false);
    }
  }, [message]);

  const handleUploadDoc = async (file: File): Promise<boolean> => {
    if (!detailContract) return false;
    const ext = file.name.toLowerCase().match(/\.(docx?|DOCX?)$/);
    if (!ext) {
      message.error('Разрешены только .doc / .docx');
      return false;
    }
    setUploading(true);
    try {
      await contractDocsApi.upload(detailContract.id, file);
      message.success('Документ загружен');
      await reloadDocs(detailContract.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleRemoveDoc = async (doc: ContractDocument) => {
    if (!detailContract) return;
    try {
      await contractDocsApi.remove(detailContract.id, doc.id);
      message.success('Документ удалён');
      await reloadDocs(detailContract.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка удаления');
    }
  };

  const handleDownloadDoc = async (doc: ContractDocument) => {
    if (!detailContract) return;
    try {
      const resp = await apiInstance.get(
        `/contracts/${detailContract.id}/documents/${doc.id}/download`,
        { responseType: 'blob' }
      );
      const blob = resp.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || `document-${doc.id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось скачать файл');
    }
  };

  // ===== Materials =====
  const loadContractMaterials = useCallback(async (contractId: number) => {
    setContractMaterialsLoading(true);
    try {
      const list = await materialsApi.list({ contract_id: contractId });
      const filtered = (Array.isArray(list) ? list : []).filter(
        m => !(m.file_url || '').includes('contract-docs')
      );
      setContractMaterials(filtered);
    } catch (e: any) {
      console.error(e);
      message.error('Не удалось загрузить материалы');
    } finally {
      setContractMaterialsLoading(false);
    }
  }, [message]);

  const handleUploadMaterial = async (file: File): Promise<boolean> => {
    if (!detailContract) return false;
    setMaterialUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contract_id', String(detailContract.id));
      formData.append('category', 'Материал дела');

      const token = localStorage.getItem('token');
      const resp = await fetch(buildApiUrl('/materials/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as any).message || 'Ошибка загрузки');
      }

      message.success('Материал загружен');
      await loadContractMaterials(detailContract.id);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки материала');
    } finally {
      setMaterialUploading(false);
    }
    return false;
  };

  const handleRemoveMaterial = async (mat: CrmMaterial) => {
    try {
      await materialsApi.remove(mat.id);
      message.success('Материал удалён');
      if (detailContract) await loadContractMaterials(detailContract.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка удаления');
    }
  };

  // ===== Detail drawer =====
  const loadExperts = useCallback(async () => {
    try {
      const list = await employeesApi.list();
      const all = Array.isArray(list) ? list : [];
      setExperts(all.filter((e) => {
        const pos = String(e.position || '').toLowerCase();
        const role = String(e.user_role || '').toLowerCase();
        return role === 'expert' || pos.includes('эксперт');
      }));
    } catch {
      setExperts([]);
    }
  }, []);

  const loadContractHistory = useCallback(async (contractId: number) => {
    try {
      const h = await contractsApi.history(contractId);
      setContractHistory(Array.isArray(h) ? h : []);
    } catch {
      setContractHistory([]);
    }
  }, []);

  const loadOfficeLawyers = useCallback(async () => {
    try {
      const list = await employeesApi.list();
      const all = Array.isArray(list) ? list : [];
      setOfficeLawyers(all
        .filter((e) => {
          const role = String(e.user_role || '').toLowerCase();
          return ['lawyer', 'manager', 'okk'].includes(role);
        })
        .map((e) => {
          const roleLbl = { manager: 'менеджер', okk: 'ОКК', lawyer: 'юрист' }[String(e.user_role || '').toLowerCase()] || '';
          const name = `${e.last_name || ''} ${e.first_name || ''}`.trim() || String(e.id);
          return { id: e.id, name: roleLbl ? `${name} (${roleLbl})` : name };
        }));
    } catch {
      setOfficeLawyers([]);
    }
  }, []);

  const handleSaveLawyers = async () => {
    if (!detailContract) return;
    const c = detailContract;
    if (editJoint && (editSecondLawyer == null || editSecondLawyer === c.id_employee)) {
      message.error('Выберите второго юриста (отличного от первого)');
      return;
    }
    setSavingLawyers(true);
    try {
      await contractsApi.update(c.id, {
        // обязательные поля, чтобы не обнулить договор
        id_employee: c.id_employee,
        id_client: c.id_client,
        contract_date: c.contract_date,
        amount: c.amount,
        paid_amount: c.paid_amount,
        status: c.status,
        // состав юристов
        is_joint: editJoint,
        second_employee_id: editJoint ? editSecondLawyer : null,
      });
      message.success('Состав юристов обновлён');
      const updated = await contractsApi.getById(c.id);
      setDetailContract(updated);
      await loadContractHistory(c.id);
      const refreshed = await contractsApi.list();
      setContracts(refreshed);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка при сохранении состава юристов');
    } finally {
      setSavingLawyers(false);
    }
  };

  const openDetail = (contract: CrmContract, client: CrmClient | null) => {
    setDetailContract(contract);
    setDetailClient(client);
    setContractHistory([]);
    setEditJoint(!!contract.is_joint);
    setEditSecondLawyer(contract.second_employee_id ?? null);
    loadContractHistory(contract.id);
    if (['director', 'manager', 'okk'].includes(user?.role || '')) loadOfficeLawyers();
    const isOwner = !!(user?.id && contract.registered_by === user.id);
    setDetailTab(contract.needs_lawyer_input && !isAdmin && isOwner ? 'supplement' : 'info');
    setDetailOpen(true);
    setDocsList([]);
    setCaseActions([]);
    setContractMaterials([]);
    setContractActs([]);
    setTerminateForm({ terminated_at: dayjs(), termination_reason: '', refund_amount: 0, refund_deadline: null });
    setSupplementForm({
      title: contract.title || '',
      customer_goal: contract.customer_goal || '',
      situation_description: contract.situation_description || '',
      expert_id: contract.expert_id || null,
      expert_deadline_days: contract.expert_deadline_days || null,
      legal_cost_comp: '',
      moral_comp: '',
    });
    reloadDocs(contract.id);
    if ((contract.contract_type || 'docs') === 'court_rep') loadCaseActions(contract.id);
    else setCaseActions([]);
    loadContractMaterials(contract.id);
    loadContractActs(contract.id);
    // Initialize doc types
    const dtRaw = (contract as any).document_types;
    try {
      const parsed = typeof dtRaw === 'string' ? JSON.parse(dtRaw) : dtRaw;
      setSelectedDocTypes(Array.isArray(parsed) ? parsed : []);
    } catch { setSelectedDocTypes([]); }
    setDocTypesChanged(false);
    // Initialize custom documents
    const cdRaw = (contract as any).custom_documents;
    try {
      const parsed = typeof cdRaw === 'string' ? JSON.parse(cdRaw) : cdRaw;
      setCustomDocs(Array.isArray(parsed) ? parsed : []);
    } catch { setCustomDocs([]); }
    setCircumstances((contract as any).circumstances || '');
    setCardCustomerGoal((contract as any).customer_goal || '');
    setCardLegalCostComp(
      (contract as any).legal_cost_comp != null && (contract as any).legal_cost_comp !== ''
        ? String((contract as any).legal_cost_comp)
        : ''
    );
    setCardMoralComp(
      (contract as any).moral_comp != null && (contract as any).moral_comp !== ''
        ? String((contract as any).moral_comp)
        : ''
    );
    setCardExpertId(contract.expert_id || null);
    setCardTitle(contract.title || '');
    setNewCustomDoc('');
    setCardDataChanged(false);
    const isAssignedLawyer = user?.role === 'lawyer' && user?.id != null && (((contract as any).id_employee === user.id) || ((contract as any).expert_id === user.id));
    const isAssignedEmployee = user?.id != null && (contract as any).id_employee === user.id;
    const isManagement = ['director', 'manager', 'okk'].includes(user?.role || '');
    const canEditCard = isOwner || isAssignedLawyer || isAssignedEmployee || isManagement;
    if (canEditCard) loadExperts();
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailContract(null);
    setDetailClient(null);
    setDocsList([]);
    setContractMaterials([]);
    load();
  };

  // ===== Table columns =====
  const docsColumns: ColumnsType<ContractRow> = [
    {
      title: 'ФИО клиента',
      key: 'client_name',
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: r.contract.status === 'terminated' ? '#e74c3c' : 'var(--color-text)' }}>
          {r.client?.name || r.contract.client_name || '—'}
        </span>
      ),
      sorter: (a, b) => (a.client?.name || '').localeCompare(b.client?.name || ''),
    },
    {
      title: 'Номер договора',
      key: 'contract_number',
      width: 160,
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{contractNumber(r.contract.id, r.contract.contract_number)}</span>,
    },
    {
      title: 'Тема',
      key: 'topic',
      render: (_, r) => <span>{extractTopic(r.contract)}</span>,
    },
    {
      title: 'Контакты',
      key: 'contacts',
      render: (_, r) => {
        const phone = r.client?.phone || r.contract.client_phone;
        return phone
          ? <span>{phone}</span>
          : <span style={{ color: 'var(--color-muted)' }}>—</span>;
      },
    },
    {
      title: 'Юрист',
      key: 'lawyer',
      render: (_, r) => {
        const base = isAdmin
          ? (r.contract.signed_by_name || r.contract.lawyer_full_name || r.contract.employee_name)
          : (r.contract.lawyer_full_name || r.contract.employee_name);
        const label = (r.contract.is_joint && r.contract.second_lawyer_full_name)
          ? `${shortName(base)} / ${shortName(r.contract.second_lawyer_full_name)}`
          : shortName(base);
        return <span>{label}</span>;
      },
    },
    ...(!isAdmin ? [{
      title: 'Эксперт',
      key: 'expert',
      render: (_: unknown, r: ContractRow) => {
        const name = r.contract.expert_full_name;
        if (!name) return <Tag color="default">не назначен</Tag>;
        return <span>{shortName(name)}</span>;
      },
    }] : []),
    {
      title: 'Сумма',
      key: 'amount',
      align: 'right',
      width: 130,
      render: (_, r) => <span style={{ fontWeight: 600 }}>{formatMoney(r.contract.amount)}</span>,
      sorter: (a, b) => parseFloat(String(a.contract.amount || 0)) - parseFloat(String(b.contract.amount || 0)),
    },
    {
      title: 'Внесено',
      key: 'paid',
      align: 'right',
      width: 130,
      render: (_, r) => <span>{formatMoney(r.contract.paid_amount)}</span>,
      sorter: (a, b) => parseFloat(String(a.contract.paid_amount || 0)) - parseFloat(String(b.contract.paid_amount || 0)),
    },
    {
      title: '',
      key: 'needs_input',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, r: ContractRow) => {
        if (!r.contract.needs_lawyer_input) return null;
        // Администратор не видит функцию "Дополнить" — только сотрудник, заключивший договор
        if (isAdmin) return null;
        return (
          <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ margin: 0, cursor: 'pointer' }}>
            Дополнить
          </Tag>
        );
      },
    },
    ...(!isAdmin ? [{
      title: 'Срок выполнения',
      key: 'expert_deadline',
      width: 170,
      align: 'center' as const,
      sorter: (a: ContractRow, b: ContractRow) => {
        const va = a.contract.expert_deadline ? dayjs(a.contract.expert_deadline).valueOf() : Number.POSITIVE_INFINITY;
        const vb = b.contract.expert_deadline ? dayjs(b.contract.expert_deadline).valueOf() : Number.POSITIVE_INFINITY;
        return va - vb;
      },
      render: (_: unknown, r: ContractRow) => {
        const info = getDeadlineInfo(r.contract.expert_deadline);
        if (!info) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, background: info.bg, color: info.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {info.icon} {info.label}
          </span>
        );
      },
    }] : []),
    ...(!isAdmin ? [{
      title: 'Статус документов',
      key: 'docs_status',
      width: 170,
      align: 'center' as const,
      render: (_: unknown, r: ContractRow) => {
        const ready = r.contract.docs_status === 'ready';
        return (
          <Select
            size="small"
            value={ready ? 'ready' : 'pending'}
            onClick={(e) => e.stopPropagation()}
            onChange={(val) => setDocsStatus(r.contract, val as 'pending' | 'ready')}
            style={{ width: 168 }}
            options={[
              { value: 'pending', label: <span style={{ color: '#D97706', fontWeight: 500 }}>⏳ Ожидание</span> },
              { value: 'ready', label: <span style={{ color: '#059669', fontWeight: 500 }}>✓ Документы готовы</span> },
            ]}
          />
        );
      },
    }] : []),
    ...(isAdmin ? [{
      title: '',
      key: 'admin_actions',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, r: ContractRow) => (
        <Popconfirm
          title="Удалить договор?"
          description="Это действие необратимо"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={async (e) => {
            e?.stopPropagation();
            try {
              await contractsApi.remove(r.contract.id);
              message.success('Договор удалён');
              load();
            } catch {
              message.error('Ошибка при удалении');
            }
          }}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Button danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      ),
    }] : []),
  ];

  const courtColumns: ColumnsType<ContractRow> = [
    {
      title: 'ФИО клиента',
      key: 'client_name',
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: r.contract.status === 'terminated' ? '#e74c3c' : undefined }}>{r.client?.name || r.contract.client_name || '—'}</span>
      ),
    },
    { title: 'Номер договора', key: 'num', render: (_, r) => contractNumber(r.contract.id, r.contract.contract_number) },
    { title: 'Тема', key: 'topic', render: (_, r) => extractTopic(r.contract) },
    {
      title: 'Контакты',
      key: 'contacts',
      render: (_, r) => r.client?.phone || r.contract.client_phone || '—',
    },
    { title: 'Юрист', key: 'lawyer', render: (_, r) => lawyersLabel(r.contract) },
    { title: 'Сумма', key: 'amount', align: 'right', render: (_, r) => formatMoney(r.contract.amount) },
    { title: 'Внесено', key: 'paid', align: 'right', render: (_, r) => formatMoney(r.contract.paid_amount) },
    {
      title: '',
      key: 'needs_input',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, r: ContractRow) => {
        if (!r.contract.needs_lawyer_input) return null;
        // Администратор не видит функцию "Дополнить"
        if (isAdmin) return null;
        return (
          <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ margin: 0, cursor: 'pointer' }}>
            Дополнить
          </Tag>
        );
      },
    },
    ...(canAssignRep ? [{
      title: 'Представитель',
      key: 'assign_rep',
      width: 180,
      render: (_: unknown, r: ContractRow) => (
        <Button
          type="primary"
          size="small"
          icon={<SendOutlined />}
          onClick={(e) => { e.stopPropagation(); openAssignModal(r.contract); }}
        >
          Передать
        </Button>
      ),
    }] : []),
    ...(isAdmin ? [{
      title: '',
      key: 'admin_actions',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, r: ContractRow) => (
        <Popconfirm
          title="Удалить договор?"
          description="Это действие необратимо"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={async (e) => {
            e?.stopPropagation();
            try {
              await contractsApi.remove(r.contract.id);
              message.success('Договор удалён');
              load();
            } catch {
              message.error('Ошибка при удалении');
            }
          }}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Button danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      ),
    }] : []),
  ];

  // ТЗ: только docs-контракты
  const tzRows = useMemo<ContractRow[]>(() => {
    return contracts
      .filter((c) => (c.contract_type || 'docs').toString() === 'docs')
      .map((c) => ({
        contract: c,
        client: c.id_client ? (clientsById.get(c.id_client) || null) : null,
        key: `tz-${c.id}`,
      }));
  }, [contracts, clientsById]);

  const tzColumns: ColumnsType<ContractRow> = [
    {
      title: '№ договора',
      key: 'num',
      width: 150,
      render: (_, r) => contractNumber(r.contract.id, r.contract.contract_number),
    },
    {
      title: 'Клиент',
      key: 'client',
      render: (_, r) => (
        <span style={{ fontWeight: 600 }}>{r.client?.name || r.contract.client_name || '—'}</span>
      ),
    },
    {
      title: 'Цель заказчика',
      key: 'goal',
      render: (_, r) => r.contract.customer_goal || <span style={{ color: 'var(--color-muted)' }}>—</span>,
    },
    {
      title: 'Описание ситуации',
      key: 'situation',
      ellipsis: true,
      render: (_, r) => r.contract.situation_description
        ? <Tooltip title={r.contract.situation_description}>
            <span>{String(r.contract.situation_description).slice(0, 120)}{String(r.contract.situation_description).length > 120 ? '…' : ''}</span>
          </Tooltip>
        : <span style={{ color: 'var(--color-muted)' }}>—</span>,
    },
    {
      title: 'Дедлайн',
      key: 'deadline',
      width: 110,
      align: 'right',
      render: (_, r) => {
        const d = r.contract.expert_deadline_days;
        return typeof d === 'number' && d > 0 ? `${d} дн.` : <span style={{ color: 'var(--color-muted)' }}>—</span>;
      },
    },
    {
      title: 'Эксперт',
      key: 'expert',
      render: (_, r) => shortName(r.contract.expert_full_name),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 140,
      render: (_, r) => (
        r.contract.docs_status === 'ready'
          ? <span style={{ padding: '2px 10px', borderRadius: 999, background: '#F0FDF4', color: '#059669', fontSize: 12, fontWeight: 500 }}>Готовы</span>
          : <span style={{ padding: '2px 10px', borderRadius: 999, background: '#FFF7ED', color: '#D97706', fontSize: 12, fontWeight: 500 }}>Ожидание</span>
      ),
    },
  ];

  // Assign representative
  const openAssignModal = async (contract: CrmContract) => {
    setAssignModal({ open: true, contract });
    setRepsLoading(true);
    try {
      const res = await fetch(buildApiUrl('/representative/list'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setRepresentatives(data.data);
      } else {
        message.error(data.message || 'Не удалось загрузить представителей');
      }
    } catch {
      message.error('Ошибка загрузки представителей');
    } finally {
      setRepsLoading(false);
    }
  };

  const handleAssign = async (repId: number) => {
    if (!assignModal.contract) return;
    setAssigning(true);
    try {
      const res = await fetch(buildApiUrl(`/representative/cases/${assignModal.contract.id}/assign`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ representative_id: repId }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(`Дело передано представителю: ${data.data.representative_name}`);
        setAssignModal({ open: false, contract: null });
        load();
      } else {
        message.error(data.message || 'Ошибка назначения');
      }
    } catch {
      message.error('Ошибка при передаче дела');
    } finally {
      setAssigning(false);
    }
  };

  // ===== Document types handlers =====
  const toggleDocType = (type: string) => {
    setSelectedDocTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      setDocTypesChanged(true);
      return next;
    });
  };

  const saveCardData = async () => {
    if (!detailContract) return;
    setCardSaving(true);
    try {
      await apiInstance.patch(`/contracts/${detailContract.id}/card-data`, {
        document_types: selectedDocTypes,
        custom_documents: customDocs,
        circumstances: circumstances,
        expert_id: cardExpertId,
        title: cardTitle,
        customer_goal: cardCustomerGoal,
        legal_cost_comp: cardLegalCostComp === '' ? null : Number(cardLegalCostComp),
        moral_comp: cardMoralComp === '' ? null : Number(cardMoralComp),
      });
      message.success('Данные сохранены');
      setDocTypesChanged(false);
      setCardDataChanged(false);
      // Обновляем detailContract чтобы при следующем сохранении не затереть данные
      try {
        const updated = await contractsApi.getById(detailContract.id);
        if (updated) setDetailContract(updated);
      } catch {}
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setCardSaving(false);
    }
  };

  // ===== Render helper: Detail drawer tab contents =====
  const isDocsType = (detailContract?.contract_type || 'docs') === 'docs';

  const renderInfoTab = () => {
    if (!detailContract) return null;
    const c = detailContract;
    const cl = detailClient;
    const remaining = (parseFloat(String(c.amount || 0)) - parseFloat(String(c.paid_amount || 0)));
    const isContractOwner = !!(user?.id && c.registered_by === user.id);
    const isAssignedLawyer = user?.role === 'lawyer' && user?.id != null && ((detailContract as any).id_employee === user.id || (detailContract as any).expert_id === user.id);
    const isAssignedEmployee = user?.id != null && (detailContract as any).id_employee === user.id;
    const isManagement = ['director', 'manager', 'okk'].includes(user?.role || '');
    const canEditCard = isContractOwner || isAssignedLawyer || isAssignedEmployee || isManagement;
    const canAssignExpert = ['director', 'manager', 'okk'].includes(user?.role || '');
    const canEditLawyers = ['director', 'manager', 'okk'].includes(user?.role || '');
    const lawyerOptions = officeLawyers.filter((l) => l.id !== c.id_employee);
    const lawyersComposChanged = (editJoint ? 1 : 0) !== (c.is_joint ? 1 : 0)
      || (editJoint ? (editSecondLawyer ?? null) : null) !== (c.second_employee_id ?? null);
    const hasChanges = docTypesChanged || cardDataChanged;

    // ── Исполнение договора ──
    const actsCompletedSum = contractActs
      .filter((a) => a.status === 'confirmed')
      .reduce((s, a) => s + (typeof a.amount === 'string' ? parseFloat(a.amount) : (a.amount || 0)), 0);
    const actsTotalSum = contractActs
      .reduce((s, a) => s + (typeof a.amount === 'string' ? parseFloat(a.amount) : (a.amount || 0)), 0);
    const contractTotal = parseFloat(String(c.amount || 0));
    const actsRemaining = Math.max(0, contractTotal - actsTotalSum);
    const executionPercent = contractTotal > 0 ? Math.min(100, Math.round((actsTotalSum / contractTotal) * 100)) : 0;
    const isFullyExecuted = contractTotal > 0 && actsTotalSum >= contractTotal;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Блок «Исполнение договора» ── */}
        {contractTotal > 0 && (
          <div style={{
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: 16,
            background: isFullyExecuted ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'var(--color-bg-alt)',
          }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileDoneOutlined style={{ color: isFullyExecuted ? '#16a34a' : '#1677ff' }} />
              Исполнение договора
              {isFullyExecuted && (
                <Tag color="green" style={{ marginLeft: 'auto', fontSize: 12 }}>
                  <CheckCircleFilled style={{ marginRight: 4 }} />
                  Договор исполнен полностью
                </Tag>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 2 }}>Стоимость договора</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{formatMoney(contractTotal)}</div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 2 }}>Выполнено работ</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1677ff' }}>{formatMoney(actsTotalSum)}</div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 2 }}>Остаток</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: isFullyExecuted ? '#16a34a' : '#e74c3c' }}>{formatMoney(actsRemaining)}</div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 2 }}>Исполнение</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{executionPercent}%</div>
              </div>
            </div>
            <Progress
              percent={executionPercent}
              strokeColor={isFullyExecuted ? '#16a34a' : { from: '#1677ff', to: '#69b1ff' }}
              trailColor="var(--color-border)"
              size={['100%', 12]}
              showInfo={false}
              style={{ marginBottom: 0 }}
            />
          </div>
        )}

        <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 200 }}>
          <Descriptions.Item label="ФИО клиента">{cl?.name || c.client_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Тема">
            {canEditCard ? (
              <Input
                value={cardTitle}
                onChange={(e) => { setCardTitle(e.target.value); setCardDataChanged(true); }}
                placeholder="Тема договора"
                size="small"
                style={{ width: '100%' }}
              />
            ) : (
              extractTopic(c)
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Тип договора">
            <Tag color={isDocsType ? 'blue' : 'purple'}>
              {isDocsType ? 'Подготовка документов' : 'Представительство в суде'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Дата договора">
            {c.contract_date ? new Date(c.contract_date).toLocaleDateString('ru-RU') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Сумма договора">
            <span style={{ fontWeight: 600, fontSize: 15 }}>{formatMoney(c.amount)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Внесено">
            <span style={{ color: '#3aa56b', fontWeight: 600 }}>{formatMoney(c.paid_amount)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Остаток">
            <span style={{ color: remaining > 0 ? '#e74c3c' : '#3aa56b', fontWeight: 600 }}>
              {formatMoney(remaining)}
            </span>
          </Descriptions.Item>
          {(c as any).additional_payment_date && (
            <Descriptions.Item label="Дата внесения остатка">
              {new Date((c as any).additional_payment_date).toLocaleDateString('ru-RU')}
            </Descriptions.Item>
          )}
          {remaining > 0 && (c as any).additional_payment_date && (
            <Descriptions.Item label="Оплата остатка">
              {(c as any).remainder_confirmed
                ? <Tag color="green">Оплачено{(c as any).remainder_confirmed_by_name ? ` (${(c as any).remainder_confirmed_by_name})` : ''}</Tag>
                : <Tag color="orange">Ожидает оплаты</Tag>}
            </Descriptions.Item>
          )}
          {(c as any).remainder_confirmed && (
            <Descriptions.Item label="Оплата остатка">
              <Tag color="green">Оплачено{(c as any).remainder_confirmed_by_name ? ` (${(c as any).remainder_confirmed_by_name})` : ''}</Tag>
            </Descriptions.Item>
          )}
          <Descriptions.Item label={(editJoint || (c.is_joint && c.second_lawyer_full_name)) ? "Юристы по делу" : "Юрист"}>
            {canEditLawyers ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span>{shortName(c.lawyer_full_name || c.employee_name || '') || '—'}{editJoint && editSecondLawyer ? ` / ${(lawyerOptions.find((l) => l.id === editSecondLawyer)?.name) || (c.second_lawyer_full_name || '')}` : ''}</span>
                <Checkbox
                  checked={editJoint}
                  onChange={(e) => { setEditJoint(e.target.checked); if (!e.target.checked) setEditSecondLawyer(null); }}
                >
                  Совместный договор
                </Checkbox>
                {editJoint && (
                  <Select
                    value={editSecondLawyer ?? undefined}
                    onChange={(v) => setEditSecondLawyer(v)}
                    placeholder="Второй сотрудник"
                    size="small"
                    style={{ width: '100%', minWidth: 200 }}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={lawyerOptions.map((l) => ({ value: l.id, label: l.name }))}
                    notFoundContent="Нет сотрудников"
                  />
                )}
                {lawyersComposChanged && (
                  <Button type="primary" size="small" loading={savingLawyers} onClick={handleSaveLawyers} style={{ alignSelf: 'flex-start' }}>
                    Сохранить юристов
                  </Button>
                )}
              </div>
            ) : (
              lawyersLabel(c)
            )}
          </Descriptions.Item>
          {isDocsType && (
            <Descriptions.Item label="Эксперт">
              {canAssignExpert ? (
                <Select
                  value={cardExpertId}
                  onChange={(v) => { setCardExpertId(v); setCardDataChanged(true); }}
                  placeholder="Выберите эксперта"
                  allowClear
                  size="small"
                  style={{ width: '100%', minWidth: 180 }}
                  options={experts.map((e) => ({
                    value: e.id,
                    label: `${e.last_name || ''} ${e.first_name || ''}`.trim(),
                  }))}
                  notFoundContent="Нет экспертов"
                />
              ) : (
                c.expert_full_name ? shortName(c.expert_full_name) : <Tag color="default">не назначен</Tag>
              )}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Статус документов">
            {c.docs_status === 'ready'
              ? <span style={{ padding: '2px 10px', borderRadius: 999, background: '#F0FDF4', color: '#059669', fontSize: 12, fontWeight: 500 }}>Готовы</span>
              : <span style={{ padding: '2px 10px', borderRadius: 999, background: '#FFF7ED', color: '#D97706', fontSize: 12, fontWeight: 500 }}>Ожидание</span>}
          </Descriptions.Item>
        </Descriptions>

        {contractHistory.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>История изменений</div>
            <Timeline
              items={contractHistory.map((h) => {
                const labels: Record<string, string> = {
                  second_lawyer_added: 'Добавлен второй юрист',
                  second_lawyer_removed: 'Удалён второй юрист',
                  second_lawyer_changed: 'Изменён второй юрист',
                };
                const when = h.created_at ? new Date(h.created_at).toLocaleString('ru-RU') : '';
                const detail = h.action === 'second_lawyer_removed'
                  ? `${h.old_value || '—'} → нет`
                  : h.action === 'second_lawyer_changed'
                    ? `${h.old_value || '—'} → ${h.new_value || '—'}`
                    : `${h.new_value || '—'}`;
                return {
                  key: h.id,
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{labels[h.action] || h.action}: {detail}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {when}{h.user_name ? ` · ${h.user_name}` : ''}
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </div>
        )}

        {canEditCard && (
          <>
            {isDocsType && (
              <>
            {/* ── Типы документов ── */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Типы документов</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {DOCUMENT_TYPE_OPTIONS.map(type => {
                      const active = selectedDocTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleDocType(type)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: active ? '2px solid #1677ff' : '1px solid var(--color-border)',
                            background: active ? 'var(--color-accent-light)' : 'var(--color-bg-elevated)',
                            color: active ? 'var(--color-accent)' : 'var(--color-text)',
                            cursor: 'pointer',
                            fontWeight: active ? 600 : 400,
                            fontSize: 13,
                            transition: 'all 0.2s',
                          }}
                        >
                          {active && '\u2713 '}{type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Дополнительные документы (ручной ввод до 20) ── */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                    Дополнительные документы ({customDocs.length}/20)
                  </div>
                  {customDocs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {customDocs.map((doc, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'var(--color-bg-elevated)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                          <span style={{ flex: 1, fontSize: 13 }}>{idx + 1}. {doc}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDocs(prev => prev.filter((_, i) => i !== idx));
                              setCardDataChanged(true);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>{customDocs.length}/{CUSTOM_DOCS_LIMIT}</div>
                {customDocs.length < CUSTOM_DOCS_LIMIT && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        value={newCustomDoc}
                        onChange={(e) => setNewCustomDoc(e.target.value)}
                        placeholder="Название документа"
                        size="small"
                        onPressEnter={() => {
                          const v = newCustomDoc.trim();
                          if (v && customDocs.length < CUSTOM_DOCS_LIMIT) {
                            setCustomDocs(prev => [...prev, v]);
                            setNewCustomDoc('');
                            setCardDataChanged(true);
                          }
                        }}
                      />
                      <Button
                        size="small"
                        type="dashed"
                        onClick={() => {
                          const v = newCustomDoc.trim();
                          if (v && customDocs.length < CUSTOM_DOCS_LIMIT) {
                            setCustomDocs(prev => [...prev, v]);
                            setNewCustomDoc('');
                            setCardDataChanged(true);
                          }
                        }}
                      >
                        Добавить
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── Цель и возмещения ── */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Цель заказчика</div>
                    <Input
                      value={cardCustomerGoal}
                      onChange={(e) => { setCardCustomerGoal(e.target.value); setCardDataChanged(true); }}
                      placeholder="Например: добиться возврата денежных средств"
                      maxLength={500}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Возмещение юридических расходов, ₽</div>
                      <InputNumber
                        min={0}
                        step={100}
                        value={cardLegalCostComp === '' ? null : Number(cardLegalCostComp)}
                        onChange={(v) => { setCardLegalCostComp(v == null ? '' : String(v)); setCardDataChanged(true); }}
                        placeholder="0"
                        style={{ width: '100%' }}
                        formatter={(v) => v == null || v === '' ? '' : Number(v).toLocaleString('ru-RU')}
                        parser={(v) => (v || '').replace(/[^0-9.]/g, '')}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Возмещение морального ущерба, ₽</div>
                      <InputNumber
                        min={0}
                        step={100}
                        value={cardMoralComp === '' ? null : Number(cardMoralComp)}
                        onChange={(v) => { setCardMoralComp(v == null ? '' : String(v)); setCardDataChanged(true); }}
                        placeholder="0"
                        style={{ width: '100%' }}
                        formatter={(v) => v == null || v === '' ? '' : Number(v).toLocaleString('ru-RU')}
                        parser={(v) => (v || '').replace(/[^0-9.]/g, '')}
                      />
                    </div>
                  </div>
                </div>

              </>
            )}
                        {/* ── Обстоятельства ── */}
            {!isAdmin && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Обстоятельства</div>
              <Input.TextArea
                value={circumstances}
                onChange={(e) => { setCircumstances(e.target.value); setCardDataChanged(true); }}
                rows={8}
                placeholder="Подробно опишите ситуацию клиента: что произошло, когда, чем закончилось, какие документы есть на руках"
                style={{ fontSize: 13 }}
              />
            </div>
            )}

            {/* ── Кнопки сохранения ── */}
            {hasChanges && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="primary" loading={cardSaving} onClick={saveCardData}>
                  Сохранить все изменения
                </Button>
                <Button onClick={() => {
                  const dtRaw = (detailContract as any)?.document_types;
                  const cdRaw = (detailContract as any)?.custom_documents;
                  try {
                    const parsed = typeof dtRaw === 'string' ? JSON.parse(dtRaw) : dtRaw;
                    setSelectedDocTypes(Array.isArray(parsed) ? parsed : []);
                  } catch { setSelectedDocTypes([]); }
                  try {
                    const parsed = typeof cdRaw === 'string' ? JSON.parse(cdRaw) : cdRaw;
                    setCustomDocs(Array.isArray(parsed) ? parsed : []);
                  } catch { setCustomDocs([]); }
                  setCircumstances((detailContract as any)?.circumstances || '');
                  setCardExpertId(detailContract?.expert_id || null);
                  setCardTitle(detailContract?.title || '');
                  setCardCustomerGoal((detailContract as any)?.customer_goal || '');
                  setCardLegalCostComp(
                    (detailContract as any)?.legal_cost_comp != null && (detailContract as any)?.legal_cost_comp !== ''
                      ? String((detailContract as any).legal_cost_comp)
                      : ''
                  );
                  setCardMoralComp(
                    (detailContract as any)?.moral_comp != null && (detailContract as any)?.moral_comp !== ''
                      ? String((detailContract as any).moral_comp)
                      : ''
                  );
                  setDocTypesChanged(false);
                  setCardDataChanged(false);
                }}>
                  Отмена
                </Button>
              </div>
            )}
          </>
        )}

        {!canEditCard && (
          <>
            {selectedDocTypes.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Типы документов</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedDocTypes.map(t => <Tag key={t} color="blue">{t}</Tag>)}
                </div>
              </div>
            )}
            {customDocs.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Дополнительные документы</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {customDocs.map((d, i) => <Tag key={i}>{d}</Tag>)}
                </div>
              </div>
            )}
            {(cardCustomerGoal || cardLegalCostComp || cardMoralComp) && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cardCustomerGoal && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Цель заказчика</div>
                    <div style={{ fontSize: 13 }}>{cardCustomerGoal}</div>
                  </div>
                )}
                {(cardLegalCostComp || cardMoralComp) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {cardLegalCostComp && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Юр. расходы</div>
                        <div style={{ fontSize: 13 }}>{Number(cardLegalCostComp).toLocaleString('ru-RU')} ₽</div>
                      </div>
                    )}
                    {cardMoralComp && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Моральный ущерб</div>
                        <div style={{ fontSize: 13 }}>{Number(cardMoralComp).toLocaleString('ru-RU')} ₽</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {circumstances && !isAdmin && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Обстоятельства</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{circumstances}</div>
              </div>
            )}
          </>
        )}

        {/* ── Кнопка подтверждения оплаты остатка (только админ) ── */}
        {isAdmin && !c.remainder_confirmed && (parseFloat(String(c.amount || 0)) - parseFloat(String(c.paid_amount || 0))) > 0 && (c as any).additional_payment_date && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <Popconfirm
              title="Подтвердить оплату остатка?"
              description={`Сумма остатка: ${formatMoney(parseFloat(String(c.amount || 0)) - parseFloat(String(c.paid_amount || 0)))} будет помечена как оплаченная.`}
              okText="Да, оплачено"
              cancelText="Отмена"
              onConfirm={() => handleConfirmRemainder(c.id)}
            >
              <Button type="primary" icon={<DollarOutlined />} size="large" block>
                Подтвердить оплату остатка
              </Button>
            </Popconfirm>
          </div>
        )}

        {/* ── Кнопка удаления договора (только админ) ── */}
        {isAdmin && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <Popconfirm
              title="Удалить договор?"
              description="Это действие необратимо. Договор будет полностью удалён из системы."
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                if (!detailContract) return;
                try {
                  await contractsApi.remove(detailContract.id);
                  message.success('Договор удалён');
                  closeDetail();
                  load();
                } catch {
                  message.error('Ошибка при удалении договора');
                }
              }}
            >
              <Button danger icon={<DeleteOutlined />} size="large" block>
                Удалить договор
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    );
  };

  const renderTzTab = () => {
    if (!detailContract) return null;
    const c = detailContract as any;
    const dtParsed = (() => {
      try { const v = typeof c.document_types === 'string' ? JSON.parse(c.document_types) : c.document_types; return Array.isArray(v) ? v : []; } catch { return []; }
    })();
    const cdParsed = (() => {
      try { const v = typeof c.custom_documents === 'string' ? JSON.parse(c.custom_documents) : c.custom_documents; return Array.isArray(v) ? v : []; } catch { return []; }
    })();
    const hasData = !!(
      c.customer_goal || c.situation_description || c.circumstances ||
      (typeof c.expert_deadline_days === 'number' && c.expert_deadline_days > 0) ||
      c.legal_cost_comp || c.moral_comp ||
      dtParsed.length > 0 || cdParsed.length > 0 || c.expert_id
    );

    if (!hasData) {
      return <Empty description="Техническое задание ещё не заполнено" />;
    }

    const expertObj = experts.find((e) => e.id === c.expert_id);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {dtParsed.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Документы к подготовке</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dtParsed.map((t: string) => <Tag key={t} color="blue">{t}</Tag>)}
            </div>
          </div>
        )}
        {cdParsed.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: 'var(--color-bg-alt)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Дополнительные документы</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cdParsed.map((d: string, i: number) => <Tag key={i}>{d}</Tag>)}
            </div>
          </div>
        )}
        <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 220 }}>
          {c.customer_goal && (
            <Descriptions.Item label="Цель заказчика">{c.customer_goal}</Descriptions.Item>
          )}
          {c.circumstances && (
            <Descriptions.Item label="Обстоятельства">
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.circumstances}</div>
            </Descriptions.Item>
          )}
          {c.situation_description && (
            <Descriptions.Item label="Описание ситуации">
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.situation_description}</div>
            </Descriptions.Item>
          )}
          {c.legal_cost_comp != null && c.legal_cost_comp !== '' && (
            <Descriptions.Item label="Возмещение юр. расходов">
              {Number(c.legal_cost_comp).toLocaleString('ru-RU')} ₽
            </Descriptions.Item>
          )}
          {c.moral_comp != null && c.moral_comp !== '' && (
            <Descriptions.Item label="Возмещение морального ущерба">
              {Number(c.moral_comp).toLocaleString('ru-RU')} ₽
            </Descriptions.Item>
          )}
          {expertObj && (
            <Descriptions.Item label="Эксперт">
              {expertObj.last_name} {expertObj.first_name}
            </Descriptions.Item>
          )}
          {typeof c.expert_deadline_days === 'number' && c.expert_deadline_days > 0 && (
            <Descriptions.Item label="Дедлайн для эксперта">{c.expert_deadline_days} дн.</Descriptions.Item>
          )}
        </Descriptions>
      </div>
    );
  };

  const isImageFile = (name: string) => /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(name);

  const handlePreviewMaterial = async (m: any) => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(buildApiUrl('/materials/' + m.id + '/download'), {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!r.ok) throw new Error('Ошибка загрузки');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewTitle(m.name || 'Просмотр');
      setPreviewVisible(true);
    } catch {
      message.error('Не удалось загрузить изображение');
    }
  };

  const renderMaterialsTab = () => {
    if (!detailContract) return null;
    const isExpert = user?.role === 'expert';

    const imageFiles = contractMaterials.filter(m => isImageFile(m.name) && m.file_url);
    const otherFiles = contractMaterials.filter(m => !isImageFile(m.name) || !m.file_url);

    const downloadMaterial = (m: CrmMaterial) => {
      const token = localStorage.getItem('token');
      fetch(buildApiUrl('/materials/' + m.id + '/download'), {
        headers: { Authorization: 'Bearer ' + token }
      })
        .then(r => {
          if (!r.ok) throw new Error('Ошибка скачивания');
          const cd = r.headers.get('content-disposition');
          let fname = m.name || 'file';
          if (cd) {
            const match = cd.match(/filename\*=UTF-8''(.+)/);
            if (match) fname = decodeURIComponent(match[1]);
          }
          return r.blob().then(blob => ({ blob, fname }));
        })
        .then(({ blob, fname }) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fname;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => message.error('Ошибка при скачивании файла'));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Загрузка файлов */}
        {!isExpert && (
          isMobile ? (
            <MobileMaterialUpload
              contractId={detailContract.id}
              onUploaded={() => loadContractMaterials(detailContract.id)}
              disabled={materialUploading}
            />
          ) : (
            <Upload.Dragger
              multiple
              showUploadList={false}
              beforeUpload={handleUploadMaterial}
              disabled={materialUploading}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Перетащите файл или нажмите для загрузки</p>
              <p className="ant-upload-hint">Любые типы файлов — документы, фотографии, сканы</p>
            </Upload.Dragger>
          )
        )}

        {materialUploading && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Spin size="small" /> <span style={{ marginLeft: 8 }}>Загрузка...</span>
          </div>
        )}

        {contractMaterialsLoading && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}

        {!contractMaterialsLoading && contractMaterials.length === 0 && (
          <Empty description="Материалы ещё не загружены" />
        )}

        {/* ── Галерея изображений ── */}
        {imageFiles.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, color: 'var(--color-text, #111)' }}>
              <FileImageOutlined style={{ marginRight: 6 }} />Фотографии ({imageFiles.length})
            </div>
            <Image.PreviewGroup>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: isMobile ? 6 : 10,
              }}>
                {imageFiles.map((m) => (
                  <div key={m.id} style={{
                    position: 'relative',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    background: 'var(--color-bg-elevated, #fafafa)',
                  }}>
                    <Image
                      src={getAuthenticatedUrl(m.file_url!)}
                      alt={m.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        display: 'block',
                        cursor: 'pointer',
                      }}
                      placeholder={
                        <div style={{
                          width: '100%',
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--color-bg-elevated, #f5f5f5)',
                        }}>
                          <Spin size="small" />
                        </div>
                      }
                      fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMiI+0J3QtdGCINGE0L7RgtC+PC90ZXh0Pjwvc3ZnPg=="
                    />
                    {/* Нижняя панель с именем + действия */}
                    <div style={{
                      padding: isMobile ? '3px 4px' : '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 4,
                      background: 'var(--color-bg-elevated, #fafafa)',
                    }}>
                      <span style={{
                        fontSize: isMobile ? 10 : 11,
                        color: 'var(--color-text-secondary, #666)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }} title={m.name}>
                        {m.name}
                      </span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <Tooltip title="Скачать">
                          <Button
                            type="text"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={(e) => { e.stopPropagation(); downloadMaterial(m); }}
                            style={{ color: '#1677ff', padding: '0 4px', height: 22, fontSize: 12 }}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Удалить?"
                          okText="Да"
                          cancelText="Нет"
                          onConfirm={() => handleRemoveMaterial(m)}
                        >
                          <Tooltip title="Удалить">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              style={{ padding: '0 4px', height: 22, fontSize: 12 }}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}

        {/* ── Остальные файлы (не изображения) ── */}
        {otherFiles.length > 0 && (
          <div>
            {imageFiles.length > 0 && (
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, color: 'var(--color-text, #111)' }}>
                <FileOutlined style={{ marginRight: 6 }} />Документы ({otherFiles.length})
              </div>
            )}
            <List
              dataSource={otherFiles}
              renderItem={(m) => (
                <List.Item
                  actions={[
                    m.file_url ? (
                      <Tooltip key="dl" title="Скачать">
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => downloadMaterial(m)}
                          style={{ color: '#1677ff' }}
                        />
                      </Tooltip>
                    ) : null,
                    <Popconfirm
                      key="rm"
                      title="Удалить материал?"
                      okText="Да"
                      cancelText="Отмена"
                      onConfirm={() => handleRemoveMaterial(m)}
                    >
                      <Tooltip title="Удалить">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<FileOutlined style={{ fontSize: 24, color: '#6B7280' }} />}
                    title={m.name}
                    description={
                      <>
                        {m.category && <Tag>{m.category}</Tag>}
                        {m.description && <span style={{ marginLeft: 4 }}>{m.description}</span>}
                        {m.created_at && (
                          <span style={{ color: 'var(--color-muted)', marginLeft: 8, fontSize: 12 }}>
                            {new Date(m.created_at).toLocaleString('ru-RU')}
                          </span>
                        )}
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    );
  };

  const renderDocsTab = () => {
    if (!detailContract) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Upload.Dragger
          accept=".doc,.docx"
          multiple
          showUploadList={false}
          beforeUpload={handleUploadDoc}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">Перетащите файл или нажмите для выбора</p>
          <p className="ant-upload-hint">Разрешены только .doc и .docx</p>
        </Upload.Dragger>

        {uploading && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Spin size="small" /> <span style={{ marginLeft: 8 }}>Загрузка...</span>
          </div>
        )}

        <List
          loading={docsLoading}
          dataSource={docsList}
          locale={{ emptyText: <Empty description="Эксперт ещё не загрузил документы" /> }}
          renderItem={(d) => (
            <List.Item
              actions={[
                <Tooltip key="dl" title="Скачать">
                  <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadDoc(d)} style={{ color: '#1677ff' }} />
                </Tooltip>,
                <Popconfirm key="rm" title="Удалить файл?" okText="Да" cancelText="Отмена" onConfirm={() => handleRemoveDoc(d)}>
                  <Tooltip title="Удалить">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileWordOutlined style={{ fontSize: 28, color: '#2b579a' }} />}
                title={d.name}
                description={`${d.size_bytes ? Math.round(d.size_bytes / 1024) + ' КБ' : '—'} · ${d.created_at ? new Date(d.created_at).toLocaleString('ru-RU') : ''}`}
              />
            </List.Item>
          )}
        />
      </div>
    );
  };

  const handleSupplementSave = async () => {
    if (!detailContract) return;
    setSupplementSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (supplementForm.title) payload.title = supplementForm.title;
      if (supplementForm.customer_goal) payload.customer_goal = supplementForm.customer_goal;
      if (supplementForm.situation_description) payload.situation_description = supplementForm.situation_description;
      if (supplementForm.expert_id) payload.expert_id = supplementForm.expert_id;
      if (supplementForm.expert_deadline_days) payload.expert_deadline_days = supplementForm.expert_deadline_days;
      if (supplementForm.legal_cost_comp) payload.legal_cost_comp = supplementForm.legal_cost_comp;
      if (supplementForm.moral_comp) payload.moral_comp = supplementForm.moral_comp;
      if (docTypesChanged) payload.document_types = selectedDocTypes;
      if (cardDataChanged) {
        payload.custom_documents = customDocs;
        if (circumstances !== '') payload.circumstances = circumstances;
      }

      await contractsApi.supplement(detailContract.id, payload);
      message.success('Данные дополнены');
      // Обновляем detailContract
      try {
        const updated = await contractsApi.getById(detailContract.id);
        if (updated) setDetailContract(updated);
      } catch {}
      setDocTypesChanged(false);
      setCardDataChanged(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setSupplementSaving(false);
    }
  };

  const renderSupplementTab = () => {
    if (!detailContract) return null;
    const c = detailContract;
    const isDocsContract = (c.contract_type || 'docs') === 'docs';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Result
          status="warning"
          title="Договор ожидает дополнения данных"
          subTitle="Администратор зарегистрировал договор. Заполните дополнительные поля и сохраните."
          style={{ padding: '16px 0' }}
        />
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Тема договора</div>
          <Input
            value={supplementForm.title}
            onChange={(e) => setSupplementForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Например: Гражданское право — раздел имущества"
          />
        </div>
        {isDocsContract && (
          <>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Цель заказчика *</div>
              <Input.TextArea
                value={supplementForm.customer_goal}
                onChange={(e) => setSupplementForm((f) => ({ ...f, customer_goal: e.target.value }))}
                rows={3}
                placeholder="Опишите цель заказчика"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Описание ситуации</div>
              <Input.TextArea
                value={supplementForm.situation_description}
                onChange={(e) => setSupplementForm((f) => ({ ...f, situation_description: e.target.value }))}
                rows={4}
                placeholder="Опишите ситуацию клиента"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Эксперт</div>
              <Select
                value={supplementForm.expert_id}
                onChange={(v) => setSupplementForm((f) => ({ ...f, expert_id: v }))}
                placeholder="Выберите эксперта"
                allowClear
                style={{ width: '100%' }}
                options={experts.map((e) => ({
                  value: e.id,
                  label: `${e.last_name} ${e.first_name}`,
                }))}
                notFoundContent="Нет экспертов в офисе"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Дедлайн для эксперта (дней)</div>
              <InputNumber
                value={supplementForm.expert_deadline_days}
                onChange={(v) => setSupplementForm((f) => ({ ...f, expert_deadline_days: v }))}
                min={1}
                style={{ width: '100%' }}
                placeholder="Количество дней"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Компенсация судебных издержек</div>
              <Input
                value={supplementForm.legal_cost_comp}
                onChange={(e) => setSupplementForm((f) => ({ ...f, legal_cost_comp: e.target.value }))}
                placeholder="Сумма или пометка"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Моральная компенсация</div>
              <Input
                value={supplementForm.moral_comp}
                onChange={(e) => setSupplementForm((f) => ({ ...f, moral_comp: e.target.value }))}
                placeholder="Сумма или пометка"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Документы к подготовке</div>
              <Checkbox.Group
                value={selectedDocTypes}
                onChange={(vals) => { setSelectedDocTypes(vals as string[]); setDocTypesChanged(true); }}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {DOCUMENT_TYPE_OPTIONS.map((t) => (
                  <Checkbox key={t} value={t}>{t}</Checkbox>
                ))}
              </Checkbox.Group>
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Дополнительные документы (до {CUSTOM_DOCS_LIMIT})</div>
              {customDocs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {customDocs.map((d, i) => (
                    <Tag key={i} closable onClose={() => {
                      setCustomDocs((prev) => prev.filter((_, idx) => idx !== i));
                      setCardDataChanged(true);
                    }}>{d}</Tag>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>{customDocs.length}/{CUSTOM_DOCS_LIMIT}</div>
              {customDocs.length < CUSTOM_DOCS_LIMIT && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    placeholder="Название документа"
                    value={newCustomDoc}
                    onChange={(e) => setNewCustomDoc(e.target.value)}
                    onPressEnter={() => {
                      const v = newCustomDoc.trim();
                      if (v && customDocs.length < CUSTOM_DOCS_LIMIT) {
                        setCustomDocs((prev) => [...prev, v]);
                        setNewCustomDoc('');
                        setCardDataChanged(true);
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const v = newCustomDoc.trim();
                    if (v && customDocs.length < CUSTOM_DOCS_LIMIT) {
                      setCustomDocs((prev) => [...prev, v]);
                      setNewCustomDoc('');
                      setCardDataChanged(true);
                    }
                  }}>Добавить</Button>
                </div>
              )}
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Обстоятельства</div>
              <Input.TextArea
                value={circumstances}
                onChange={(e) => { setCircumstances(e.target.value); setCardDataChanged(true); }}
                rows={6}
                placeholder="Опишите ситуацию клиента подробно"
              />
            </div>
          </>
        )}
        <Button
          type="primary"
          icon={<FileDoneOutlined />}
          size="large"
          block
          loading={supplementSaving}
          onClick={handleSupplementSave}
        >
          Сохранить и дополнить договор
        </Button>
      </div>
    );
  };

  const renderTerminateTab = () => {
    if (!detailContract) return null;
    const c = detailContract;
    const isAlreadyTerminated = c.status === 'terminated';

    if (isAlreadyTerminated) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Result
            status="warning"
            title="Договор расторгнут"
            subTitle={c.terminated_at ? `Дата расторжения: ${new Date(c.terminated_at).toLocaleDateString('ru-RU')}` : undefined}
          />
          <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 200 }}>
            {c.termination_reason && (
              <Descriptions.Item label="Причина">{c.termination_reason}</Descriptions.Item>
            )}
            <Descriptions.Item label="Сумма возврата">
              <span style={{ fontWeight: 600, color: '#e74c3c' }}>{formatMoney(c.refund_amount)}</span>
            </Descriptions.Item>
            {c.refund_deadline && (
              <Descriptions.Item label="Срок возврата">{new Date(c.refund_deadline).toLocaleDateString('ru-RU')}</Descriptions.Item>
            )}
            <Descriptions.Item label="Статус возврата">
              {c.refund_confirmed
                ? <Tag color="green">Деньги возвращены{c.refund_confirmed_by_name ? ` (${c.refund_confirmed_by_name})` : ''}</Tag>
                : <Tag color="red">Ожидает возврата</Tag>}
            </Descriptions.Item>
          </Descriptions>

          {!c.refund_confirmed && canConfirmRefund && parseFloat(String(c.refund_amount || 0)) > 0 && (
            <Popconfirm
              title={`Подтвердить возврат ${formatMoney(c.refund_amount)}? Сумма будет вычтена из кассы офиса и юриста.`}
              okText="Да, деньги возвращены"
              cancelText="Отмена"
              onConfirm={() => handleConfirmRefund(c.id)}
            >
              <Button type="primary" danger icon={<DollarOutlined />} size="large" block>
                Деньги возвращены
              </Button>
            </Popconfirm>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Сданные акты по договору ({contractActs.length})</div>
            {contractActsLoading ? <Spin /> : (
              <Table
                rowKey="id"
                dataSource={contractActs}
                size="small"
                pagination={false}
                locale={{ emptyText: <Empty description="Акты не найдены" /> }}
                columns={[
                  { title: 'Дата', dataIndex: 'act_date', width: 110, render: (v: string) => v ? new Date(v).toLocaleDateString('ru-RU') : '—' },
                  { title: 'Сумма', dataIndex: 'amount', width: 120, render: (v: number | string) => formatMoney(v) },
                  { title: 'Статус', dataIndex: 'status', width: 120, render: (v: string) => v === 'confirmed' ? <Tag color="green">Подтверждён</Tag> : <Tag color="gold">Черновик</Tag> },
                  { title: 'Описание', dataIndex: 'description', ellipsis: true },
                ]}
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Сданные акты по договору ({contractActs.length})</div>
          {contractActsLoading ? <Spin /> : (
            <Table
              rowKey="id"
              dataSource={contractActs}
              size="small"
              pagination={false}
              locale={{ emptyText: <Empty description="Акты не найдены" /> }}
              columns={[
                { title: 'Дата', dataIndex: 'act_date', width: 110, render: (v: string) => v ? new Date(v).toLocaleDateString('ru-RU') : '—' },
                { title: 'Сумма', dataIndex: 'amount', width: 120, render: (v: number | string) => formatMoney(v) },
                { title: 'Статус', dataIndex: 'status', width: 120, render: (v: string) => v === 'confirmed' ? <Tag color="green">Подтверждён</Tag> : <Tag color="gold">Черновик</Tag> },
                { title: 'Описание', dataIndex: 'description', ellipsis: true },
              ]}
            />
          )}
        </div>

        <InfoBlock>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15, color: '#e74c3c' }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            Условия расторжения
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Дата расторжения *</div>
              <DatePicker
                value={terminateForm.terminated_at}
                onChange={(d) => setTerminateForm((f) => ({ ...f, terminated_at: d || dayjs() }))}
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Сумма возврата клиенту</div>
              <InputNumber
                value={terminateForm.refund_amount}
                onChange={(v) => setTerminateForm((f) => ({ ...f, refund_amount: v || 0 }))}
                min={0}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                addonAfter="₽"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Срок возврата</div>
              <DatePicker
                value={terminateForm.refund_deadline}
                onChange={(d) => setTerminateForm((f) => ({ ...f, refund_deadline: d }))}
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
                placeholder="Выберите дату"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Причина расторжения</div>
              <Input.TextArea
                value={terminateForm.termination_reason}
                onChange={(e) => setTerminateForm((f) => ({ ...f, termination_reason: e.target.value }))}
                rows={3}
                placeholder="Укажите причину расторжения (необязательно)"
              />
            </div>
          </div>
        </InfoBlock>

        <Popconfirm
          title="Вы уверены, что хотите расторгнуть договор? Это действие нельзя отменить."
          okText="Расторгнуть"
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
          onConfirm={handleTerminate}
        >
          <Button
            type="primary"
            danger
            icon={<StopOutlined />}
            size="large"
            block
            loading={terminating}
          >
            Расторгнуть договор
          </Button>
        </Popconfirm>
      </div>
    );
  };

  const renderCaseActionsTab = () => {
    if (!detailContract) return null;
    if (caseActions.length === 0) {
      return <Empty description="Представитель ещё не зафиксировал процессуальных действий" />;
    }
    return (
      <Timeline mode="left" items={caseActions.map(a => ({
        color: 'blue',
        label: dayjs(a.action_date).format('DD.MM.YYYY'),
        children: (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.action_type}</div>
            {a.description && <div style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 4 }}>{a.description}</div>}
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              {a.user_name || 'Представитель'} · добавлено {dayjs(a.created_at).format('DD.MM.YYYY HH:mm')}
            </div>
          </div>
        ),
      }))} />
    );
  };

  // Build drawer tabs (no memo — fresh on every render to avoid stale state bugs)
  const buildDrawerTabs = () => {
    const tabs: { key: string; label: string; children: React.ReactNode }[] = [
      { key: 'info', label: 'Информация', children: renderInfoTab() },
    ];
    // Дополнить данные — только сотрудник, заключивший договор (не админ)
    const isContractOwner = !!(user?.id && detailContract?.registered_by === user.id);
    if (detailContract?.needs_lawyer_input && !isAdmin && isContractOwner) {
      tabs.push({ key: 'supplement', label: '⚠ Дополнить данные', children: renderSupplementTab() });
    }
    if (!isAdmin) {
      tabs.push({ key: 'materials', label: `Материалы (${contractMaterials.length})`, children: renderMaterialsTab() });
    }
    if (isDocsType && !isAdmin) {
      tabs.push({ key: 'docs', label: `Документы (${docsList.length})`, children: renderDocsTab() });
    }
    if (!isAdmin && (detailContract?.status === 'terminated' || canTerminate)) {
      if ((detailContract?.contract_type || 'docs') === 'court_rep') {
        tabs.push({ key: 'case-actions', label: `Проц. действия (${caseActions.length})`, children: renderCaseActionsTab() });
      }
      tabs.push({ key: 'terminate', label: detailContract?.status === 'terminated' ? 'Расторжение' : 'Расторжение', children: renderTerminateTab() });
    }
    return tabs;
  };

  return (
    <Page>
      <ToolRow>
        <Space size={12} wrap>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', overflowX: 'auto', maxWidth: 'min(100%, calc(100vw - 32px))' }}>
            {[
              { label: 'Договоры', value: 'contracts' as ClientsView },
              ...(canTerminate ? [{ label: 'Расторжение договора', value: 'terminated' as ClientsView }] : []),
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setView(tab.value)}
                style={{
                  padding: '8px 16px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: view === tab.value ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: view === tab.value ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  fontWeight: view === tab.value ? 600 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Space>
        <Space>
          {!isAdmin && view === 'contracts' && <Documents headless />}
        </Space>
      </ToolRow>
      {view === 'contracts' && (
        <>
          <ToolRow>
            <Space size={12} wrap>
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', overflowX: 'auto', maxWidth: 'min(100%, calc(100vw - 32px))' }}>
                {([
                  { label: 'Подготовка документов', value: 'docs' as DealType },
                  { label: 'Представительство в суде', value: 'court_rep' as DealType },
                ].filter(t => user?.role !== 'expert' || t.value === 'docs')).map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setDealType(tab.value)}
                    style={{
                      padding: '8px 16px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: dealType === tab.value ? '2px solid var(--color-primary)' : '2px solid transparent',
                      color: dealType === tab.value ? 'var(--color-text)' : 'var(--color-text-secondary)',
                      fontWeight: dealType === tab.value ? 600 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="clients-date-nav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => { setDateFilterEnabled(true); setSelectedDate((d) => d.subtract(1, 'day')); }}
                  title="Предыдущий день"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-elevated)',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-secondary)', fontSize: 12,
                    flexShrink: 0,
                  }}
                ><LeftOutlined /></button>
                <span
                  onClick={() => {
                    if (dateFilterEnabled && selectedDate.format('YYYY-MM-DD') === todayStr) {
                      setDateFilterEnabled(false);
                    } else {
                      setDateFilterEnabled(true);
                      setSelectedDate(dayjs());
                    }
                  }}
                  title={dateFilterEnabled ? 'Нажмите, чтобы вернуться к «сегодня» или выключить фильтр' : 'Включить фильтр по дате'}
                  style={{
                    padding: '5px 14px', fontSize: 14, fontWeight: 600,
                    color: 'var(--color-text)',
                    cursor: 'pointer', borderRadius: 8,
                    whiteSpace: 'nowrap', userSelect: 'none',
                    background: dateFilterEnabled ? 'var(--color-bg-alt)' : 'transparent',
                  }}
                >
                  {!dateFilterEnabled
                    ? 'Все даты'
                    : selectedDate.format('YYYY-MM-DD') === todayStr
                      ? `Сегодня, ${selectedDate.format('D MMM')}`
                      : selectedDate.format('D MMMM, dd')}
                </span>
                <button
                  onClick={() => { setDateFilterEnabled(true); setSelectedDate((d) => d.add(1, 'day')); }}
                  title="Следующий день"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-elevated)',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-secondary)', fontSize: 12,
                    flexShrink: 0,
                  }}
                ><RightOutlined /></button>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={() => setCalOpen((v) => !v)}
                    title="Выбрать дату"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#3B82F6', fontSize: 14,
                      flexShrink: 0, marginLeft: 4,
                    }}
                  ><CalendarOutlined /></button>
                  <DatePicker
                    value={selectedDate}
                    onChange={(d) => { if (d) { setDateFilterEnabled(true); setSelectedDate(d); setCalOpen(false); } }}
                    open={calOpen}
                    onOpenChange={setCalOpen}
                    allowClear={false}
                    style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
                  />
                </div>
              </div>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="Поиск по ФИО, номеру договора или телефону"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ minWidth: 260, maxWidth: 420, borderRadius: 8 }}
              />
            </Space>
          </ToolRow>

          {isMobile ? (
            <div className="mobile-card-list">
              {filtered.length === 0 ? (
                <Empty description="Нет договоров" />
              ) : filtered.map((row) => (
                <div
                  key={row.key}
                  className="mc-card"
                  onClick={() => openDetail(row.contract, row.client)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="mc-title">{row.client?.name || 'Без имени'}</div>
                  <div className="mc-row">
                    <span className="mc-label">Договор</span>
                    <span>№ {row.contract.id}</span>
                  </div>
                  <div className="mc-row">
                    <span className="mc-label">Тема</span>
                    <span style={{ textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(row.contract as any).title || '—'}
                    </span>
                  </div>
                  <div className="mc-row">
                    <span className="mc-label">Сумма</span>
                    <span>{Number(row.contract.amount || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="mc-row">
                    <span className="mc-label">Статус</span>
                    <Tag color={STATUS_COLORS[row.contract.status as keyof typeof STATUS_COLORS] || 'default'} style={{ margin: 0 }}>
                      {({registered:"Зарегистрирован",active:"Активный",pending:"Ожидает",completed:"Завершён",cancelled:"Отменён",draft:"Черновик",terminated:"Расторгнут"} as Record<string,string>)[row.contract.status] || row.contract.status}
                    </Tag>
                  </div>
                  {(row.contract as any).needs_lawyer_input ? (
                    <div style={{ marginTop: 8, padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                      ⚠ Дополнить данные
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <TableCard>
              <Table<ContractRow>
                rowKey="key"
                dataSource={filtered}
                columns={dealType === 'docs' ? docsColumns : courtColumns}
                rowClassName={(r) => { const i = getDeadlineInfo(r.contract.expert_deadline); return i ? `deadline-row deadline-${i.key}` : ''; }}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                locale={{ emptyText: <Empty description={dealType === 'docs' ? 'Нет договоров на подготовку документов' : 'Нет договоров на представительство в суде'} /> }}
                size="small"
                onRow={(row) => ({
                  onClick: (ev) => {
                    const target = ev.target as HTMLElement;
                    if (target.closest('button')) return;
                    openDetail(row.contract, row.client);
                  },
                  style: { cursor: 'pointer' },
                })}
              />
            </TableCard>
          )}
        </>
      )}

      {view === 'terminated' && (
        <TableCard>
          <Table<CrmContract>
            rowKey="id"
            dataSource={terminatedContracts}
            loading={terminatedLoading}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
            locale={{ emptyText: <Empty description="Нет расторгнутых договоров" /> }}
            size="small"
            onRow={(row) => ({
              onClick: () => {
                const cl = clientsById.get(row.id_client) || null;
                openDetail(row, cl);
              },
              style: { cursor: 'pointer' },
            })}
            columns={[
              {
                title: 'ФИО клиента',
                key: 'client_name',
                render: (_, r) => (
                  <span style={{ fontWeight: 600, color: '#e74c3c' }}>
                    {r.client_name || '—'}
                  </span>
                ),
              },
              {
                title: 'Номер договора',
                key: 'contract_number',
                width: 160,
                render: (_, r) => contractNumber(r.id, r.contract_number),
              },
              {
                title: 'Сумма договора',
                key: 'amount',
                width: 130,
                align: 'right',
                render: (_, r) => formatMoney(r.amount),
              },
              {
                title: 'Юрист',
                key: 'lawyer',
                render: (_, r) => lawyersLabel(r),
              },
              {
                title: 'Дата расторжения',
                key: 'terminated_at',
                width: 140,
                render: (_, r) => r.terminated_at ? new Date(r.terminated_at).toLocaleDateString('ru-RU') : '—',
              },
              {
                title: 'Сумма возврата',
                key: 'refund_amount',
                width: 140,
                align: 'right',
                render: (_, r) => <span style={{ color: '#e74c3c', fontWeight: 600 }}>{formatMoney(r.refund_amount)}</span>,
              },
              {
                title: 'Срок возврата',
                key: 'refund_deadline',
                width: 130,
                render: (_, r) => r.refund_deadline ? new Date(r.refund_deadline).toLocaleDateString('ru-RU') : '—',
              },
              {
                title: 'Статус возврата',
                key: 'refund_status',
                width: 180,
                render: (_, r) => {
                  if (r.refund_confirmed) {
                    return <Tag color="green">Возвращено</Tag>;
                  }
                  if (parseFloat(String(r.refund_amount || 0)) > 0) {
                    if (canConfirmRefund) {
                      return (
                        <Popconfirm
                          title={`Подтвердить возврат ${formatMoney(r.refund_amount)}?`}
                          okText="Да"
                          cancelText="Нет"
                          onConfirm={(e) => { e?.stopPropagation(); handleConfirmRefund(r.id); }}
                          onCancel={(e) => e?.stopPropagation()}
                        >
                          <Button
                            type="primary"
                            danger
                            size="small"
                            icon={<DollarOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Деньги возвращены
                          </Button>
                        </Popconfirm>
                      );
                    }
                    return <Tag color="red">Ожидает возврата</Tag>;
                  }
                  return <Tag color="default">Без возврата</Tag>;
                },
              },
            ]}
          />
        </TableCard>
      )}

      {/* Detail drawer */}
      <Drawer
        title="Карточка договора"
        open={detailOpen}
        onClose={closeDetail}
        width={isMobile ? '100vw' : Math.min(720, window.innerWidth - 40)}
        destroyOnClose
      >
        <Tabs
          activeKey={detailTab}
          onChange={setDetailTab}
          items={buildDrawerTabs()}
          size="small"
        />
      </Drawer>

      {/* ── Preview modal for images ── */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => { setPreviewVisible(false); URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16, maxHeight: '80vh', overflow: 'auto' } }}
      >
        <img src={previewUrl} alt={previewTitle} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />
      </Modal>

      {/* Модалка назначения представителя */}
      <Modal
        title={assignModal.contract
          ? `Передать дело ${contractNumber(assignModal.contract.id, assignModal.contract.contract_number)} представителю`
          : 'Передать дело представителю'}
        open={assignModal.open}
        onCancel={() => setAssignModal({ open: false, contract: null })}
        footer={null}
        width={500}
        destroyOnClose
      >
        {repsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>Загрузка...</div>
        ) : representatives.length === 0 ? (
          <Empty description="Нет доступных представителей" />
        ) : (
          <List
            dataSource={representatives}
            renderItem={(rep) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="assign"
                    title={`Передать дело: ${rep.first_name} ${rep.last_name}?`}
                    okText="Да"
                    cancelText="Отмена"
                    onConfirm={() => handleAssign(rep.id)}
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<UserSwitchOutlined />}
                      loading={assigning}
                    >
                      Передать
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={`${rep.last_name} ${rep.first_name}`}
                  description={`Активных дел: ${rep.cases_count}${rep.phone ? ` · ${rep.phone}` : ''}`}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

    </Page>
  );
};

export default Clients;