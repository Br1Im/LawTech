import { useState, useEffect, useMemo } from "react";
import { FaUser, FaUserPlus, FaUserShield, FaKey, FaBan, FaCheck, FaCopy, FaExchangeAlt, FaBuilding } from "react-icons/fa";
import { MdReplay, MdClose } from "react-icons/md";
import { buildApiUrl, getAuthHeaders } from "../shared/utils/apiUtils";
import { useAuth } from "../shared/lib/hooks/useAuth";
import "./Lawyers.css";
import "./Experts.css";
import "./Employees.css";
import "./EmployeesPolish.css";

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  login?: string;
  phone?: string;
  email?: string;
  role: string;
  role_label?: string;
  office_id?: number;
  is_active?: number;
  created_by?: number;
  created_at?: string;
}

interface AllowedRole {
  value: string;
  label: string;
}

const ROLE_LABELS: Record<string, string> = {
  director: 'Генеральный директор',
  manager: 'Менеджер',
  okk: 'ОКК',
  cc_manager: 'Начальник КЦ',
  cc_operator: 'Оператор КЦ',
  expert: 'Эксперт',
  lawyer: 'Юрист',
  representative: 'Представитель',
  admin: 'Администратор',
};

const getInitials = (first: string, last: string): string => {
  const f = (first || '')[0] || '';
  const l = (last || '')[0] || '';
  return (l + f).toUpperCase() || '?';
};

const getFullName = (s: StaffMember): string => {
  return [s.last_name, s.first_name, s.middle_name].filter(Boolean).join(' ').trim() || 'Сотрудник';
};

const copyToClipboard = (text: string) => {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) { /* ignore */ }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
};

