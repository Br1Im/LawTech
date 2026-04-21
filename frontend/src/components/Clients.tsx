import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  Space,
  Tag,
  Popconfirm,
  Tooltip,
  App,
  Select,
  Segmented,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { clientsApi, type CrmClient } from '../shared/api/crm';

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

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-text);
  }
  span {
    color: var(--color-muted);
    font-size: 13.5px;
  }
`;

const ToolRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
`;

const StatCard = styled.div`
  padding: 18px 20px;
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 48px rgba(15,23,42,0.12);
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-muted);
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .value {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.01em;
  }
  .sub {
    font-size: 12px;
    color: var(--color-muted);
  }
  svg { color: var(--color-accent); }
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

const StatusTag: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = (status || 'active').toLowerCase();
  const map: Record<string, { color: string; label: string }> = {
    active: { color: 'green', label: 'Активен' },
    prospective: { color: 'gold', label: 'Потенциальный' },
    archived: { color: 'default', label: 'Архив' },
    paused: { color: 'orange', label: 'На паузе' },
  };
  const cfg = map[s] || { color: 'blue', label: status || 'Активен' };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

const formatMoney = (value?: string | number | null) => {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

const Clients: React.FC<ClientsProps> = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmClient | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await clientsApi.list();
      setData(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || 'Не удалось загрузить клиентов');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return data.filter((c) => {
      if (statusFilter !== 'all' && (c.status || 'active') !== statusFilter) return false;
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    });
  }, [data, searchText, statusFilter]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((c) => (c.status || 'active') === 'active').length;
    const contracts = data.reduce((acc, c) => acc + (c.contracts_count || 0), 0);
    const totalSpent = data.reduce((acc, c) => {
      const n = typeof c.total_spent === 'string' ? parseFloat(c.total_spent) : (c.total_spent || 0);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    return { total, active, contracts, totalSpent };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (row: CrmClient) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      company: row.company || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      notes: row.notes || '',
      status: row.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await clientsApi.update(editing.id, values);
        message.success('Клиент обновлён');
      } else {
        await clientsApi.create(values);
        message.success('Клиент создан');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Не удалось сохранить клиента');
    }
  };

  const handleDelete = async (row: CrmClient) => {
    try {
      await clientsApi.remove(row.id);
      message.success('Клиент удалён');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось удалить клиента');
    }
  };

  const columns: ColumnsType<CrmClient> = [
    {
      title: 'Клиент',
      dataIndex: 'name',
      key: 'name',
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            {row.name}
          </span>
          {row.company && (
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              <HomeOutlined style={{ marginRight: 6 }} />
              {row.company}
            </span>
          )}
        </Space>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Контакты',
      key: 'contacts',
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          {row.phone ? (
            <span><PhoneOutlined style={{ marginRight: 6, color: 'var(--color-accent)' }} />{row.phone}</span>
          ) : null}
          {row.email ? (
            <a href={`mailto:${row.email}`} style={{ color: 'var(--color-text)' }}>
              <MailOutlined style={{ marginRight: 6, color: 'var(--color-accent)' }} />{row.email}
            </a>
          ) : null}
          {!row.phone && !row.email ? <span style={{ color: 'var(--color-muted)' }}>—</span> : null}
        </Space>
      ),
      responsive: ['md'],
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
      filters: [
        { text: 'Активные', value: 'active' },
        { text: 'Потенциальные', value: 'prospective' },
        { text: 'Архив', value: 'archived' },
      ],
      onFilter: (value, row) => (row.status || 'active') === value,
      width: 140,
    },
    {
      title: 'Договоры',
      dataIndex: 'contracts_count',
      key: 'contracts_count',
      render: (v) => (
        <Tag color="blue" icon={<FileTextOutlined />}>{v || 0}</Tag>
      ),
      sorter: (a, b) => (a.contracts_count || 0) - (b.contracts_count || 0),
      width: 130,
      responsive: ['sm'],
    },
    {
      title: 'Сумма',
      dataIndex: 'total_spent',
      key: 'total_spent',
      render: (v) => <span style={{ fontWeight: 600 }}>{formatMoney(v)}</span>,
      sorter: (a, b) => parseFloat(String(a.total_spent || 0)) - parseFloat(String(b.total_spent || 0)),
      align: 'right',
      width: 160,
      responsive: ['md'],
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Редактировать">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          <Popconfirm
            title="Удалить клиента?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(row)}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Page>
      <Header>
        <HeaderLeft>
          <h2>Клиенты</h2>
          <span>База клиентов офиса — сохраняется в БД, работает поиск и фильтры</span>
        </HeaderLeft>
        <ToolRow>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Новый клиент</Button>
        </ToolRow>
      </Header>

      <StatsGrid>
        <StatCard>
          <div className="label"><UserOutlined /> Всего</div>
          <div className="value">{stats.total}</div>
          <div className="sub">в базе офиса</div>
        </StatCard>
        <StatCard>
          <div className="label"><UserOutlined /> Активные</div>
          <div className="value">{stats.active}</div>
          <div className="sub">в работе</div>
        </StatCard>
        <StatCard>
          <div className="label"><FileTextOutlined /> Договоров</div>
          <div className="value">{stats.contracts}</div>
          <div className="sub">по всем клиентам</div>
        </StatCard>
        <StatCard>
          <div className="label"><DollarOutlined /> Оборот</div>
          <div className="value">{formatMoney(stats.totalSpent)}</div>
          <div className="sub">суммарно</div>
        </StatCard>
      </StatsGrid>

      <ToolRow>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Поиск по имени, компании, телефону, email"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <Segmented
          value={statusFilter}
          onChange={(v) => setStatusFilter(String(v))}
          options={[
            { label: 'Все', value: 'all' },
            { label: 'Активные', value: 'active' },
            { label: 'Потенциальные', value: 'prospective' },
            { label: 'Архив', value: 'archived' },
          ]}
        />
      </ToolRow>

      <TableCard>
        <Table<CrmClient>
          rowKey="id"
          dataSource={filtered}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Клиентов пока нет — создайте первого" /> }}
          size="middle"
        />
      </TableCard>

      <Modal
        title={editing ? `Редактирование клиента #${editing.id}` : 'Новый клиент'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 12 }}>
          <Form.Item
            label="Имя / ФИО"
            name="name"
            rules={[{ required: true, message: 'Укажите имя клиента' }]}
          >
            <Input placeholder="Иван Петров" />
          </Form.Item>
          <Form.Item label="Компания" name="company">
            <Input placeholder="ООО «Ромашка»" />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item label="Телефон" name="phone" style={{ flex: 1 }}>
              <Input placeholder="+7 900 000-00-00" />
            </Form.Item>
            <Form.Item label="Email" name="email" style={{ flex: 1, marginLeft: 8 }}
              rules={[{ type: 'email', message: 'Некорректный email' }]}>
              <Input placeholder="name@example.com" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Адрес" name="address">
            <Input placeholder="Город, улица, дом" />
          </Form.Item>
          <Form.Item label="Статус" name="status">
            <Select
              options={[
                { value: 'active', label: 'Активный' },
                { value: 'prospective', label: 'Потенциальный' },
                { value: 'paused', label: 'На паузе' },
                { value: 'archived', label: 'В архиве' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} placeholder="Любая дополнительная информация" />
          </Form.Item>
        </Form>
      </Modal>
    </Page>
  );
};

const ClientsWithApp: React.FC<ClientsProps> = (props) => (
  <App>
    <Clients {...props} />
  </App>
);

export default ClientsWithApp;
