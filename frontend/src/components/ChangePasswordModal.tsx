import { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';
import { FaLock } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

interface Props {
  onDone: () => void;
}

const ChangePasswordModal = ({ onDone }: Props) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Минимум 6 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/auth/change-password'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_password: password }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Ошибка смены пароля');
      }
      localStorage.removeItem('must_change_password');
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 420 }}>
        <div className="emp-modal-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div>
            <h3><FaLock /> Смена пароля</h3>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', margin: '4px 0 0' }}>
              При первом входе необходимо установить свой пароль
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-section">
            <div className="form-grid">
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Новый пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  autoFocus
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Подтвердите пароль</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Повторите пароль"
                />
              </label>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="emp-modal-footer">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Сохранение…' : 'Установить пароль'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;