// ===== Карточка сотрудника =====
const StaffCard = ({ staff }: { staff: StaffMember }) => {
  const name = getFullName(staff);
  const roleLabel = staff.role_label || ROLE_LABELS[staff.role] || staff.role;
  const inactive = staff.is_active === 0;
  return (
    <div className={`employee-card-v2${inactive ? ' inactive' : ''}`}>
      <div className="emp-avatar">
        <div className="emp-initials">{getInitials(staff.first_name, staff.last_name)}</div>
      </div>
      <div className="emp-body">
        <div className="emp-name">{name}{inactive && <span className="inactive-badge"> (неактив.)</span>}</div>
        <div className="emp-position">{roleLabel}</div>
        {staff.login && (
          <div className="emp-meta">
            <span><FaUser /> {staff.login}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Модалка «Информация о сотруднике» =====
const StaffDetailModal = ({
  staff,
  onClose,
  canManage,
  onUpdated,
}: {
  staff: StaffMember;
  onClose: () => void;
  canManage: boolean;
  onUpdated: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: staff.first_name, last_name: staff.last_name, middle_name: staff.middle_name || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetCreds, setResetCreds] = useState<{ login: string; password: string } | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState<'choose' | 'custom' | 'loading'>('choose');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [changeableRoles, setChangeableRoles] = useState<AllowedRole[]>([]);
  const [selectedNewRole, setSelectedNewRole] = useState<string>(staff.role);
  const [changingRole, setChangingRole] = useState(false);
  const { user } = useAuth();
  const isGeneralDirector = user?.role === 'director';
  const [showOfficeTransfer, setShowOfficeTransfer] = useState(false);
  const [myOffices, setMyOffices] = useState<{ id: number; name: string }[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  // Офисы, в которые можно перевести (все офисы директора, кроме текущего офиса сотрудника)
  const transferTargets = myOffices.filter(o => Number(o.id) !== Number(staff.office_id));

  // Загружаем офисы директора при открытии карточки (только для генерального директора)
  useEffect(() => {
    if (!isGeneralDirector || staff.role === 'director') return;
    fetch(buildApiUrl('/staff/my-offices'), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setMyOffices(data.offices || []))
      .catch(() => setMyOffices([]));
  }, [isGeneralDirector, staff.role]);

  useEffect(() => {
    if (showOfficeTransfer) {
      const first = transferTargets[0];
      if (first) setSelectedOffice(String(first.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOfficeTransfer, myOffices]);

  const handleTransferOffice = async () => {
    if (!selectedOffice) return;
    setError(null); setTransferring(true);
    try {
      const res = await fetch(buildApiUrl(`/staff/${staff.id}/office`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ office_id: Number(selectedOffice) }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || b.error || 'Ошибка'); }
      const data = await res.json();
      setSuccess(`Сотрудник переведён в офис: ${data.office_name}`);
      setShowOfficeTransfer(false);
      onUpdated();
    } catch (e) { setError((e as Error).message); }
    finally { setTransferring(false); }
  };

  useEffect(() => {
    if (showRoleChange && changeableRoles.length === 0) {
      fetch(buildApiUrl('/staff/changeable-roles'), { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          const roles = (data.allowed_roles || []).filter((r: AllowedRole) => r.value !== staff.role);
          setChangeableRoles(roles);
          if (roles.length > 0) setSelectedNewRole(roles[0].value);
        })
        .catch(() => setChangeableRoles([]));
    }
  }, [showRoleChange, staff.role, changeableRoles.length]);

  const handleChangeRole = async () => {
    if (!selectedNewRole || selectedNewRole === staff.role) return;
    setError(null); setChangingRole(true);
    try {
      const res = await fetch(buildApiUrl(`/staff/${staff.id}/role`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: selectedNewRole }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Ошибка'); }
      const data = await res.json();
      setSuccess(`Роль изменена на: ${data.new_role_label}`);
      setShowRoleChange(false);
      onUpdated();
    } catch (e) { setError((e as Error).message); }
    finally { setChangingRole(false); }
  };

  const handleSave = async () => {
    setError(null); setSaving(true);
    try {
      const res = await fetch(buildApiUrl(`/staff/${staff.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Ошибка'); }
      setSuccess('Данные обновлены');
      setEditing(false);
      onUpdated();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (useCustom: boolean) => {
    setError(null); setResetCreds(null); setPasswordMode('loading');
    try {
      const body: Record<string, string> = {};
      if (useCustom && customPassword.trim()) {
        body.password = customPassword.trim();
      }
      const res = await fetch(buildApiUrl(`/staff/${staff.id}/reset-password`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Ошибка'); }
      const data = await res.json();
      setResetCreds({ login: data.login, password: data.password });
      setShowPasswordChange(false);
      setPasswordMode('choose');
      setCustomPassword('');
    } catch (e) { setError((e as Error).message); setPasswordMode('choose'); }
  };

  const handleToggleActive = async () => {
    setError(null);
    try {
      const newActive = staff.is_active === 0 ? 1 : 0;
      const res = await fetch(buildApiUrl(`/staff/${staff.id}/active`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Ошибка'); }
      setSuccess(newActive ? 'Сотрудник активирован' : 'Сотрудник деактивирован');
      setConfirmDeactivate(false);
      onUpdated();
    } catch (e) { setError((e as Error).message); }
  };

  const roleLabel = staff.role_label || ROLE_LABELS[staff.role] || staff.role;

  return (
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="emp-modal-close" onClick={onClose}><MdClose size={22} /></button>
        <div className="emp-modal-header">
          <div className="emp-avatar large">
            <div className="emp-initials">{getInitials(staff.first_name, staff.last_name)}</div>
          </div>
          <div>
            <h3>{getFullName(staff)}</h3>
            <div className="emp-position">{roleLabel}</div>
            {staff.is_active === 0 && <div className="inactive-badge-large">Деактивирован</div>}
          </div>
        </div>

        <div className="emp-modal-section">
          <h4><FaUser /> Информация</h4>
          {!editing ? (
            <>
              <p><b>Логин:</b> {staff.login || '—'}</p>
            </>
          ) : (
            <div className="emp-edit-grid">
              <label className="emp-edit-field"><span>Фамилия</span><input value={editForm.last_name} onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Иванов" /></label>
              <label className="emp-edit-field"><span>Имя</span><input value={editForm.first_name} onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Иван" /></label>
              <label className="emp-edit-field emp-edit-field-full"><span>Отчество</span><input value={editForm.middle_name} onChange={(e) => setEditForm(p => ({ ...p, middle_name: e.target.value }))} placeholder="Иванович" /></label>
            </div>
          )}
        </div>

        {showPasswordChange && !resetCreds && (
          <div className="emp-modal-section">
            <h4><FaKey /> Изменить пароль</h4>
            {passwordMode === 'choose' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Введите новый пароль (мин. 6 символов)"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9d9d9', fontSize: '14px' }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => handleChangePassword(true)}
                    disabled={customPassword.trim().length < 6}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Установить
                  </button>
                </div>
                <div style={{ textAlign: 'center', color: '#999', fontSize: '13px' }}>или</div>
                <button className="btn-secondary" onClick={() => handleChangePassword(false)} style={{ width: '100%' }}>
                  Сгенерировать надёжный пароль
                </button>
              </div>
            )}
            {passwordMode === 'loading' && (
              <p style={{ color: '#888', fontSize: '13px' }}>Сохранение...</p>
            )}
          </div>
        )}

        {resetCreds && (
          <div className="emp-modal-section credentials-section">
            <h4><FaKey /> Новый пароль установлен</h4>
            <div className="credentials-box">
              <p><b>Логин:</b> {resetCreds.login} <button className="copy-btn" onClick={() => copyToClipboard(resetCreds.login)} title="Копировать"><FaCopy /></button></p>
              <p><b>Пароль:</b> {resetCreds.password} <button className="copy-btn" onClick={() => copyToClipboard(resetCreds.password)} title="Копировать"><FaCopy /></button></p>
              <button className="copy-btn-full" onClick={() => copyToClipboard(`Логин: ${resetCreds.login}\nПароль: ${resetCreds.password}`)}>
                <FaCopy /> Копировать всё
              </button>
            </div>
          </div>
        )}

        {showRoleChange && (
          <div className="emp-modal-section">
            <h4><FaExchangeAlt /> Смена роли</h4>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>Текущая роль: <b>{ROLE_LABELS[staff.role] || staff.role}</b></p>
            {changeableRoles.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={selectedNewRole} onChange={(e) => setSelectedNewRole(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9d9d9', fontSize: '14px' }}>
                  {changeableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button className="btn-primary" onClick={handleChangeRole} disabled={changingRole} style={{ whiteSpace: 'nowrap' }}>
                  {changingRole ? 'Сохранение…' : 'Применить'}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#999' }}>Нет доступных ролей для смены</p>
            )}
          </div>
        )}

        {showOfficeTransfer && (
          <div className="emp-modal-section">
            <h4><FaBuilding /> Перевод в другой офис</h4>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>
              Текущий офис: <b>{myOffices.find(o => Number(o.id) === Number(staff.office_id))?.name || `Офис #${staff.office_id ?? '—'}`}</b>
            </p>
            {transferTargets.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={selectedOffice} onChange={(e) => setSelectedOffice(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9d9d9', fontSize: '14px' }}>
                  {transferTargets.map(o => (
                    <option key={o.id} value={String(o.id)}>{o.name}</option>
                  ))}
                </select>
                <button className="btn-primary" onClick={handleTransferOffice} disabled={transferring} style={{ whiteSpace: 'nowrap' }}>
                  {transferring ? 'Перевод…' : 'Перевести'}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#999' }}>Нет других офисов для перевода</p>
            )}
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {canManage && (
          <div className="emp-modal-footer">
            {editing ? (
              <>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
                <button className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>Отмена</button>
              </>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setEditing(true)}><FaUserShield /> Редактировать</button>
                <button className="btn-secondary" onClick={() => { setShowPasswordChange(!showPasswordChange); setResetCreds(null); setPasswordMode('choose'); setCustomPassword(''); }}><FaKey /> Изменить пароль</button>
                {staff.role !== 'director' && (
                  <button className="btn-secondary" onClick={() => setShowRoleChange(!showRoleChange)}><FaExchangeAlt /> Сменить роль</button>
                )}
                {isGeneralDirector && staff.role !== 'director' && transferTargets.length > 0 && (
                  <button className="btn-secondary" onClick={() => setShowOfficeTransfer(!showOfficeTransfer)}><FaBuilding /> Перевести в офис</button>
                )}
                {confirmDeactivate ? (
                  <div className="delete-confirm">
                    <span>{staff.is_active === 0 ? 'Активировать?' : 'Деактивировать?'}</span>
                    <button className="btn-danger" onClick={handleToggleActive}>{staff.is_active === 0 ? 'Да, активировать' : 'Да, деактивировать'}</button>
                    <button className="btn-secondary" onClick={() => setConfirmDeactivate(false)}>Отмена</button>
                  </div>
                ) : (
                  <button className={staff.is_active === 0 ? 'btn-primary' : 'btn-danger'} onClick={() => setConfirmDeactivate(true)}>
                    {staff.is_active === 0 ? <><FaCheck /> Активировать</> : <><FaBan /> Деактивировать</>}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {!canManage && (
          <div className="emp-modal-footer">
            <button className="btn-secondary" onClick={onClose}>Закрыть</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Модалка «Создать сотрудника» =====
const CreateStaffModal = ({
  allowedRoles,
  onClose,
  onCreated,
}: {
  allowedRoles: AllowedRole[];
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [form, setForm] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    role: allowedRoles[0]?.value || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ login: string; password: string; name: string } | null>(null);

  const update = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.last_name.trim() || !form.first_name.trim()) { setError('Фамилия и Имя обязательны'); return; }
    if (!form.role) { setError('Выберите роль'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl('/staff'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim() || undefined,
          role: form.role,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Не удалось создать сотрудника');
      }
      const data = await res.json();
      const emp = data.employee;
      setCreatedCreds({
        login: emp.login,
        password: emp.password,
        name: `${emp.last_name} ${emp.first_name}`,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (createdCreds) {
    return (
      <div className="emp-modal-overlay" onClick={onClose}>
        <div className="emp-modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="emp-modal-close" onClick={() => { onCreated(); onClose(); }}><MdClose size={22} /></button>
          <h3 className="add-employee-title"><FaCheck /> Сотрудник создан</h3>
          <p style={{ margin: '8px 0', fontSize: '15px' }}>
            <b>{createdCreds.name}</b>
          </p>
          <div className="credentials-section">
            <div className="credentials-box">
              <p><b>Логин:</b> {createdCreds.login} <button className="copy-btn" onClick={() => copyToClipboard(createdCreds.login)} title="Копировать"><FaCopy /></button></p>
              <p><b>Пароль:</b> {createdCreds.password} <button className="copy-btn" onClick={() => copyToClipboard(createdCreds.password)} title="Копировать"><FaCopy /></button></p>
              <button className="copy-btn-full" onClick={() => copyToClipboard(`Логин: ${createdCreds.login}\nПароль: ${createdCreds.password}`)}>
                <FaCopy /> Копировать всё
              </button>
            </div>
            <p className="credentials-hint">Передайте эти данные сотруднику. Пароль показывается только один раз.</p>
          </div>
          <div className="emp-modal-footer">
            <button className="btn-primary" onClick={() => { onCreated(); onClose(); }}>Готово</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal-card add-employee-card" onClick={(e) => e.stopPropagation()}>
        <button className="emp-modal-close" onClick={onClose}><MdClose size={22} /></button>
        <h3 className="add-employee-title"><FaUserPlus /> Создать сотрудника</h3>

        <form className="add-employee-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend><FaUser /> ФИО и должность</legend>
            <div className="form-grid">
              <label>
                <span>Фамилия *</span>
                <input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} placeholder="Иванов" />
              </label>
              <label>
                <span>Имя *</span>
                <input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="Иван" />
              </label>
              <label>
                <span>Отчество</span>
                <input value={form.middle_name} onChange={(e) => update('middle_name', e.target.value)} placeholder="Иванович" />
              </label>
              <label>
                <span>Должность *</span>
                <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                  {allowedRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {error && <div className="form-error">{error}</div>}

          <div className="emp-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== Главный компонент =====
const Employees = () => {
  const { isAuthenticated, user } = useAuth();
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<StaffMember | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [allowedRoles, setAllowedRoles] = useState<AllowedRole[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  const fetchEmployees = async () => {
    if (!isAuthenticated || !user) { setEmployees([]); return; }
    setLoading(true);
    try {
      const url = buildApiUrl(`/staff${showInactive ? '?include_inactive=true' : ''}`);
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Не удалось получить сотрудников');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Ошибка получения сотрудников:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowedRoles = async () => {
    try {
      const res = await fetch(buildApiUrl('/staff/allowed-roles'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllowedRoles(data.allowed_roles || []);
      }
    } catch { /* ignore */ }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEmployees(); fetchAllowedRoles(); }, [isAuthenticated, user, showInactive]);

  const roleOptions = useMemo(() => {
    const uniq = Array.from(new Set(employees.map(e => e.role).filter(Boolean)));
    return [{ value: 'all', label: 'Все роли' }, ...uniq.map(r => ({ value: r, label: ROLE_LABELS[r] || r }))];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(e => {
      const matchRole = selectedRole === 'all' || e.role === selectedRole;
      const name = getFullName(e).toLowerCase();
      const matchSearch = !q || name.includes(q) || (e.login || '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [employees, selectedRole, search]);

  const canCreate = allowedRoles.length > 0;
  const canManage = ['director', 'manager', 'okk', 'cc_manager'].includes(user?.role || '');

  return (
    <div className="employees-content employees-v2">
      <div className="employees-header">
        <h2 className="employees-title">Сотрудники</h2>
        {canCreate && (
          <button className="add-employee-btn" onClick={() => setShowCreateModal(true)}>
            <FaUserPlus size={16} />
            <span>Создать сотрудника</span>
          </button>
        )}
      </div>

      <div className="filters filters-v2">
        <div className="role-filter">
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="search-filter">
          <input type="text" placeholder="Поиск по ФИО, логину…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="inactive-toggle">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          <span>Неактивные</span>
        </label>
        <button className="reset-filter" onClick={() => { setSelectedRole('all'); setSearch(''); }}>
          <MdReplay size={16} /><span>Сбросить</span>
        </button>
      </div>

      {loading ? (
        <div className="no-employees"><p>Загрузка…</p></div>
      ) : filteredEmployees.length > 0 ? (
        <div className="employees-grid">
          {filteredEmployees.map((emp) => (
            <div onClick={() => setSelectedEmployee(emp)} key={emp.id} className="employee-grid-item">
              <StaffCard staff={emp} />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-employees"><p>Сотрудники не найдены</p></div>
      )}

      {selectedEmployee && (
        <StaffDetailModal
          staff={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          canManage={canManage}
          onUpdated={() => { fetchEmployees(); setSelectedEmployee(null); }}
        />
      )}

      {showCreateModal && (
        <CreateStaffModal
          allowedRoles={allowedRoles}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchEmployees()}
        />
      )}
    </div>
  );
};

export default Employees;
