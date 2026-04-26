import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import {
  Table,
  Input,
  Button,
  Space,
  Tooltip,
  App,
  Empty,
  Segmented,
  Tag,
  Modal,
  List,
  Upload,
  Popconfirm,
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
} from '@ant-design/icons';
import {
  clientsApi,
  contractsApi,
  contractDocsApi,
  type CrmClient,
  type CrmContract,
  type ContractDocument,
} from '../shared/api/crm';
import apiInstance from '../shared/api/instance';
import Documents from './Documents';

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
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 8px 8px 4px;
  overflow: hidden;

  .ant-table-wrapper { background: transparent; }
  .ant-table { background: transparent; }
  .ant-table-thead > tr > th { background: transparent !important; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .ant-table-tbody > tr > td { background: transparent !important; }
  .ant-table-tbody > tr:hover > td { background: rgba(192,155,70,0.06) !important; }
`;

const formatMoney = (value?: string | number | null) => {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

const CONTRACT_PREFIX = 'ДОГ-';
const contractNumber = (id: number) => `${CONTRACT_PREFIX}${String(id).padStart(8, '0')}`;

const extractTopic = (c: CrmContract): string => {
  const raw = c.title || c.description || '';
  if (!raw) return '—';
  const [topic] = raw.split(' - ');
  return (topic || raw).trim();
};

// Сократить ФИО до «Фамилия И.О.»
const shortName = (full?: string | null): string => {
  if (!full) return '—';
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const [last, first, middle] = parts;
  const initials = [first, middle].filter(Boolean).map((p) => `${p[0]}.`).join('');
  return `${last}${initials ? ' ' + initials : ''}`;
};

type DealType = 'docs' | 'court_rep';

interface ContractRow {
  contract: CrmContract;
  client: CrmClient | null;
  key: string;
}

const Clients: React.FC<ClientsProps> = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<CrmClient[]>([]);
  const [contracts, setContracts] = useState<CrmContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dealType, setDealType] = useState<DealType>('docs');

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('contractCreated', handler);
    window.addEventListener('clientCreated', handler);
    return () => {
      window.removeEventListener('contractCreated', handler);
      window.removeEventListener('clientCreated', handler);
    };
  }, [load]);

  const clientsById = useMemo(() => {
    const m = new Map<number, CrmClient>();
    for (const c of data) m.set(c.id, c);
    return m;
  }, [data]);

  // Per-contract rows, filtered by deal type.
  const rows = useMemo<ContractRow[]>(() => {
    return contracts
      .filter((c) => {
        const t = (c.contract_type || 'docs').toString();
        return t === dealType;
      })
      .map((c) => ({
        contract: c,
        client: c.id_client ? (clientsById.get(c.id_client) || null) : null,
        key: `c-${c.id}`,
      }));
  }, [contracts, clientsById, dealType]);

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
      const num = contractNumber(r.contract.id).toLowerCase();
      if (name.includes(q)) return true;
      if (phone.includes(q)) return true;
      if (num.includes(q) || num.includes(qLatinToCyr)) return true;
      if (qDigits && phone.replace(/\D/g, '').includes(qDigits)) return true;
      if (qDigits && String(r.contract.id).padStart(8, '0').includes(qDigits)) return true;
      return false;
    });
  }, [rows, searchText]);

  const toggleDocsReady = async (c: CrmContract) => {
    const next = (c.docs_status === 'ready') ? 'pending' : 'ready';
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
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось обновить статус документов');
    }
  };

  const docsColumns: ColumnsType<ContractRow> = [
    {
      title: 'ФИО клиента',
      key: 'client_name',
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
          {r.client?.name || r.contract.client_name || '—'}
        </span>
      ),
      sorter: (a, b) => (a.client?.name || '').localeCompare(b.client?.name || ''),
    },
    {
      title: 'Номер договора',
      key: 'contract_number',
      width: 160,
      render: (_, r) => <span>{contractNumber(r.contract.id)}</span>,
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
      render: (_, r) => (
        <span>{shortName(r.contract.lawyer_full_name || r.contract.employee_name)}</span>
      ),
    },
    {
      title: 'Эксперт',
      key: 'expert',
      render: (_, r) => {
        const name = r.contract.expert_full_name;
        if (!name) return <Tag color="default">не назначен</Tag>;
        return <span>{shortName(name)}</span>;
      },
    },
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
      title: 'Статус документов',
      key: 'docs_status',
      width: 170,
      align: 'center',
      render: (_, r) => {
        const ready = r.contract.docs_status === 'ready';
        return (
          <Tooltip title={ready ? 'Документы готовы (нажмите, чтобы вернуть в «Ожидание»)' : 'Документы ещё не готовы (нажмите, чтобы отметить готовыми)'}>
            <Button
              type="text"
              onClick={() => toggleDocsReady(r.contract)}
              icon={ready
                ? <CheckCircleFilled style={{ color: '#3aa56b', fontSize: 20 }} />
                : <ClockCircleOutlined style={{ color: '#d4af37', fontSize: 20 }} />}
            >
              {ready ? 'Готовы' : 'Ожидание'}
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  // Документы по договору — модалка.
  const [docsModal, setDocsModal] = useState<{ open: boolean; contract: CrmContract | null }>({ open: false, contract: null });
  const [docsList, setDocsList] = useState<ContractDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const openDocsModal = (c: CrmContract) => {
    setDocsModal({ open: true, contract: c });
    setDocsList([]);
    reloadDocs(c.id);
  };

  const closeDocsModal = () => {
    setDocsModal({ open: false, contract: null });
    setDocsList([]);
    // Пользователь мог поменять набор файлов — перечитываем список договоров, чтобы docs_status в таблице обновился.
    load();
  };

  const handleUploadDoc = async (file: File): Promise<boolean> => {
    if (!docsModal.contract) return false;
    const ext = file.name.toLowerCase().match(/\.(docx?|DOCX?)$/);
    if (!ext) {
      message.error('Разрешены только .doc / .docx');
      return false;
    }
    setUploading(true);
    try {
      await contractDocsApi.upload(docsModal.contract.id, file);
      message.success('Документ загружен');
      await reloadDocs(docsModal.contract.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
    return false; // блокируем отправку antd Upload’ом
  };

  const handleRemoveDoc = async (doc: ContractDocument) => {
    if (!docsModal.contract) return;
    try {
      await contractDocsApi.remove(docsModal.contract.id, doc.id);
      message.success('Документ удалён');
      await reloadDocs(docsModal.contract.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка удаления');
    }
  };

  const handleDownloadDoc = async (doc: ContractDocument) => {
    if (!docsModal.contract) return;
    try {
      const resp = await apiInstance.get(
        `/contracts/${docsModal.contract.id}/documents/${doc.id}/download`,
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

  // Минимальный набор колонок для type 2 — расширим, когда придёт ТЗ.
  const courtColumns: ColumnsType<ContractRow> = [
    {
      title: 'ФИО клиента',
      key: 'client_name',
      render: (_, r) => (
        <span style={{ fontWeight: 600 }}>{r.client?.name || r.contract.client_name || '—'}</span>
      ),
    },
    { title: 'Номер договора', key: 'num', render: (_, r) => contractNumber(r.contract.id) },
    { title: 'Тема', key: 'topic', render: (_, r) => extractTopic(r.contract) },
    {
      title: 'Контакты',
      key: 'contacts',
      render: (_, r) => r.client?.phone || r.contract.client_phone || '—',
    },
    { title: 'Юрист', key: 'lawyer', render: (_, r) => shortName(r.contract.lawyer_full_name || r.contract.employee_name) },
    { title: 'Сумма', key: 'amount', align: 'right', render: (_, r) => formatMoney(r.contract.amount) },
    { title: 'Внесено', key: 'paid', align: 'right', render: (_, r) => formatMoney(r.contract.paid_amount) },
  ];

  return (
    <Page>
      <ToolRow>
        <Space size={12} wrap>
          <Segmented<DealType>
            value={dealType}
            onChange={(v) => setDealType(v as DealType)}
            options={[
              { label: 'Подготовка документов', value: 'docs' },
              { label: 'Представительство в суде', value: 'court_rep' },
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Поиск по ФИО, номеру договора или телефону"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ minWidth: 260, maxWidth: 420 }}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Documents headless />
        </Space>
      </ToolRow>

      <TableCard>
        <Table<ContractRow>
          rowKey="key"
          dataSource={filtered}
          columns={dealType === 'docs' ? docsColumns : courtColumns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description={dealType === 'docs' ? 'Нет договоров на подготовку документов' : 'Нет договоров на представительство в суде'} /> }}
          size="middle"
          onRow={(row) => ({
            onClick: (ev) => {
              // Не реагируем на клик по кнопке статуса (toggle docs_status)
              const target = ev.target as HTMLElement;
              if (target.closest('button')) return;
              if (dealType === 'docs') openDocsModal(row.contract);
            },
            style: dealType === 'docs' ? { cursor: 'pointer' } : undefined,
          })}
        />
      </TableCard>

      <Modal
        title={docsModal.contract
          ? `Документы по договору ${contractNumber(docsModal.contract.id)} — ${docsModal.contract.client_name || ''}`
          : 'Документы по договору'}
        open={docsModal.open}
        onCancel={closeDocsModal}
        footer={null}
        width={640}
        destroyOnClose
      >
        {docsModal.contract && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: 'var(--color-muted)' }}>
              Тема: <b>{extractTopic(docsModal.contract)}</b>
              {docsModal.contract.expert_full_name
                ? <> · Эксперт: <b>{shortName(docsModal.contract.expert_full_name)}</b></>
                : null}
            </div>
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
            <List
              loading={docsLoading}
              dataSource={docsList}
              locale={{ emptyText: <Empty description="Эксперт ещё не загрузил документы" /> }}
              renderItem={(d) => (
                <List.Item
                  actions={[
                    <Button key="dl" type="primary" icon={<DownloadOutlined />} onClick={() => handleDownloadDoc(d)}>Скачать</Button>,
                    <Popconfirm key="rm" title="Удалить файл?" okText="Да" cancelText="Отмена" onConfirm={() => handleRemoveDoc(d)}>
                      <Button danger icon={<DeleteOutlined />}>Удалить</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileWordOutlined style={{ fontSize: 28, color: '#2b579a' }} />}
                    title={d.name}
                    description={`${d.size_bytes ? Math.round(d.size_bytes / 1024) + ' КБ' : '—'} · ${d.created_at ? new Date(d.created_at).toLocaleString('ru-RU') : ''}`}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </Page>
  );
};

export default Clients;
