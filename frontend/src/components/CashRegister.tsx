import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import {
  Table, Button, Space, App, Empty, Tag, Modal, Input, DatePicker, InputNumber,
  Popconfirm, Descriptions, Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined, DollarOutlined,
} from '@ant-design/icons';
import { cashRegisterApi, type CashEntry } from '../shared/api/crm';

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
  .ant-table-tbody > tr:hover > td { background: rgba(30,64,175,0.03) !important; }
`;

const fmt = (v?: number | string | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n) || n === 0) return '';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
};

const fmtMoney = (v?: number | string | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

interface GroupedData {
  date: string;
  entries: CashEntry[];
  totalCash: number;
  totalNoncash: number;
  totalBank: number;
  totalExpense: number;
}

const CashRegister: React.FC = () => {
  const { message } = App.useApp();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);
  const [form, setForm] = useState({
    entry_date: dayjs(),
    client_name: '',
    contract_number: '',
    action: '',
    lawyer_name: '',
    cash_amount: 0,
    noncash_amount: 0,
    bank_amount: 0,
    expense_amount: 0,
    comment: '',
  });

  const cashInitRef = React.useRef(true);
  const load = useCallback(async () => {
    if (cashInitRef.current) setLoading(true);
    try {
      const data = await cashRegisterApi.list({
        date_from: dateRange[0].format('YYYY-MM-DD'),
        date_to: dateRange[1].format('YYYY-MM-DD'),
      });
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      message.error('Ошибка загрузки кассы');
    } finally {
      if (cashInitRef.current) { setLoading(false); cashInitRef.current = false; }
    }
  }, [message, dateRange]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo<GroupedData[]>(() => {
    const map = new Map<string, CashEntry[]>();
    for (const e of entries) {
      const d = e.entry_date?.slice(0, 10) || '';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    const result: GroupedData[] = [];
    for (const [date, ents] of map) {
      result.push({
        date,
        entries: ents,
        totalCash: ents.reduce((s, e) => s + parseFloat(String(e.cash_amount || 0)), 0),
        totalNoncash: ents.reduce((s, e) => s + parseFloat(String(e.noncash_amount || 0)), 0),
        totalBank: ents.reduce((s, e) => s + parseFloat(String(e.bank_amount || 0)), 0),
        totalExpense: ents.reduce((s, e) => s + parseFloat(String(e.expense_amount || 0)), 0),
      });
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [entries]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await cashRegisterApi.create({
        entry_date: form.entry_date.format('YYYY-MM-DD'),
        client_name: form.client_name || undefined,
        contract_number: form.contract_number || undefined,
        action: form.action || undefined,
        lawyer_name: form.lawyer_name || undefined,
        cash_amount: form.cash_amount || 0,
        noncash_amount: form.noncash_amount || 0,
        bank_amount: form.bank_amount || 0,
        expense_amount: form.expense_amount || 0,
        comment: form.comment || undefined,
      });
      message.success('Запись добавлена');
      setModalOpen(false);
      setForm({ entry_date: dayjs(), client_name: '', contract_number: '', action: '', lawyer_name: '', cash_amount: 0, noncash_amount: 0, bank_amount: 0, expense_amount: 0, comment: '' });
      load();
    } catch {
      message.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await cashRegisterApi.remove(id);
      message.success('Удалено');
      load();
    } catch {
      message.error('Ошибка при удалении');
    }
  };

  const columns: ColumnsType<CashEntry> = [
    { title: 'ФИО клиента', dataIndex: 'client_name', key: 'client_name', ellipsis: true,
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v || '—'}</span> },
    { title: '№ договора', dataIndex: 'contract_number', key: 'contract_number', width: 120 },
    { title: 'Действие', dataIndex: 'action', key: 'action', width: 130, ellipsis: true },
    { title: 'Юрист', dataIndex: 'lawyer_name', key: 'lawyer_name', width: 130 },
    { title: 'Наличный расчёт', dataIndex: 'cash_amount', key: 'cash_amount', width: 130, align: 'right',
      render: (v: number) => <span style={{ color: '#3aa56b', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: 'Безналичный расчёт', dataIndex: 'noncash_amount', key: 'noncash_amount', width: 140, align: 'right',
      render: (v: number) => <span style={{ color: '#3b82f6', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: 'Расчётный счёт', dataIndex: 'bank_amount', key: 'bank_amount', width: 130, align: 'right',
      render: (v: number) => <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: 'Расходы', dataIndex: 'expense_amount', key: 'expense_amount', width: 110, align: 'right',
      render: (v: number) => v ? <span style={{ color: '#e74c3c', fontWeight: 600 }}>{fmt(v)}</span> : '' },
    { title: '', key: 'actions', width: 50,
      render: (_, row) => (
        <Popconfirm title="Удалить запись?" okText="Да" cancelText="Нет" onConfirm={() => handleDelete(row.id)}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Page>
      <ToolRow>
        <Space size={12} wrap>
          <DollarOutlined style={{ fontSize: 20, color: 'var(--color-accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Касса</span>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
            format="DD.MM.YYYY"
            allowClear={false}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => load()}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Добавить</Button>
        </Space>
      </ToolRow>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : grouped.length === 0 ? (
        <Empty description="Нет записей за выбранный период" />
      ) : (
        grouped.map((g) => (
          <TableCard key={g.date}>
            <div style={{
              padding: '8px 12px',
              fontWeight: 700,
              fontSize: 14,
              background: 'rgba(0,180,180,0.12)',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{new Date(g.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              <Space size={16}>
                {g.totalCash > 0 && <Tag color="green">Наличные: {fmtMoney(g.totalCash)}</Tag>}
                {g.totalNoncash > 0 && <Tag color="blue">Безнал: {fmtMoney(g.totalNoncash)}</Tag>}
                {g.totalBank > 0 && <Tag color="purple">Р/С: {fmtMoney(g.totalBank)}</Tag>}
                {g.totalExpense > 0 && <Tag color="red">Расходы: {fmtMoney(g.totalExpense)}</Tag>}
              </Space>
            </div>
            <Table<CashEntry>
              rowKey="id"
              dataSource={g.entries}
              columns={columns}
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="Нет записей" /> }}
            />
          </TableCard>
        ))
      )}

      <Modal
        title="Новая запись в кассу"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={saving}
        okText="Добавить"
        cancelText="Отмена"
        width={520}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Дата</div>
            <DatePicker
              value={form.entry_date}
              onChange={(d) => setForm((f) => ({ ...f, entry_date: d || dayjs() }))}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>ФИО клиента</div>
            <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Иванов Иван Иванович" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>№ договора</div>
              <Input value={form.contract_number} onChange={(e) => setForm((f) => ({ ...f, contract_number: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Действие</div>
              <Input value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))} />
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Юрист</div>
            <Input value={form.lawyer_name} onChange={(e) => setForm((f) => ({ ...f, lawyer_name: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500, color: '#3aa56b' }}>Наличные</div>
              <InputNumber value={form.cash_amount} onChange={(v) => setForm((f) => ({ ...f, cash_amount: v || 0 }))}
                min={0} style={{ width: '100%' }} addonAfter="₽" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500, color: '#3b82f6' }}>Безналичный</div>
              <InputNumber value={form.noncash_amount} onChange={(v) => setForm((f) => ({ ...f, noncash_amount: v || 0 }))}
                min={0} style={{ width: '100%' }} addonAfter="₽" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500, color: '#8b5cf6' }}>Расчётный счёт</div>
              <InputNumber value={form.bank_amount} onChange={(v) => setForm((f) => ({ ...f, bank_amount: v || 0 }))}
                min={0} style={{ width: '100%' }} addonAfter="₽" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, fontWeight: 500, color: '#e74c3c' }}>Расходы</div>
              <InputNumber value={form.expense_amount} onChange={(v) => setForm((f) => ({ ...f, expense_amount: v || 0 }))}
                min={0} style={{ width: '100%' }} addonAfter="₽" />
            </div>
          </div>
        </div>
      </Modal>
    </Page>
  );
};

export default CashRegister;
