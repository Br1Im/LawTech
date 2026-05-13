import React, { useState } from 'react';
import styled from '@emotion/styled';
import {
  Table, Button, Space, App, Modal, Input, Popconfirm, Tag,
} from 'antd';
import { TableSkeleton, EmptyState } from './ui';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useCrmList, useCrmMutation } from '../shared/api/queryHooks';

const Page = styled.div`display:flex;flex-direction:column;gap:18px;padding:8px 0 0;`;
const ToolRow = styled.div`display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;`;
const TableCard = styled.div`
  border-radius:var(--radius-lg);background:var(--glass-bg);backdrop-filter:blur(14px) saturate(140%);
  border:1px solid var(--glass-border);box-shadow:var(--glass-shadow);padding:8px 8px 4px;overflow:hidden;
  .ant-table-wrapper{background:transparent;}.ant-table{background:transparent;}
  .ant-table-thead>tr>th{background:transparent!important;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--color-muted);}
  .ant-table-tbody>tr>td{background:transparent!important;}
  .ant-table-tbody>tr:hover>td{background:rgba(30,64,175,0.03)!important;}
`;

interface Application {
  id: number;
  client_name: string;
  topic: string;
  status: string;
  created_at: string;
  lawyer_name?: string;
  comment?: string;
}

const Applications: React.FC = () => {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ client_name: '', topic: '', lawyer_name: '', comment: '' });

  const { data = [], isPending, isFetching, refetch } = useCrmList<Application>('applications');
  const loading = isFetching;

  const createMut = useCrmMutation<typeof form>(
    { resource: 'applications', method: 'post' },
    {
      onSuccess: () => {
        message.success('Заявление создано');
        setModalOpen(false);
        setForm({ client_name: '', topic: '', lawyer_name: '', comment: '' });
      },
      onError: () => message.error('Ошибка при создании'),
    },
  );

  const deleteMut = useCrmMutation<{ id: number }>(
    { resource: 'applications', method: 'delete', url: ({ id }) => `/applications/${id}` },
    {
      onSuccess: () => message.success('Удалено'),
      onError: () => message.error('Ошибка при удалении'),
    },
  );

  const handleCreate = () => createMut.mutate(form);
  const handleDelete = (id: number) => deleteMut.mutate({ id });
  const load = () => { refetch(); };

  const columns: ColumnsType<Application> = [
    { title: 'ФИО клиента', dataIndex: 'client_name', key: 'client_name',
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v || '—'}</span> },
    { title: 'Тема', dataIndex: 'topic', key: 'topic', ellipsis: true },
    { title: 'Юрист', dataIndex: 'lawyer_name', key: 'lawyer_name', width: 150 },
    { title: 'Статус', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string) => <Tag color={v === 'done' ? 'green' : v === 'in_progress' ? 'blue' : 'gold'}>{v === 'done' ? 'Готово' : v === 'in_progress' ? 'В работе' : 'Новое'}</Tag> },
    { title: 'Дата', dataIndex: 'created_at', key: 'created_at', width: 110,
      render: (v: string) => v ? new Date(v).toLocaleDateString('ru-RU') : '—' },
    { title: 'Комментарий', dataIndex: 'comment', key: 'comment', ellipsis: true },
    { title: '', key: 'act', width: 50,
      render: (_, r) => (
        <Popconfirm title="Удалить?" okText="Да" cancelText="Нет" onConfirm={() => handleDelete(r.id)}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Page>
      <ToolRow>
        <Space size={12}>
          <FileTextOutlined style={{ fontSize: 20, color: 'var(--color-accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Заявления</span>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Добавить</Button>
        </Space>
      </ToolRow>
      <TableCard>
        {isPending && data.length === 0 ? (
          <TableSkeleton rows={8} cols={columns.length} withToolbar={false} />
        ) : (
          <Table<Application>
            rowKey="id"
            dataSource={data}
            columns={columns}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
            locale={{
              emptyText: (
                <EmptyState
                  title="Нет заявлений"
                  description="Заявления появятся здесь, как только вы их добавите."
                />
              ),
            }}
            size="middle"
          />
        )}
      </TableCard>

      <Modal
        title="Новое заявление"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        okText="Создать"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>ФИО клиента</div>
            <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Тема</div>
            <Input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Юрист</div>
            <Input value={form.lawyer_name} onChange={(e) => setForm((f) => ({ ...f, lawyer_name: e.target.value }))} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>Комментарий</div>
            <Input.TextArea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} rows={3} />
          </div>
        </div>
      </Modal>
    </Page>
  );
};

export default Applications;
