import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table, Input, Button, Modal, Form, InputNumber, DatePicker, Select,
  Space, Tag, Popconfirm, Tooltip, App, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, ReloadOutlined, ArrowUpOutlined, CalendarOutlined, UserOutlined,
} from '@ant-design/icons';
import CrmPageShell, { TableCard, Toolbar } from './crm/CrmPageShell';
import { arrivalsApi, clientsApi, type CrmArrival, type CrmClient } from '../shared/api/crm';

const SOURCE_OPTIONS = [
  'Оплата по договору', 'Предоплата', 'Постоплата', 'Консультация', 'Штраф', 'Прочее',
];

const formatMoney = (v?: string | number | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

const ArrivalsInner: React.FC = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<CrmArrival[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmArrival | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cs] = await Promise.all([arrivalsApi.list(), clientsApi.list()]);
      setData(Array.isArray(list) ? list : []);
      setClients(Array.isArray(cs) ? cs : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось загрузить поступления');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        (r.title || '').toLowerCase().includes(q) ||
        (r.client_name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [data, search, sourceFilter]);

  const stats = useMemo(() => {
    const total = data.reduce((a, r) => a + parseFloat(String(r.amount || 0)), 0);
    const now = dayjs();
    const thisMonth = data
      .filter((r) => dayjs(r.received_on).isSame(now, 'month'))
      .reduce((a, r) => a + parseFloat(String(r.amount || 0)), 0);
    const uniqueClients = new Set(data.filter((r) => r.client_id).map((r) => r.client_id)).size;
    return { total, thisMonth, count: data.length, uniqueClients };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ received_on: dayjs(), source: 'Оплата по договору' });
    setModalOpen(true);
  };

  const openEdit = (row: CrmArrival) => {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      source: row.source,
      amount: parseFloat(String(row.amount)),
      description: row.description || '',
      client_id: row.client_id || undefined,
      received_on: row.received_on ? dayjs(row.received_on) : dayjs(),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        title: v.title,
        source: v.source,
        amount: v.amount,
        description: v.description,
        client_id: v.client_id || null,
        received_on: (v.received_on as dayjs.Dayjs).format('YYYY-MM-DD'),
      };
      if (editing) {
        await arrivalsApi.update(editing.id, payload);
        message.success('Поступление обновлено');
      } else {
        await arrivalsApi.create(payload);
        message.success('Поступление создано');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Не удалось сохранить');
    }
  };

  const remove = async (row: CrmArrival) => {
    try {
      await arrivalsApi.remove(row.id);
      message.success('Удалено');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  const columns: ColumnsType<CrmArrival> = [
    {
      title: 'Дата', dataIndex: 'received_on', key: 'received_on', width: 120,
      render: (v) => dayjs(v).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.received_on).unix() - dayjs(b.received_on).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Назначение', dataIndex: 'title', key: 'title',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <strong style={{ color: 'var(--color-text)' }}>{r.title}</strong>
          {r.client_name && (
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              <UserOutlined style={{ marginRight: 6 }} />{r.client_name}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: 'Источник', dataIndex: 'source', key: 'source', width: 180,
      render: (s) => <Tag color="cyan">{s}</Tag>,
    },
    {
      title: 'Сумма', dataIndex: 'amount', key: 'amount', align: 'right', width: 160,
      render: (v) => <span style={{ color: '#22c55e', fontWeight: 600 }}>+ {formatMoney(v)}</span>,
      sorter: (a, b) => parseFloat(String(a.amount)) - parseFloat(String(b.amount)),
    },
    {
      title: '', key: 'actions', width: 110, align: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Редактировать">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          <Popconfirm title="Удалить поступление?" onConfirm={() => remove(row)} okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <CrmPageShell
      title="Приходы"
      subtitle="Поступления и платежи от клиентов — сохраняются в БД, поиск и фильтры"
      actions={
        <>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Новое поступление</Button>
        </>
      }
      stats={[
        { label: 'Всего поступлений', value: formatMoney(stats.total), sub: `${stats.count} записей`, icon: <DollarOutlined /> },
        { label: 'В этом месяце', value: formatMoney(stats.thisMonth), sub: dayjs().format('MMMM YYYY'), icon: <CalendarOutlined /> },
        { label: 'Уникальных клиентов', value: stats.uniqueClients, sub: 'платили в офис', icon: <UserOutlined /> },
        { label: 'Средний чек', value: formatMoney(stats.count ? stats.total / stats.count : 0), sub: 'на транзакцию', icon: <ArrowUpOutlined /> },
      ]}
      toolbar={
        <Toolbar>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Поиск по назначению, клиенту"
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 380 }} />
          <Select allowClear placeholder="Источник" style={{ minWidth: 200 }}
            value={sourceFilter} onChange={setSourceFilter}
            options={SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))} />
        </Toolbar>
      }
    >
      <TableCard>
        <Table<CrmArrival> rowKey="id" dataSource={filtered} columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Поступлений пока нет" /> }} />
      </TableCard>

      <Modal
        title={editing ? `Редактирование прихода #${editing.id}` : 'Новое поступление'}
        open={modalOpen} onOk={submit} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Сохранить' : 'Создать'} cancelText="Отмена"
        destroyOnClose width={520}
      >
        <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 12 }}>
          <Form.Item label="Назначение" name="title" rules={[{ required: true, message: 'Укажите назначение' }]}>
            <Input placeholder="Оплата по договору №12" />
          </Form.Item>
          <Form.Item label="Клиент" name="client_id">
            <Select showSearch allowClear placeholder="Привязать к клиенту (необязательно)"
              optionFilterProp="label"
              options={clients.map((c) => ({ value: c.id, label: `${c.name}${c.company ? ' — ' + c.company : ''}` }))} />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item label="Источник" name="source" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select options={SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item label="Сумма" name="amount" style={{ flex: 1, marginLeft: 8 }} rules={[{ required: true, message: 'Укажите сумму' }]}>
              <InputNumber<number> style={{ width: '100%' }} min={0} step={1000}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(v) => Number((v || '').replace(/\s/g, ''))} addonAfter="₽" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Дата" name="received_on" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item label="Комментарий" name="description">
            <Input.TextArea rows={3} placeholder="Дополнительные детали" />
          </Form.Item>
        </Form>
      </Modal>
    </CrmPageShell>
  );
};

const Arrivals: React.FC = () => (<App><ArrivalsInner /></App>);
export default Arrivals;
