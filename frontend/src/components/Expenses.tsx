import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table, Input, Button, Modal, Form, InputNumber, DatePicker, Select,
  Space, Tag, Popconfirm, Tooltip, App, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, ReloadOutlined, ArrowDownOutlined, CalendarOutlined, TagOutlined,
} from '@ant-design/icons';
import CrmPageShell, { TableCard, Toolbar } from './crm/CrmPageShell';
import { expensesApi, type CrmExpense } from '../shared/api/crm';

const CATEGORY_OPTIONS = [
  'Аренда', 'Зарплата', 'Налоги', 'Маркетинг', 'Офис',
  'Юр. услуги', 'Командировки', 'IT', 'Прочее',
];

const formatMoney = (v?: string | number | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(n);
};

const ExpensesInner: React.FC = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<CrmExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmExpense | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await expensesApi.list();
      setData(Array.isArray(list) ? list : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось загрузить расходы');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        (r.title || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [data, search, categoryFilter]);

  const stats = useMemo(() => {
    const total = data.reduce((a, r) => a + parseFloat(String(r.amount || 0)), 0);
    const now = dayjs();
    const thisMonth = data
      .filter((r) => dayjs(r.spent_on).isSame(now, 'month'))
      .reduce((a, r) => a + parseFloat(String(r.amount || 0)), 0);
    const byCat: Record<string, number> = {};
    data.forEach((r) => {
      byCat[r.category || 'Прочее'] = (byCat[r.category || 'Прочее'] || 0) + parseFloat(String(r.amount || 0));
    });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    return { total, thisMonth, count: data.length, topCat };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ spent_on: dayjs(), category: 'Офис' });
    setModalOpen(true);
  };

  const openEdit = (row: CrmExpense) => {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      category: row.category,
      amount: parseFloat(String(row.amount)),
      description: row.description || '',
      spent_on: row.spent_on ? dayjs(row.spent_on) : dayjs(),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        title: v.title,
        category: v.category,
        amount: v.amount,
        description: v.description,
        spent_on: (v.spent_on as dayjs.Dayjs).format('YYYY-MM-DD'),
      };
      if (editing) {
        await expensesApi.update(editing.id, payload);
        message.success('Расход обновлён');
      } else {
        await expensesApi.create(payload);
        message.success('Расход создан');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Не удалось сохранить');
    }
  };

  const remove = async (row: CrmExpense) => {
    try {
      await expensesApi.remove(row.id);
      message.success('Удалено');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  const columns: ColumnsType<CrmExpense> = [
    {
      title: 'Дата', dataIndex: 'spent_on', key: 'spent_on', width: 120,
      render: (v) => dayjs(v).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.spent_on).unix() - dayjs(b.spent_on).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Статья', dataIndex: 'title', key: 'title',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <strong style={{ color: 'var(--color-text)' }}>{r.title}</strong>
          {r.description && <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.description}</span>}
        </Space>
      ),
    },
    {
      title: 'Категория', dataIndex: 'category', key: 'category',
      render: (c) => <Tag color="purple" icon={<TagOutlined />}>{c || '—'}</Tag>,
      width: 170,
    },
    {
      title: 'Сумма', dataIndex: 'amount', key: 'amount', align: 'right', width: 160,
      render: (v) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatMoney(v)}</span>,
      sorter: (a, b) => parseFloat(String(a.amount)) - parseFloat(String(b.amount)),
    },
    {
      title: 'Автор', dataIndex: 'created_by_name', key: 'created_by_name',
      render: (v) => v || '—', responsive: ['lg'], width: 180,
    },
    {
      title: '', key: 'actions', width: 110, align: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Редактировать">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          <Popconfirm title="Удалить расход?" onConfirm={() => remove(row)} okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <CrmPageShell
      title="Расходы"
      subtitle="Операционные затраты офиса — категории, аналитика, CRUD с сохранением в БД"
      actions={
        <>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Новый расход</Button>
        </>
      }
      stats={[
        { label: 'За всё время', value: formatMoney(stats.total), sub: `${stats.count} записей`, icon: <DollarOutlined /> },
        { label: 'В этом месяце', value: formatMoney(stats.thisMonth), sub: dayjs().format('MMMM YYYY'), icon: <CalendarOutlined /> },
        { label: 'Крупнейшая категория', value: stats.topCat?.[0] || '—', sub: stats.topCat ? formatMoney(stats.topCat[1]) : undefined, icon: <TagOutlined /> },
        { label: 'Средний чек', value: formatMoney(stats.count ? stats.total / stats.count : 0), sub: 'на запись', icon: <ArrowDownOutlined /> },
      ]}
      toolbar={
        <Toolbar>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Поиск по статье, описанию"
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 380 }} />
          <Select allowClear placeholder="Категория" style={{ minWidth: 180 }}
            value={categoryFilter} onChange={setCategoryFilter}
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
        </Toolbar>
      }
    >
      <TableCard>
        <Table<CrmExpense> rowKey="id" dataSource={filtered} columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Расходов пока нет" /> }} />
      </TableCard>

      <Modal
        title={editing ? `Редактирование расхода #${editing.id}` : 'Новый расход'}
        open={modalOpen} onOk={submit} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Сохранить' : 'Создать'} cancelText="Отмена"
        destroyOnClose width={520}
      >
        <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 12 }}>
          <Form.Item label="Назначение" name="title" rules={[{ required: true, message: 'Укажите назначение' }]}>
            <Input placeholder="Аренда офиса за март" />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item label="Категория" name="category" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item label="Сумма" name="amount" style={{ flex: 1, marginLeft: 8 }} rules={[{ required: true, message: 'Укажите сумму' }]}>
              <InputNumber<number> style={{ width: '100%' }} min={0} step={1000}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(v) => Number((v || '').replace(/\s/g, ''))} addonAfter="₽" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Дата" name="spent_on" rules={[{ required: true }]}>
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

const Expenses: React.FC = () => (<App><ExpensesInner /></App>);
export default Expenses;
