import React, { useEffect, useState } from 'react';
import { App, ConfigProvider, theme as antTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';

export type ThemeMode = 'light' | 'dark';

function readInitialTheme(): ThemeMode {
  // Тёмная тема удалена из проекта — приложение всегда в светлой теме.
  if (typeof window !== 'undefined') {
    try { localStorage.setItem('theme', 'light'); } catch { /* noop */ }
  }
  return 'light';
}

interface AntThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const AntThemeContext = React.createContext<AntThemeContextValue>({
  mode: 'light',
  toggle: () => {},
  setMode: () => {},
});

export const useThemeMode = () => React.useContext(AntThemeContext);

interface AntThemeProviderProps {
  children: React.ReactNode;
}

const AntThemeProvider: React.FC<AntThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(readInitialTheme);

  const isFirstRender = React.useRef(true);
  useEffect(() => {
    const root = document.documentElement;
    // На самом первом рендере не анимируем — просто выставляем тему.
    if (!isFirstRender.current) {
      // Включаем единый плавный кросс-фейд цветов на время переключения темы,
      // чтобы все элементы меняли цвет одновременно (без рывков/прерывистости).
      root.classList.add('theme-transition');
      window.clearTimeout((window as any).__themeTransitionTimer);
      (window as any).__themeTransitionTimer = window.setTimeout(() => {
        root.classList.remove('theme-transition');
      }, 420);
    }
    isFirstRender.current = false;
    root.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setMode(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {}; // тёмная тема удалена из проекта

  const tokens = {
    colorPrimary: mode === 'dark' ? '#7C5CFF' : '#1E40AF',
    colorInfo: mode === 'dark' ? '#3B82F6' : '#0071e3',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorBgBase: mode === 'dark' ? '#0F1116' : '#f5f6fa',
    colorTextBase: mode === 'dark' ? '#E6E8EF' : '#0f172a',
    colorBorder: mode === 'dark' ? '#2A2F3D' : 'rgba(15,23,42,0.08)',
    borderRadius: 8,
    borderRadiusLG: 8,
    borderRadiusSM: 8,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    wireframe: false,
  };

  return (
    <AntThemeContext.Provider value={{ mode, toggle, setMode }}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          algorithm: mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: tokens,
          components: {
            Table: {
              headerBg: mode === 'dark' ? '#161A22' : 'rgba(15,23,42,0.03)',
              headerColor: mode === 'dark' ? '#8B8FA3' : '#0f172a',
              rowHoverBg: mode === 'dark' ? 'rgba(124,92,255,0.06)' : 'rgba(30,64,175,0.03)',
              borderColor: mode === 'dark' ? '#2A2F3D' : 'rgba(15,23,42,0.06)',
              colorBgContainer: mode === 'dark' ? '#161A22' : undefined,
            },
            Card: {
              colorBgContainer: mode === 'dark' ? '#161A22' : 'rgba(255,255,255,0.72)',
            },
            Button: {
              controlHeight: 38,
              fontWeight: 500,
              borderRadius: 8,
            },
            Modal: {
              borderRadiusLG: 8,
              contentBg: mode === 'dark' ? '#161A22' : '#ffffff',
              headerBg: mode === 'dark' ? '#161A22' : '#ffffff',
            },
            Drawer: {
              colorBgElevated: mode === 'dark' ? '#161A22' : '#ffffff',
            },
            Input: {
              controlHeight: 38,
              colorBgContainer: mode === 'dark' ? '#1D2230' : undefined,
              activeBorderColor: mode === 'dark' ? '#7C5CFF' : undefined,
              hoverBorderColor: mode === 'dark' ? '#7C5CFF' : undefined,
            },
            Select: {
              controlHeight: 38,
              colorBgContainer: mode === 'dark' ? '#1D2230' : '#ffffff',
              colorBgElevated: mode === 'dark' ? '#1D2230' : '#ffffff',
              optionActiveBg: mode === 'dark' ? 'rgba(124,92,255,0.12)' : 'rgba(30,64,175,0.06)',
              optionSelectedBg: mode === 'dark' ? 'rgba(124,92,255,0.16)' : 'rgba(30,64,175,0.10)',
            },
            DatePicker: {
              controlHeight: 38,
              colorBgContainer: mode === 'dark' ? '#1D2230' : '#ffffff',
              colorBgElevated: mode === 'dark' ? '#1D2230' : '#ffffff',
            },
            Tabs: {
              inkBarColor: mode === 'dark' ? '#7C5CFF' : undefined,
              itemActiveColor: mode === 'dark' ? '#E6E8EF' : undefined,
              itemSelectedColor: mode === 'dark' ? '#E6E8EF' : undefined,
              itemColor: mode === 'dark' ? '#8B8FA3' : undefined,
            },
            Tag: {
              borderRadiusSM: 6,
            },
            Dropdown: {
              colorBgElevated: mode === 'dark' ? '#1D2230' : '#ffffff',
            },
            Popover: {
              colorBgElevated: mode === 'dark' ? '#1D2230' : '#ffffff',
            },
            Tooltip: {
              colorBgSpotlight: mode === 'dark' ? '#1D2230' : '#ffffff',
            },
            Menu: {
              colorBgContainer: mode === 'dark' ? '#161A22' : '#ffffff',
              itemBg: mode === 'dark' ? '#161A22' : '#ffffff',
              itemSelectedBg: mode === 'dark' ? 'rgba(124,92,255,0.12)' : undefined,
              itemSelectedColor: mode === 'dark' ? '#7C5CFF' : undefined,
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntThemeContext.Provider>
  );
};

export default AntThemeProvider;