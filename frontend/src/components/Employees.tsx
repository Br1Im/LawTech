import { useState, useEffect, useMemo } from "react";
import { FaUser, FaUserPlus, FaUserShield, FaIdCard, FaEnvelope, FaPhone, FaBirthdayCake } from "react-icons/fa";
import { MdFilterList, MdReplay, MdClose } from "react-icons/md";
import { buildApiUrl } from "../shared/utils/apiUtils";
import { useAuth } from "../shared/lib/hooks/useAuth";
import "./Lawyers.css";
import "./Experts.css";
import "./Employees.css";
import "./EmployeesPolish.css";

interface Employee {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  position?: string;
  office?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  role: string;
  status: 'active' | 'pending' | 'rejected';
  joinDate?: string;
  birth_date?: string | null;
  passport_series?: string | null;
  passport_number?: string | null;
  passport_issued_by?: string | null;
  passport_issue_date?: string | null;
  passport_department_code?: string | null;
}

const POSITION_OPTIONS = [
  'Юрист',
  'Эксперт',
  'Менеджер',
  'ОКК',
  'Колл-центр',
  'Ресепшен',
  'Руководитель',
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const normalizeRaw = (e: Record<string, unknown>): Employee => {
  const first = (e.first_name as string) || '';
  const last = (e.last_name as string) || '';
  const middle = (e.middle_name as string) || '';
  const nameFromFields = `${last} ${first}${middle ? ' ' + middle : ''}`.trim();
  return {
    id: Number(e.id) || 0,
    name: (e.name as string) || nameFromFields || (e.email as string) || 'Сотрудник',
    first_name: first,
    last_name: last,
    middle_name: middle,
    position: (e.position as string) || '',
    office: (e.office as string) || '',
    avatar: (e.avatar as string) || undefined,
    email: (e.email as string) || undefined,
    phone: (e.phone as string) || undefined,
    role: (e.user_role as string) || (e.role as string) || '',
    status: ((e.status as Employee['status']) || 'active'),
    joinDate: (e.created_at as string) || undefined,
    birth_date: (e.birth_date as string) || null,
    passport_series: (e.passport_series as string) || null,
    passport_number: (e.passport_number as string) || null,
    passport_issued_by: (e.passport_issued_by as string) || null,
    passport_issue_date: (e.passport_issue_date as string) || null,
    passport_department_code: (e.passport_department_code as string) || null,
  };
};

const formatRuDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ===== Карточка сотрудника =====
const EmployeeCard = ({ employee }: { employee: Employee }) => {
  return (
    <div className="employee-card-v2">
      <div className="emp-avatar">
        {employee.avatar ? (
          <img src={employee.avatar} alt={employee.name} />
        ) : (
          <div className="emp-initials">{getInitials(employee.name)}</div>
        )}
      </div>
      <div className="emp-body">
        <div className="emp-name">{employee.name}</div>
        {employee.position && (
          <div className="emp-position">{employee.position}</div>
        )}
        <div className="emp-meta">
          {employee.email && (
            <span title={employee.email}><FaEnvelope /> {employee.email}</span>
          )}
          {employee.phone && (
            <span title={employee.phone}><FaPhone /> {employee.phone}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== Модалка «Информация о сотруднике» =====
const EmployeeModal = ({
  employee,
  onClose,
  canEditRole,
  canDelete,
  onRoleUpdated,
  onDeleted,
}: {
  employee: Employee;
  onClose: () => void;
  canEditRole: boolean;
  canDelete: boolean;
  onRoleUpdated: (id: number, position: string) => void;
  onDeleted: (id: number) => void;
}) => {
  const [position, setPosition] = useState<string>(employee.position || 'Юрист');
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dirty = canEditRole && position !== (employee.position || 'Юрист');

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Требуется авторизация');
      const res = await fetch(buildApiUrl(`/employees/${employee.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Не удалось удалить сотрудника');
      }
      onDeleted(employee.id);
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveRole = async () => {
    setRoleError(null);
    setRoleSuccess(false);
    setSavingRole(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Требуется авторизация');
      const res = await fetch(buildApiUrl(`/employees/${employee.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Не удалось обновить роль');
      }
      onRoleUpdated(employee.id, position);
      setRoleSuccess(true);
    } catch (err) {
      setRoleError((err as Error).message || 'Ошибка обновления');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="emp-modal-close" onClick={onClose}><MdClose size={22} /></button>
        <div className="emp-modal-header">
          <div className="emp-avatar large">
            {employee.avatar ? (
              <img src={employee.avatar} alt={employee.name} />
            ) : (
              <div className="emp-initials">{getInitials(employee.name)}</div>
            )}
          </div>
          <div>
            <h3>{employee.name}</h3>
            {employee.position && <div className="emp-position">{employee.position}</div>}
          </div>
        </div>

        <div className="emp-modal-section">
          <h4><FaUser /> Контакты</h4>
          <p><b>Email:</b> {employee.email || '—'}</p>
          <p><b>Телефон:</b> {employee.phone || '—'}</p>
          <p><b>Дата рождения:</b> {formatRuDate(employee.birth_date)}</p>
        </div>

        <div className="emp-modal-section">
          <h4><FaIdCard /> Паспортные данные</h4>
          <p><b>Серия и номер:</b> {employee.passport_series || '—'} {employee.passport_number || ''}</p>
          <p><b>Кем выдан:</b> {employee.passport_issued_by || '—'}</p>
          <p><b>Когда выдан:</b> {formatRuDate(employee.passport_issue_date)}</p>
          <p><b>Код подразделения:</b> {employee.passport_department_code || '—'}</p>
        </div>

        {canEditRole && (
          <div className="emp-modal-section role-edit-section">
            <h4><FaUserShield /> Изменить роль</h4>
            <div className="role-edit-row">
              <select
                value={position}
                onChange={(e) => { setPosition(e.target.value); setRoleSuccess(false); }}
                disabled={savingRole}
              >
                {POSITION_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                className="btn-primary"
                onClick={handleSaveRole}
                disabled={!dirty || savingRole}
              >
                {savingRole ? 'Сохранение…' : 'Сохранить роль'}
              </button>
            </div>
            {roleError && <div className="form-error">{roleError}</div>}
            {roleSuccess && <div className="form-success">Роль обновлена</div>}
            <p className="role-hint">Только директор может изменить роль сотрудника.</p>
          </div>
        )}

        <div className="emp-modal-footer">
          {canDelete && (
            confirmDelete ? (
              <div className="delete-confirm">
                <span>Удалить сотрудника безвозвратно?</span>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Удаление…' : 'Да, удалить'}
                </button>
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Отмена
                </button>
              </div>
            ) : (
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                Удалить сотрудника
              </button>
            )
          )}
          {deleteError && <div className="form-error">{deleteError}</div>}
          <button className="btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

// ===== Модалка «Добавить сотрудника» =====
interface NewEmployeeForm {
  last_name: string;
  first_name: string;
  middle_name: string;
  position: string;
  email: string;
  phone: string;
  birth_date: string;
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issue_date: string;
  passport_department_code: string;
}

const emptyForm: NewEmployeeForm = {
  last_name: '',
  first_name: '',
  middle_name: '',
  position: 'Юрист',
  email: '',
  phone: '',
  birth_date: '',
  passport_series: '',
  passport_number: '',
  passport_issued_by: '',
  passport_issue_date: '',
  passport_department_code: '',
};

const formatPhone = (raw: string): string => {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits) return '';
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  const rest = digits.slice(1);
  let out = '+7';
  if (rest.length > 0) out += ' (' + rest.slice(0, 3);
  if (rest.length >= 3) out += ') ' + rest.slice(3, 6);
  if (rest.length >= 6) out += '-' + rest.slice(6, 8);
  if (rest.length >= 8) out += '-' + rest.slice(8, 10);
  return out;
};

const AddEmployeeModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}) => {
  const [form, setForm] = useState<NewEmployeeForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof NewEmployeeForm>(key: K, value: NewEmployeeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.last_name.trim() || !form.first_name.trim()) {
      setError('Фамилия и Имя обязательны');
      return;
    }
    if (form.passport_series && !/^\d{4}$/.test(form.passport_series)) {
      setError('Серия паспорта — 4 цифры');
      return;
    }
    if (form.passport_number && !/^\d{6}$/.test(form.passport_number)) {
      setError('Номер паспорта — 6 цифр');
      return;
    }
    if (form.passport_department_code && !/^\d{3}-\d{3}$|^\d{6}$/.test(form.passport_department_code)) {
      setError('Код подразделения в формате 123-456');
      return;
    }
    if (form.phone) {
      const digits = form.phone.replace(/\D/g, '');
      if (digits.length !== 11 || !['7', '8'].includes(digits[0])) {
        setError('Телефон: 11 цифр, только российские');
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Требуется авторизация');
      const res = await fetch(buildApiUrl('/employees'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim() || null,
          position: form.position,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          birth_date: form.birth_date || null,
          passport_series: form.passport_series || null,
          passport_number: form.passport_number || null,
          passport_issued_by: form.passport_issued_by.trim() || null,
          passport_issue_date: form.passport_issue_date || null,
          passport_department_code: form.passport_department_code || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Не удалось сохранить сотрудника');
      }
      const body = await res.json();
      const raw = body?.data || body;
      onCreated(normalizeRaw(raw));
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal-card add-employee-card" onClick={(e) => e.stopPropagation()}>
        <button className="emp-modal-close" onClick={onClose}><MdClose size={22} /></button>
        <h3 className="add-employee-title"><FaUserPlus /> Добавить сотрудника</h3>

        <form className="add-employee-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend><FaUser /> ФИО и роль</legend>
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
                <span>Роль *</span>
                <select value={form.position} onChange={(e) => update('position', e.target.value)}>
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend><FaEnvelope /> Контакты</legend>
            <div className="form-grid">
              <label>
                <span>Email</span>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" />
              </label>
              <label>
                <span>Телефон</span>
                <input value={form.phone} onChange={(e) => update('phone', formatPhone(e.target.value))} placeholder="+7 (___) ___-__-__" />
              </label>
              <label>
                <span><FaBirthdayCake /> Дата рождения</span>
                <input type="date" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend><FaIdCard /> Паспорт РФ</legend>
            <div className="form-grid">
              <label>
                <span>Серия</span>
                <input value={form.passport_series} onChange={(e) => update('passport_series', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4514" inputMode="numeric" maxLength={4} />
              </label>
              <label>
                <span>Номер</span>
                <input value={form.passport_number} onChange={(e) => update('passport_number', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} />
              </label>
              <label className="span-2">
                <span>Кем выдан</span>
                <input value={form.passport_issued_by} onChange={(e) => update('passport_issued_by', e.target.value)} placeholder="ОВД района ..." />
              </label>
              <label>
                <span>Дата выдачи</span>
                <input type="date" value={form.passport_issue_date} onChange={(e) => update('passport_issue_date', e.target.value)} />
              </label>
              <label>
                <span>Код подразделения</span>
                <input
                  value={form.passport_department_code}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                    const formatted = raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
                    update('passport_department_code', formatted);
                  }}
                  placeholder="770-001"
                  inputMode="numeric"
                  maxLength={7}
                />
              </label>
            </div>
          </fieldset>

          {error && <div className="form-error">{error}</div>}

          <div className="emp-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Сохранение…' : 'Сохранить'}
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('Все роли');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!isAuthenticated || !user) {
        setEmployees([]);
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Требуется авторизация');
        const profileRes = await fetch(buildApiUrl('/profile'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileRes.ok) throw new Error('Профиль не найден');
        const profileData = await profileRes.json();
        const officeId = profileData.user?.officeId;
        if (!officeId) throw new Error('Офис не найден');
        const res = await fetch(buildApiUrl(`/office/${officeId}/employees`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Не удалось получить сотрудников');
        const raw = await res.json();
        const list: Array<Record<string, unknown>> = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
        setEmployees(list.map(normalizeRaw));
      } catch (err) {
        console.error('Ошибка получения сотрудников:', err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [isAuthenticated, user]);

  const roles = useMemo(() => {
    const uniq = Array.from(new Set(employees.map((e) => e.position).filter(Boolean) as string[]));
    return ['Все роли', ...uniq];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const matchRole = selectedRole === 'Все роли' || e.position === selectedRole;
      const matchSearch = !q
        || e.name.toLowerCase().includes(q)
        || (e.email || '').toLowerCase().includes(q)
        || (e.phone || '').toLowerCase().includes(q)
        || (e.position || '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [employees, selectedRole, search]);

  const handleResetFilters = () => {
    setSelectedRole('Все роли');
    setSearch('');
  };

  return (
    <div className="employees-content employees-v2">
      <div className="employees-header">
        <h2 className="employees-title">Сотрудники</h2>
        <button className="add-employee-btn" onClick={() => setShowAddModal(true)}>
          <FaUserPlus size={16} />
          <span>Добавить сотрудника</span>
        </button>
      </div>

      <div className="filters filters-v2">
        <div className="filter-icon">
          <MdFilterList size={22} />
        </div>
        <div className="filter-text">Фильтр</div>
        <div className="role-filter">
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="search-filter">
          <input
            type="text"
            placeholder="Поиск по ФИО, email, телефону…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="reset-filter" onClick={handleResetFilters}>
          <MdReplay size={18} />
          <span>Сбросить</span>
        </button>
      </div>

      {loading ? (
        <div className="no-employees"><p>Загрузка…</p></div>
      ) : filteredEmployees.length > 0 ? (
        <div className="employees-grid">
          {filteredEmployees.map((employee) => (
            <div onClick={() => setSelectedEmployee(employee)} key={employee.id} className="employee-grid-item">
              <EmployeeCard employee={employee} />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-employees"><p>Сотрудники не найдены</p></div>
      )}

      {selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          canEditRole={(user?.role || '').toLowerCase() === 'director'}
          canDelete={['director', 'manager'].includes((user?.role || '').toLowerCase())}
          onRoleUpdated={(id, newPosition) => {
            setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, position: newPosition } : e)));
            setSelectedEmployee((prev) => (prev && prev.id === id ? { ...prev, position: newPosition } : prev));
          }}
          onDeleted={(id) => setEmployees((prev) => prev.filter((e) => e.id !== id))}
        />
      )}

      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onCreated={(emp) => setEmployees((prev) => [emp, ...prev])}
        />
      )}
    </div>
  );
};

export default Employees;
