import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Input, Button, DatePicker, InputNumber, Select, Radio, Space, App, Divider, Checkbox,
} from 'antd';
import { contractsApi, type CrmEmployee } from '../shared/api/crm';
import { apiInstance } from '../shared/api/instance';

import { formatRussianPhone } from "../shared/lib/phone";
interface AppointmentInfo {
  id: number;
  client_name: string;
  client_phone?: string;
  comment?: string | null;
  assigned_lawyer_id?: number | null;
  assigned_lawyer_id_2?: number | null;
  assigned_lawyer_name?: string | null;
  assigned_lawyer_name_2?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentData?: AppointmentInfo | null;
}

const AdminContractRegister: React.FC<Props> = ({ open, onClose, onSuccess, appointmentData }) => {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    clientPhone: '',
    onBehalfOf: '',
    contractDate: dayjs(),
    contractNumber: '',
    title: '',
    contractType: 'docs' as 'docs' | 'court_rep',
    amount: null as number | null,
    paidAmount: null as number | null,
    paymentMethod: 'cash' as 'cash' | 'noncash' | 'bank',
    additionalPaymentDate: null as dayjs.Dayjs | null,
    additionalPaymentAmount: null as number | null,
    signedById: null as number | null,
    isJoint: false,
    secondLawyerId: null as number | null,
  });

  // Список сотрудников, кто может заключить договор (менеджер, юристы, Руководитель, директор)
  const [signers, setSigners] = useState<CrmEmployee[]>([]);

  const ROLE_LABELS: Record<string, string> = { lawyer: 'Юрист', manager: 'Менеджер', okk: 'Руководитель', director: 'Директор' };

  const loadSigners = useCallback(async () => {
    try {
      const res = await apiInstance.get('/visits/employees');
      const all: { id: number; name: string; role: string }[] = res.data?.data || [];
      const signerRoles = new Set(['manager', 'okk', 'director', 'lawyer']);
      setSigners(all.filter((e) => signerRoles.has(e.role)).map(e => {
        const parts = (e.name || '').split(' ');
        return {
          id: e.id,
          first_name: parts[0] || '',
          last_name: parts.slice(1).join(' ') || '',
          position: ROLE_LABELS[e.role] || e.role,
          user_role: e.role,
        } as CrmEmployee;
      }));
    } catch {
      setSigners([]);
    }
  }, []);

  const generateNumber = useCallback(async (date: dayjs.Dayjs) => {
    try {
      const res = await contractsApi.generateNumber(date.format('YYYY-MM-DD'));
      setForm((prev) => ({ ...prev, contractNumber: res.contract_number }));
    } catch {
      // fallback
    }
  }, []);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Only initialize form when modal first opens (not on re-renders)
      prevOpenRef.current = true;
      loadSigners();
      const today = dayjs();

      // Pre-fill from appointment data if available
      let lastName = '', firstName = '', middleName = '';
      if (appointmentData) {
        const parts = (appointmentData.client_name || '').split(' ');
        lastName = parts[0] || '';
        firstName = parts[1] || '';
        middleName = parts.slice(2).join(' ') || '';
      }
      const presetPhone = appointmentData?.client_phone || '';
      const presetTitle = (appointmentData?.comment || '').trim();
      const presetSigner = appointmentData?.assigned_lawyer_id ?? null;
      const presetSecond = appointmentData?.assigned_lawyer_id_2 ?? null;

      setForm({
        lastName, firstName, middleName,
        clientPhone: presetPhone,
        onBehalfOf: '',
        contractDate: today, contractNumber: '', title: presetTitle,
        contractType: 'docs', signedById: presetSigner, amount: null, paidAmount: null,
        paymentMethod: 'cash', additionalPaymentDate: null, additionalPaymentAmount: null,
        isJoint: !!presetSecond, secondLawyerId: presetSecond,
      });
      generateNumber(today);
    }
    if (!open) {
      prevOpenRef.current = false;
    }
  }, [open, loadSigners, generateNumber, appointmentData]);

  const needAdditionalPayment = form.amount !== null && form.paidAmount !== null
    && form.amount > 0 && form.paidAmount > 0 && form.paidAmount < form.amount;

  const handleSave = async () => {
    if (!form.lastName.trim()) { message.warning('Укажите фамилию клиента'); return; }
    if (!form.firstName.trim()) { message.warning('Укажите имя клиента'); return; }
    if (!form.signedById) { message.warning('Юрист не назначен. Назначение выполняет Директор / Менеджер / Руководитель во вкладке «Приёмы».'); return; }
    if (!form.amount || form.amount <= 0) { message.warning('Укажите сумму договора'); return; }
    if (!form.paidAmount && form.paidAmount !== 0) { message.warning('Укажите сумму внесения'); return; }
    if (form.isJoint && !form.secondLawyerId) { message.warning('Укажите второго юриста'); return; }
    if (form.isJoint && form.secondLawyerId === form.signedById) { message.warning('Второй юрист должен отличаться от первого'); return; }

    const clientName = [form.lastName.trim(), form.firstName.trim(), form.middleName.trim()].filter(Boolean).join(' ');

    setSaving(true);
    try {
      await contractsApi.create({
        admin_register: true,
        client_name: clientName,
        client_phone: form.clientPhone.trim() || undefined,
        id_employee: form.signedById,
        signed_by: form.signedById || undefined,
        is_joint: form.isJoint,
        second_employee_id: form.isJoint ? form.secondLawyerId : undefined,
        contract_date: form.contractDate.format('YYYY-MM-DD'),
        contract_number: form.contractNumber || undefined,
        title: form.title || undefined,
        contract_type: form.contractType,
        amount: form.amount,
        paid_amount: form.paidAmount,
        payment_method: form.paymentMethod,
        on_behalf_of: form.onBehalfOf || undefined,
        additional_payment_date: needAdditionalPayment && form.additionalPaymentDate
          ? form.additionalPaymentDate.format('YYYY-MM-DD') : undefined,
        additional_payment_amount: needAdditionalPayment ? form.additionalPaymentAmount : undefined,
        status: 'registered',
        appointment_id: appointmentData?.id || undefined,
      });
      message.success('Договор зарегистрирован, запись в кассу создана');
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Ошибка при регистрации договора');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <Modal
      title="Зарегистрировать договор"
      open={open}
      onCancel={onClose}
      destroyOnClose
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>Отмена</Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          Зарегистрировать
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-muted)' }}>ФИО клиента</div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Фамилия *"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            style={{ width: '38%' }}
          />
          <Input
            placeholder="Имя *"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            style={{ width: '32%' }}
          />
          <Input
            placeholder="Отчество"
            value={form.middleName}
            onChange={(e) => set('middleName', e.target.value)}
            style={{ width: '30%' }}
          />
        </Space.Compact>

        <Input
          placeholder="+7 (___) ___-__-__"
          value={form.clientPhone}
          onChange={(e) => set('clientPhone', formatRussianPhone(e.target.value))}
          maxLength={18}
          inputMode="tel"
        />

        <Input
          placeholder="В чьих интересах (необязательно)"
          value={form.onBehalfOf}
          onChange={(e) => set('onBehalfOf', e.target.value)}
        />

        <Divider style={{ margin: '4px 0' }} />

        <Space wrap>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Дата заключения</div>
            <DatePicker
              value={form.contractDate}
              onChange={(d) => {
                if (d) {
                  set('contractDate', d);
                  generateNumber(d);
                }
              }}
              format="DD.MM.YYYY"
              style={{ width: 150 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Номер договора</div>
            <Input
              value={form.contractNumber}
              onChange={(e) => set('contractNumber', e.target.value)}
              style={{ width: 140 }}
              placeholder="DDMMYYXX"
            />
          </div>
        </Space>

        {/* Тема договора скрыта для администратора — дополняет сотрудник, заключивший договор */}

        <div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Предмет договора</div>
          <Radio.Group
            value={form.contractType}
            onChange={(e) => set('contractType', e.target.value)}
          >
            <Radio.Button value="docs">Документы</Radio.Button>
            <Radio.Button value="court_rep">Представление интересов</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Кто заключил договор *</div>
          <Select
            showSearch
            placeholder="Выберите юриста"
            value={form.signedById ?? undefined}
            onChange={(v) => set('signedById', (v as number | undefined) ?? null)}
            style={{ width: '100%' }}
            optionFilterProp="label"
            notFoundContent="Нет доступных сотрудников"
            options={signers.map((s) => ({
              value: s.id,
              label: `${s.last_name || ''} ${s.first_name || ''}`.trim() + (s.position ? ` — ${s.position}` : ''),
            }))}
          />
          <div style={{ marginTop: 8 }}>
            <Checkbox
              checked={form.isJoint}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((prev) => ({ ...prev, isJoint: checked, secondLawyerId: checked ? prev.secondLawyerId : null }));
              }}
            >
              Совместный договор (два юриста, деление 50/50)
            </Checkbox>
          </div>
          {form.isJoint ? (
            <Select
              showSearch
              placeholder="Второй юрист"
              value={form.secondLawyerId ?? undefined}
              onChange={(v) => set('secondLawyerId', (v as number | undefined) ?? null)}
              style={{ width: '100%', marginTop: 6 }}
              optionFilterProp="label"
              options={signers.filter((s) => s.id !== form.signedById).map((s) => ({
                value: s.id,
                label: `${s.last_name || ''} ${s.first_name || ''}`.trim(),
              }))}
            />
          ) : null}
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <Space wrap>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Сумма договора *</div>
            <InputNumber
              value={form.amount}
              onChange={(v) => set('amount', v)}
              min={0}
              style={{ width: 180 }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              addonAfter="₽"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Сумма внесения *</div>
            <InputNumber
              value={form.paidAmount}
              onChange={(v) => set('paidAmount', v)}
              min={0}
              style={{ width: 180 }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              addonAfter="₽"
            />
          </div>
        </Space>

        <div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Способ оплаты</div>
          <Radio.Group
            value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value)}
          >
            <Radio.Button value="cash">Наличные</Radio.Button>
            <Radio.Button value="noncash">Безнал</Radio.Button>
            <Radio.Button value="bank">Расчётный счёт</Radio.Button>
          </Radio.Group>
        </div>

        {needAdditionalPayment && (
          <div style={{ background: 'rgba(217,119,6,0.04)', padding: 12, borderRadius: 8, border: '1px solid rgba(217,119,6,0.15)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#D97706' }}>
              Доплата: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format((form.amount || 0) - (form.paidAmount || 0))}
            </div>
            <Space wrap>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Дата доплаты</div>
                <DatePicker
                  value={form.additionalPaymentDate}
                  onChange={(d) => set('additionalPaymentDate', d)}
                  format="DD.MM.YYYY"
                  style={{ width: 150 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Сумма доплаты</div>
                <InputNumber
                  value={form.additionalPaymentAmount ?? ((form.amount || 0) - (form.paidAmount || 0))}
                  onChange={(v) => set('additionalPaymentAmount', v)}
                  min={0}
                  style={{ width: 160 }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  addonAfter="₽"
                />
              </div>
            </Space>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AdminContractRegister;
