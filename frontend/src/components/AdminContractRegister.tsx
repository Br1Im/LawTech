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
  appointment_date?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentData?: AppointmentInfo | null;
}

type PaymentMethod = 'cash' | 'noncash' | 'bank' | 'sbp';
interface PaymentRow {
  id: string;
  payment_method: PaymentMethod;
  amount: number | null;
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'noncash', label: 'Банковская карта (терминал)' },
  { value: 'bank', label: 'Банковский перевод' },
];

const makePaymentRow = (): PaymentRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  payment_method: 'cash',
  amount: null,
});

const AdminContractRegister: React.FC<Props> = ({ open, onClose, onSuccess, appointmentData }) => {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([makePaymentRow()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    additionalPaymentDate: null as dayjs.Dayjs | null,
    signedById: null as number | null,
    isJoint: false,
    secondLawyerId: null as number | null,
  });

  // Список сотрудников, кто может заключить договор (менеджер, юристы, Руководитель, директор)
  const [signers, setSigners] = useState<CrmEmployee[]>([]);

  const ROLE_LABELS: Record<string, string> = { lawyer: 'Юрист', manager: 'Менеджер', okk: 'Руководитель', director: 'Директор' };

  const loadSigners = useCallback(async () => {
    try {
      const res = await apiInstance.get('/employees');
      const all: CrmEmployee[] = res.data?.data || [];
      const signerRoles = new Set(['manager', 'okk', 'director', 'lawyer']);
      setSigners(all.filter((e) => e.user_id && signerRoles.has(String(e.user_role || '').toLowerCase())));
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
      const appointmentDay = appointmentData?.appointment_date ? dayjs(appointmentData.appointment_date) : dayjs();
      const contractDay = appointmentDay.isValid() ? appointmentDay : dayjs();

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
      const toEmployeeId = (raw?: number | null) => { const n = Number(raw || 0); const found = signers.find(s => Number(s.id) === n || Number(s.user_id) === n); return found ? Number(found.id) : null; };
      const presetSigner = toEmployeeId(appointmentData?.assigned_lawyer_id);
      const presetSecond = toEmployeeId(appointmentData?.assigned_lawyer_id_2);

      setForm({
        lastName, firstName, middleName,
        clientPhone: presetPhone,
        onBehalfOf: '',
        contractDate: contractDay, contractNumber: '', title: presetTitle,
        contractType: 'docs', signedById: presetSigner, amount: null,
        additionalPaymentDate: null,
        isJoint: !!presetSecond, secondLawyerId: presetSecond,
      });
      setPayments([makePaymentRow()]);
      setFieldErrors({});
      generateNumber(contractDay);
    }
    if (!open) {
      prevOpenRef.current = false;
    }
  }, [open, loadSigners, generateNumber, appointmentData]);


  useEffect(() => {
    if (!open || !signers.length || !appointmentData) return;
    setForm(prev => ({
      ...prev,
      signedById: signers.find(s => Number(s.id) === Number(appointmentData.assigned_lawyer_id) || Number(s.user_id) === Number(appointmentData.assigned_lawyer_id))?.id ?? prev.signedById,
      secondLawyerId: signers.find(s => Number(s.id) === Number(appointmentData.assigned_lawyer_id_2) || Number(s.user_id) === Number(appointmentData.assigned_lawyer_id_2))?.id ?? prev.secondLawyerId,
    }));
  }, [open, signers, appointmentData]);

  const totalPaid = Math.round(
    payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) * 100
  ) / 100;
  const remaining = Math.max(0, Number(form.amount || 0) - totalPaid);
  const needAdditionalPayment = Number(form.amount || 0) > 0 && remaining > 0;

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.lastName.trim()) errors.lastName = 'required';
    if (!form.firstName.trim()) errors.firstName = 'required';
    if (!form.signedById) errors.signedById = 'required';
    if (!form.amount || form.amount <= 0) errors.amount = 'required';
    if (form.isJoint && !form.secondLawyerId) errors.secondLawyerId = 'required';
    if (form.isJoint && form.secondLawyerId === form.signedById) errors.secondLawyerId = 'same';
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      message.warning(String.fromCharCode(1055,1088,1086,1074,1077,1088,1100,1090,1077,32,1086,1073,1103,1079,1072,1090,1077,1083,1100,1085,1099,1077,32,1087,1086,1083,1103));
      requestAnimationFrame(() => document.querySelector('.contract-register-modal .field-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      return;
    }
    const filledPayments = payments.filter((payment) => payment.amount !== null);
    if (filledPayments.some((payment) => !payment.amount || payment.amount <= 0)) {
      message.warning('Сумма каждого платежа должна быть больше 0.');
      return;
    }
    if (totalPaid > Number(form.amount)) {
      message.error('Общая сумма платежей превышает сумму договора.');
      return;
    }

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
        payments: filledPayments.map((payment) => ({
          amount: payment.amount,
          payment_method: payment.payment_method,
          payment_date: form.contractDate.format('YYYY-MM-DD'),
        })),
        on_behalf_of: form.onBehalfOf || undefined,
        additional_payment_date: needAdditionalPayment && form.additionalPaymentDate
          ? form.additionalPaymentDate.format('YYYY-MM-DD') : undefined,
        additional_payment_amount: needAdditionalPayment ? remaining : undefined,
        status: 'registered',
        appointment_id: appointmentData?.id || undefined,
      });
      message.success('Договор зарегистрирован, платежи учтены в балансе');
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
      className="contract-register-modal unified-form-modal"
      keyboard
      maskClosable={false}
      title="Зарегистрировать договор"
      open={open}
      onCancel={onClose}
      destroyOnClose
      width={720}
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
            aria-invalid={!!fieldErrors.lastName}
            className={fieldErrors.lastName ? 'field-error' : ''}
            placeholder="Фамилия *"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            style={{ width: '38%' }}
          />
          <Input
            aria-invalid={!!fieldErrors.firstName}
            className={fieldErrors.firstName ? 'field-error' : ''}
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
        {(fieldErrors.lastName || fieldErrors.firstName) && <div className="contract-field-error">{String.fromCharCode(1059,1082,1072,1078,1080,1090,1077,32,1092,1072,1084,1080,1083,1080,1102,32,1080,32,1080,1084,1103,32,1082,1083,1080,1077,1085,1090,1072)}</div>}

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
            status={fieldErrors.signedById ? 'error' : undefined}
            showSearch
            placeholder="Выберите сотрудника"
            value={form.signedById ?? undefined}
            onChange={(v) => { set('signedById', (v as number | undefined) ?? null); setFieldErrors(e => ({ ...e, signedById: '' })); }}
            style={{ width: '100%' }}
            optionFilterProp="label"
            notFoundContent="Нет доступных сотрудников"
            options={signers.map((s) => ({
              value: s.id,
              label: `${s.last_name || ''} ${s.first_name || ''}`.trim() + (s.user_role ? ` · ${ROLE_LABELS[String(s.user_role).toLowerCase()] || s.user_role}` : ''),
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

        <div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Сумма договора *</div>
          <InputNumber
            status={fieldErrors.amount ? 'error' : undefined}
            value={form.amount}
            onChange={(v) => { set('amount', v); if (fieldErrors.amount) setFieldErrors(e => ({ ...e, amount: '' })); }}
            min={0}
            style={{ width: 220 }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            addonAfter="₽"
          />
        </div>

        <div style={{
          padding: 14,
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          background: 'var(--color-bg-alt)',
        }}>
          <div style={{ fontWeight: 650, fontSize: 14, marginBottom: 10 }}>Оплата договора</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(120px, 1fr) 36px',
            gap: 8,
            marginBottom: 6,
            fontSize: 11,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
          }}>
            <span>Способ оплаты</span>
            <span>Сумма платежа</span>
            <span />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payments.map((payment) => (
              <div
                key={payment.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(120px, 1fr) 36px',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <Select
                  value={payment.payment_method}
                  options={PAYMENT_OPTIONS}
                  onChange={(value: PaymentMethod) => {
                    setPayments((rows) => rows.map((row) => (
                      row.id === payment.id ? { ...row, payment_method: value } : row
                    )));
                  }}
                />
                <InputNumber
                  value={payment.amount}
                  onChange={(value) => {
                    setPayments((rows) => rows.map((row) => (
                      row.id === payment.id ? { ...row, amount: value } : row
                    )));
                  }}
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  addonAfter="₽"
                />
                <Button
                  type="text"
                  danger
                  aria-label="Удалить платёж"
                  onClick={() => setPayments((rows) => rows.filter((row) => row.id !== payment.id))}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="dashed"
            onClick={() => setPayments((rows) => [...rows, makePaymentRow()])}
            style={{ marginTop: 10 }}
          >
            + Добавить платёж
          </Button>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            marginTop: 14,
          }}>
            {[
              ['Общая сумма договора', Number(form.amount || 0)],
              ['Оплачено', totalPaid],
              ['Остаток к оплате', remaining],
            ].map(([label, value]) => (
              <div key={String(label)} style={{
                padding: '10px 12px',
                borderRadius: 9,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 3 }}>{label}</div>
                <strong style={{ fontSize: 14 }}>
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    maximumFractionDigits: 0,
                  }).format(Number(value))}
                </strong>
              </div>
            ))}
          </div>

          {totalPaid > Number(form.amount || 0) && (
            <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>
              Общая сумма платежей превышает сумму договора.
            </div>
          )}
        </div>

        {needAdditionalPayment && (
          <div style={{ background: 'rgba(217,119,6,0.04)', padding: 12, borderRadius: 8, border: '1px solid rgba(217,119,6,0.15)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#D97706' }}>
              Остаток к оплате: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(remaining)}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>
                Плановая дата следующей оплаты
              </div>
              <DatePicker
                value={form.additionalPaymentDate}
                onChange={(d) => set('additionalPaymentDate', d)}
                format="DD.MM.YYYY"
                style={{ width: 190 }}
                placeholder="Не указана"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AdminContractRegister;
