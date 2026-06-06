import './ThemeToggle.css';
import { useThemeMode } from '../../shared/ui/AntThemeProvider';

const ThemeToggle = () => {
  // Единый источник правды для темы — AntThemeProvider. Так один клик
  // одновременно меняет и CSS-переменные (data-theme), и тему Ant Design,
  // без рассинхрона и без перезагрузки страницы.
  const { mode, toggle } = useThemeMode();

  return (
    <button
      className="theme-toggle-button"
      onClick={toggle}
      title={`Переключить на ${mode === 'light' ? 'тёмную' : 'светлую'} тему`}
      aria-label={`Переключить на ${mode === 'light' ? 'тёмную' : 'светлую'} тему`}
    >
      {mode === 'light' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="var(--color-text)" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" fill="var(--color-text)" />
          <line x1="12" y1="1" x2="12" y2="3" stroke="var(--color-text)" />
          <line x1="12" y1="21" x2="12" y2="23" stroke="var(--color-text)" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="var(--color-text)" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="var(--color-text)" />
          <line x1="1" y1="12" x2="3" y2="12" stroke="var(--color-text)" />
          <line x1="21" y1="12" x2="23" y2="12" stroke="var(--color-text)" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="var(--color-text)" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="var(--color-text)" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
