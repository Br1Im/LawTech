import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table, Input, Button, Modal, Form, Select,
  Space, Tag, Popconfirm, Tooltip, App, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  FileOutlined, ReloadOutlined, LinkOutlined, FolderOpenOutlined, TagOutlined,
} from '@ant-design/icons';
import CrmPageShell, { TableCard, Toolbar } from './crm/CrmPageShell';
import { materialsApi, type CrmMaterial } from '../shared/api/crm';

const CATEGORY_OPTIONS = [
  'Шаблон', 'Образец', 'Инструкция', 'Регламент', 'Презентация', 'Чек-лист', 'Прочее',
];

const MaterialsInner: React.FC = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<CrmMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmMaterial | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await materialsApi.list();
      setData(Array.isArray(list) ? list : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось загрузить материалы');
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
        (r.name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [data, search, categoryFilter]);

  const stats = useMemo(() => {
    const byCat: Record<string, number> = {};
    data.forEach((r) => { byCat[r.category || 'Прочее'] = (byCat[r.category || 'Прочее'] || 0) + 1; });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const withFile = data.filter((r) => r.file_url).length;
    return { total: data.length, withFile, topCat };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ category: 'Шаблон' });
    setModalOpen(true);
  };

  const openEdit = (row: CrmMaterial) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      category: row.category,
      description: row.description || '',
      file_url: row.file_url || '',
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      const v = await form.validateFields();
      if (editing) {
        await materialsApi.update(editing.id, v);
        message.success('Материал обновлён');
      } else {
        await materialsApi.create(v);
        message.success('Материал создан');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Не удалось сохранить');
    }
  };

  const remove = async (row: CrmMaterial) => {
    try {
      await materialsApi.remove(row.id);
      message.success('Удалено');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  const columns: ColumnsType<CrmMaterial> = [
    {
      title: 'Название', dataIndex: 'name', key: 'name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <strong style={{ color: 'var(--color-text)' }}>
            <FileOutlined style={{ marginRight: 8, color: 'var(--color-accent)' }} />{r.name}
          </strong>
          {r.description && <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.description}</span>}
        </Space>
      ),
    },
    {
      title: 'Категория', dataIndex: 'category', key: 'category', width: 180,
      render: (c) => <Tag color="geekblue" icon={<TagOutlined />}>{c || '—'}</Tag>,
    },
    {
      title: 'Файл', dataIndex: 'file_url', key: 'file_url', width: 140,
      render: (v) => v
        ? <a href={v} target="_blank" rel="noreferrer"><LinkOutlined /> открыть</a>
        : <span style={{ color: 'var(--color-muted)' }}>—</span>,
    },
    {
      title: 'Добавлено', dataIndex: 'created_at', key: 'created_at', width: 140,
      render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—', responsive: ['md'],
    },
    {
      title: '', key: 'actions', width: 110, align: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Редактировать">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          <Popconfirm title="Удалить материал?" onConfirm={() => remove(row)} okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <CrmPageShell
      title="Материалы"
      subtitle="Шаблоны, образцы документов, внутренние регламенты"
      actions={
        <>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Новый материал</Button>
        </>
      }
      stats={[
        { label: 'Всего', value: stats.total, sub: 'в библиотеке', icon: <FolderOpenOutlined /> },
        { label: 'С файлом', value: stats.withFile, sub: 'прикрепленные', icon: <FileOutlined /> },
        { label: 'Топ-категория', value: stats.topCat?.[0] || '—', sub: stats.topCat ? `${stats.topCat[1]} шт.` : undefined, icon: <TagOutlined /> },
      ]}
      toolbar={
        <Toolbar>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Поиск по названию, описанию"
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 380 }} />
          <Select allowClear placeholder="Категория" style={{ minWidth: 180 }}
            value={categoryFilter} onChange={setCategoryFilter}
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
        </Toolbar>
      }
    >
      <TableCard>
        <Table<CrmMaterial> rowKey="id" dataSource={filtered} columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Материалов пока нет" /> }} />
      </TableCard>

      <Modal
        title={editing ? `Редактирование материала #${editing.id}` : 'Новый материал'}
        open={modalOpen} onOk={submit} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Сохранить' : 'Создать'} cancelText="Отмена"
        destroyOnClose width={520}
      >
        <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 12 }}>
          <Form.Item label="Название" name="name" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input placeholder="Шаблон договора оказания услуг" />
          </Form.Item>
          <Form.Item label="Категория" name="category" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} placeholder="Для чего используется, краткое описание" />
          </Form.Item>
          <Form.Item label="Ссылка на файл" name="file_url">
            <Input placeholder="/templates/services.docx или https://…" />
          </Form.Item>
        </Form>
      </Modal>
    </CrmPageShell>
  );
};

const Materials: React.FC = () => (<App><MaterialsInner /></App>);
export default Materials;
