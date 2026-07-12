import React from 'react';

const card: React.CSSProperties = {
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '20px 24px',
  marginBottom: 20,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 12,
  color: 'var(--color-text)',
};
const item: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  padding: '14px 0',
  borderBottom: '1px solid var(--color-border)',
};
const itemLast: React.CSSProperties = { ...item, borderBottom: 'none' };
const label: React.CSSProperties = { fontSize: 15, fontWeight: 500, color: 'var(--color-text)' };
const desc: React.CSSProperties = { fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 };
const val: React.CSSProperties = { fontSize: 14, color: 'var(--color-text-secondary)' };

const Settings: React.FC = () => {
  return (
    <div className="viktor-settings" style={{ maxWidth: 720, width: '100%' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
        Настройки
      </h1>

      <div style={card}>
        <h2 style={sectionTitle}>Общие настройки</h2>

        <div style={itemLast}>
          <div>
            <div style={label}>Язык интерфейса</div>
            <div style={desc}>Язык отображения интерфейса</div>
          </div>
          <div style={val}>Русский</div>
        </div>
      </div>

      <div style={card}>
        <h2 style={sectionTitle}>Уведомления</h2>
        <div style={item}>
          <div>
            <div style={label}>Email уведомления</div>
            <div style={desc}>Получать уведомления на электронную почту</div>
          </div>
          <div style={val}>Включено</div>
        </div>
        <div style={itemLast}>
          <div>
            <div style={label}>Push уведомления</div>
            <div style={desc}>Получать push-уведомления в браузере</div>
          </div>
          <div style={val}>Включено</div>
        </div>
      </div>

      <div style={card}>
        <h2 style={sectionTitle}>Безопасность</h2>
        <div style={item}>
          <div>
            <div style={label}>Двухфакторная аутентификация</div>
            <div style={desc}>Дополнительная защита вашего аккаунта</div>
          </div>
          <div style={val}>Отключено</div>
        </div>
        <div style={itemLast}>
          <div>
            <div style={label}>Сменить пароль</div>
            <div style={desc}>Обновить пароль для входа в систему</div>
          </div>
          <div style={val}>Изменить</div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
