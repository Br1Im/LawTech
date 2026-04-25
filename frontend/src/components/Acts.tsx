import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import {
  Table,
  Input,
  Button,
  Space,
  App,
  Empty,
  Modal,
  DatePicker,
  Select,
  Tag,
  Descriptions,
  InputNumber,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import {
  actsApi,
  contractsApi,
  employeesApi,
  type CrmAct,
  type CrmContract,
  type CrmEmployee,
  type ActsFilters,
} from '../shared/api/crm';

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

const FiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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
  .ant-table-tbody > tr:hover > td { background: rgba(192,155,70,0.06) !important; cursor: pointer; }
`;

const formatMoney = (v?: string | number | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

const CONTRACT_PREFIX = 'ДОГ-';
const contractNumber = (id: number) => `${CONTRACT_PREFIX}${String(id).padStart(8, '0')}`;

const shortName = (full?: string | null) => {
  if (!full) return '—';
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const [last, first, middle] = parts;
  const initials = [first, middle].filter(Boolean).map((p) => `${p[0]}.`).join('');
  return `${last}${initials ? ' ' + initials : ''}`;
};

const typeLabel = (t?: string | null) => (t === 'court_rep' ? 'Суд' : 'Документы');
const typeColor = (t?: string | null) => (t === 'court_rep' ? 'geekblue' : 'gold');

const Acts: React.FC = () => {
  const { message } = App.useApp();

  const [acts, setActs] = useState<CrmAct[]>([]);
  const [contracts, setContracts] = useState<CrmContract[]>([]);
  const [employees, setEmployees] = useState<CrmEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterDate, setFilterDate] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [filterType, setFilterType] = useState<'docs' | 'court_rep' | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'draft' | 'confirmed' | undefined>(undefined);
  const [filterResp, setFilterResp] = useState<number | undefined>(undefined);

  const [detail, setDetail] = useState<{ open: boolean; act: CrmAct | null }>({ open: false, act: null });
  const [editing, setEditing] = useState<{ amount: number; act_date: string; responsible_id: number | undefined; description: string }>(
    { amount: 0, act_date: '', responsible_id: undefined, description: '' }
  );
  const [editMode, setEditMode] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{
    contract_id: number | undefined;
    amount: number | undefined;
    act_date: Dayjs;
    responsible_id: number | undefined;
    description: string;
  }>({ contract_id: undefined, amount: undefined, act_date: dayjs(), responsible_id: undefined, description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ActsFilters = {};
      if (filterDate?.[0]) filters.date_from = filterDate[0].format('YYYY-MM-DD');
      if (filterDate?.[1]) filters.date_to = filterDate[1].format('YYYY-MM-DD');
      if (filterType) filters.type = filterType;
      if (filterStatus) filters.status = filterStatus;
      if (filterResp) filters.responsible_id = filterResp;
      if (searchText.trim()) filters.q = searchText.trim();
      const data = await actsApi.list(filters);
      setActs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось загрузить акты');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterType, filterStatus, filterResp, searchText, message]);

  useEffect(() => { load(); }, [load]);

  // Подгружаем договоры/сотрудников один раз для фильтров и формы создания.
  useEffect(() => {
    contractsApi.list().then((d) => setContracts(Array.isArray(d) ? d : [])).catch(() => undefined);
    employeesApi.list().then((d) => setEmployees(Array.isArray(d) ? d : [])).catch(() => undefined);
  }, []);

  const isResponsibleRole = (e: any) => {
    const role = String(e.position || e.role || e.user_role || '').toLowerCase();
    return role.includes('юрист')
      || role.includes('адвокат')
      || role.includes('эксперт')
      || role.includes('представит');
  };

  const responsibles = useMemo(() => employees.filter(isResponsibleRole), [employees]);

  // В создании акта подбираем список по типу договора:
  // «документы» — юрист/эксперт; «суд» — юрист/адвокат/представитель.
  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === createForm.contract_id) || null,
    [contracts, createForm.contract_id]
  );

  const responsibleOptionsForCreate = useMemo(() => {
    const ct = selectedContract?.contract_type || 'docs';
    return employees.filter((e: any) => {
      const role = String(e.position || e.role || e.user_role || '').toLowerCase();
      if (ct === 'court_rep') {
        return role.includes('юрист') || role.includes('адвокат') || role.includes('представит');
      }
      return role.includes('юрист') || role.includes('эксперт');
    });
  }, [employees, selectedContract]);

  const fmtEmployee = (e: any) => {
    const full = [e.last_name, e.first_name, e.middle_name].filter(Boolean).join(' ') || `#${e.id}`;
    return shortName(full);
  };

  const responsibleLabel = (selectedContract?.contract_type === 'court_rep')
    ? 'Ответственный (представитель/юрист) *'
    : 'Ответственный (юрист/эксперт) *';

  const openCreate = () => {
    setCreateForm({ contract_id: undefined, amount: undefined, act_date: dayjs(), responsible_id: undefined, description: '' });
    setCreateModal(true);
  };

  const submitCreate = async () => {
    if (!createForm.contract_id) {
      message.error('Выберите договор');
      return;
    }
    if (!createForm.amount || createForm.amount <= 0) {
      message.error('Сумма акта должна быть больше нуля');
      return;
    }
    if (!createForm.description || !createForm.description.trim()) {
      message.error('Опишите, что было сделано и за что сумма');
      return;
    }
    if (!createForm.responsible_id) {
      message.error('Выберите ответственного');
      return;
    }
    try {
      await actsApi.createForContract(createForm.contract_id, {
        amount: createForm.amount,
        act_date: createForm.act_date.format('YYYY-MM-DD'),
        responsible_id: createForm.responsible_id ?? null,
        description: createForm.description || null,
      });
      message.success('Акт создан в статусе «Черновик»');
      setCreateModal(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка создания акта');
    }
  };

  const openDetail = (a: CrmAct) => {
    setDetail({ open: true, act: a });
    setEditMode(false);
    setEditing({
      amount: typeof a.amount === 'string' ? parseFloat(a.amount) : (a.amount || 0),
      act_date: a.act_date,
      responsible_id: a.responsible_id ?? undefined,
      description: a.description || '',
    });
  };

  const saveEdit = async () => {
    if (!detail.act) return;
    try {
      await actsApi.update(detail.act.id, {
        amount: editing.amount,
        act_date: editing.act_date,
        responsible_id: editing.responsible_id ?? null,
        description: editing.description || null,
      });
      message.success('Акт обновлён');
      setEditMode(false);
      setDetail({ open: false, act: null });
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const confirmAct = async (a: CrmAct) => {
    try {
      await actsApi.confirm(a.id);
      message.success('Акт подтверждён');
      setDetail({ open: false, act: null });
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка подтверждения');
    }
  };

  const removeAct = async (a: CrmAct) => {
    try {
      await actsApi.remove(a.id);
      message.success('Акт удалён');
      setDetail({ open: false, act: null });
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка удаления');
    }
  };

  const columns: ColumnsType<CrmAct> = [
    {
      title: 'Дата акта',
      dataIndex: 'act_date',
      key: 'act_date',
      width: 120,
      render: (d) => (d ? dayjs(d).format('DD.MM.YYYY') : '—'),
      sorter: (a, b) => (a.act_date || '').localeCompare(b.act_date || ''),
      defaultSortOrder: 'descend',
    },
    { title: 'Клиент', dataIndex: 'client_name', key: 'client_name', render: (v) => v || '—' },
    {
      title: 'Договор',
      key: 'contract',
      width: 180,
      render: (_, r) => contractNumber(r.contract_id),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t) => <Tag color={typeColor(t)}>{typeLabel(t)}</Tag>,
    },
    {
      title: 'Сумма акта',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (v) => <span style={{ fontWeight: 600 }}>{formatMoney(v)}</span>,
      sorter: (a, b) => parseFloat(String(a.amount || 0)) - parseFloat(String(b.amount || 0)),
    },
    {
      title: 'Ответственный',
      dataIndex: 'responsible_full_name',
      key: 'resp',
      render: (v) => (v ? shortName(v) : <Tag>не назначен</Tag>),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center',
      render: (s) =>
        s === 'confirmed' ? (
          <Tag icon={<CheckCircleFilled />} color="success">Подтверждён</Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="default">Черновик</Tag>
        ),
    },
    { title: 'Офис', dataIndex: 'office_name', key: 'office_name', width: 140, render: (v) => v || '—' },
  ];

  return (
    <Page>
      <ToolRow>
        <Space size={12} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Поиск: ФИО, номер договора"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ minWidth: 260, maxWidth: 360 }}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Button type="primary" icon={<FileDoneOutlined />} onClick={openCreate}>Новый акт</Button>
        </Space>
      </ToolRow>

      <FiltersRow>
        <DatePicker.RangePicker
          value={filterDate as any}
          onChange={(v) => setFilterDate(v as any)}
          format="DD.MM.YYYY"
          allowEmpty={[true, true]}
          placeholder={['Период с', 'Период по']}
        />
        <Select
          allowClear
          placeholder="Тип сделки"
          style={{ minWidth: 160 }}
          value={filterType}
          onChange={(v) => setFilterType(v)}
          options={[
            { value: 'docs', label: 'Документы' },
            { value: 'court_rep', label: 'Суд' },
          ]}
        />
        <Select
          allowClear
          placeholder="Статус"
          style={{ minWidth: 150 }}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          options={[
            { value: 'draft', label: 'Черновик' },
            { value: 'confirmed', label: 'Подтверждён' },
          ]}
        />
        <Select
          allowClear
          showSearch
          placeholder="Ответственный"
          style={{ minWidth: 240 }}
          value={filterResp}
          onChange={(v) => setFilterResp(v)}
          optionFilterProp="label"
          options={responsibles.map((e: any) => ({
            value: e.id,
            label: fmtEmployee(e),
          }))}
        />
      </FiltersRow>

      <TableCard>
        <Table<CrmAct>
          rowKey="id"
          columns={columns}
          dataSource={acts}
          loading={loading}
          pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Нет актов по выбранным фильтрам" /> }}
          onRow={(r) => ({ onClick: () => openDetail(r) })}
        />
      </TableCard>

      {/* Модалка карточки акта */}
      <Modal
        title={detail.act ? `Акт №${detail.act.id} — ${detail.act.client_name || ''}` : 'Акт'}
        open={detail.open}
        onCancel={() => { setDetail({ open: false, act: null }); setEditMode(false); }}
        footer={null}
        width={620}
        destroyOnClose
      >
        {detail.act && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Клиент">{detail.act.client_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Договор">
                {contractNumber(detail.act.contract_id)}
                {detail.act.contract_title ? ` · ${detail.act.contract_title}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Тип">
                <Tag color={typeColor(detail.act.type)}>{typeLabel(detail.act.type)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата">
                {editMode
                  ? (
                    <DatePicker
                      value={editing.act_date ? dayjs(editing.act_date) : null}
                      onChange={(d) => setEditing((prev) => ({ ...prev, act_date: d ? d.format('YYYY-MM-DD') : '' }))}
                      format="DD.MM.YYYY"
                    />
                  )
                  : dayjs(detail.act.act_date).format('DD.MM.YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Сумма">
                {editMode
                  ? (
                    <InputNumber
                      value={editing.amount}
                      min={0}
                      step={1000}
                      style={{ width: 200 }}
                      onChange={(v) => setEditing((prev) => ({ ...prev, amount: Number(v) || 0 }))}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    />
                  )
                  : <b>{formatMoney(detail.act.amount)}</b>}
              </Descriptions.Item>
              <Descriptions.Item label="Ответственный">
                {editMode
                  ? (
                    <Select
                      allowClear
                      showSearch
                      style={{ minWidth: 280 }}
                      value={editing.responsible_id}
                      onChange={(v) => setEditing((prev) => ({ ...prev, responsible_id: v }))}
                      optionFilterProp="label"
                      options={responsibles.map((e: any) => ({
                        value: e.id,
                        label: fmtEmployee(e),
                      }))}
                    />
                  )
                  : (detail.act.responsible_full_name ? shortName(detail.act.responsible_full_name) : '—')}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                {detail.act.status === 'confirmed'
                  ? <Tag icon={<CheckCircleFilled />} color="success">Подтверждён</Tag>
                  : <Tag icon={<ClockCircleOutlined />} color="default">Черновик</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Офис">{detail.act.office_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Описание">
                {editMode
                  ? <Input.TextArea rows={3} value={editing.description} onChange={(e) => setEditing((prev) => ({ ...prev, description: e.target.value }))} />
                  : (detail.act.description || '—')}
              </Descriptions.Item>
            </Descriptions>
            <Space wrap>
              {detail.act.status === 'draft' && !editMode && (
                <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>Редактировать</Button>
              )}
              {detail.act.status === 'draft' && editMode && (
                <>
                  <Button type="primary" onClick={saveEdit}>Сохранить</Button>
                  <Button onClick={() => setEditMode(false)}>Отмена</Button>
                </>
              )}
              {detail.act.status === 'draft' && !editMode && (
                <Popconfirm
                  title="Подтвердить акт?"
                  description="После подтверждения редактирование станет невозможным."
                  okText="Подтвердить"
                  cancelText="Отмена"
                  onConfirm={() => confirmAct(detail.act!)}
                >
                  <Button type="primary" icon={<CheckCircleFilled />}>Подтвердить акт</Button>
                </Popconfirm>
              )}
              {detail.act.status === 'draft' && !editMode && (
                <Popconfirm title="Удалить акт?" okText="Удалить" cancelText="Отмена" onConfirm={() => removeAct(detail.act!)}>
                  <Button danger icon={<DeleteOutlined />}>Удалить</Button>
                </Popconfirm>
              )}
              {detail.act.status === 'confirmed' && (
                <Tooltip title="Подтверждённый акт нельзя изменить">
                  <Tag icon={<InfoCircleOutlined />} color="processing">Только просмотр</Tag>
                </Tooltip>
              )}
            </Space>
          </div>
        )}
      </Modal>

      {/* Модалка создания акта */}
      <Modal
        title="Новый акт"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={submitCreate}
        okText="Создать"
        cancelText="Отмена"
        destroyOnClose
        width={520}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Договор *</label>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Выберите договор"
              value={createForm.contract_id}
              onChange={(v) => {
                const c = contracts.find((x) => x.id === v);
                setCreateForm((prev) => ({
                  ...prev,
                  contract_id: v,
                  responsible_id: c?.expert_id ?? prev.responsible_id,
                }));
              }}
              optionFilterProp="label"
              options={contracts.map((c) => ({
                value: c.id,
                label: `${contractNumber(c.id)} · ${c.client_name || ''} · ${c.title || ''}`,
              }))}
            />
            <div style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 4 }}>
              Тип акта (документы / суд) подтянется из договора автоматически.
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Сумма акта, ₽ *</label>
            <InputNumber
              value={createForm.amount}
              min={0}
              step={1000}
              style={{ width: '100%' }}
              onChange={(v) => setCreateForm((prev) => ({ ...prev, amount: Number(v) || 0 }))}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Дата акта</label>
            <DatePicker
              value={createForm.act_date}
              onChange={(d) => setCreateForm((prev) => ({ ...prev, act_date: d || dayjs() }))}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>{responsibleLabel}</label>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Начните вводить фамилию"
              value={createForm.responsible_id}
              onChange={(v) => setCreateForm((prev) => ({ ...prev, responsible_id: v }))}
              optionFilterProp="label"
              options={responsibleOptionsForCreate.map((e: any) => ({
                value: e.id,
                label: fmtEmployee(e),
              }))}
              notFoundContent="Нет подходящих сотрудников в этом офисе"
            />
            <div style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 4 }}>
              В выпадающем списке фамилия и инициалы юриста или представителя — выборка зависит от типа договора.
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Описание *</label>
            <Input.TextArea
              rows={4}
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={selectedContract?.contract_type === 'court_rep'
                ? 'Опишите выполненную работу и за что взята сумма'
                : 'Какой пакет документов был подготовлен и выдан клиенту'}
            />
          </div>
        </Space>
      </Modal>
    </Page>
  );
};

export default Acts;
