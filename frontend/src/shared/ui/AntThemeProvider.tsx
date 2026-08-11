import React, { useEffect, useState } from 'react';
import { App, ConfigProvider, theme as antTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';

export type ThemeMode = 'light' | 'dark';

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
      return saved;
    }
  } catch { /* storage can be unavailable in private contexts */ }
  document.documentElement.setAttribute('data-theme', 'light');
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
      }, 320);
    }
    isFirstRender.current = false;
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem('theme', mode); } catch { /* storage can be unavailable */ }
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

  const toggle = () => setMode(current => current === 'light' ? 'dark' : 'light');

  const tokens = {
    colorPrimary: mode === 'dark' ? '#6651D4' : '#4F46E5',
    colorInfo: mode === 'dark' ? '#6651D4' : '#4F46E5',
    colorSuccess: '#12B76A',
    colorWarning: '#F79009',
    colorError: '#F04438',
    colorBgBase: mode === 'dark' ? '#0F1116' : '#F6F7FB',
    colorTextBase: mode === 'dark' ? '#E6E8EF' : '#101828',
    colorBorder: mode === 'dark' ? '#2A2F3D' : '#E4E7EC',
    borderRadius: 10,
    borderRadiusLG: 14,
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
              headerBg: mode === 'dark' ? '#161A22' : '#F8FAFC',
              headerColor: mode === 'dark' ? '#8B8FA3' : '#475467',
              rowHoverBg: mode === 'dark' ? 'rgba(124,92,255,0.06)' : '#F9FAFB',
              borderColor: mode === 'dark' ? '#2A2F3D' : '#EAECF0',
              colorBgContainer: mode === 'dark' ? '#161A22' : undefined,
              cellPaddingBlock: 13,
              cellPaddingInline: 16,
            },
            Card: {
              colorBgContainer: mode === 'dark' ? '#161A22' : '#FFFFFF',
            },
            Button: {
              controlHeight: 40,
              fontWeight: 600,
              borderRadius: 10,
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
              controlHeight: 40,
              colorBgContainer: mode === 'dark' ? '#1D2230' : undefined,
              activeBorderColor: mode === 'dark' ? '#7C5CFF' : undefined,
              hoverBorderColor: mode === 'dark' ? '#7C5CFF' : undefined,
            },
            Select: {
              controlHeight: 40,
              colorBgContainer: mode === 'dark' ? '#1D2230' : '#ffffff',
              colorBgElevated: mode === 'dark' ? '#1D2230' : '#ffffff',
              optionActiveBg: mode === 'dark' ? 'rgba(124,92,255,0.12)' : 'rgba(30,64,175,0.06)',
              optionSelectedBg: mode === 'dark' ? 'rgba(124,92,255,0.16)' : 'rgba(30,64,175,0.10)',
            },
            DatePicker: {
              controlHeight: 40,
              colorBgContainer: mode === 'dark' ? '#1D2230' : '#ffffff',
              colorBgElevated: mode === 'dark' ? '#1D2230' : '#ffffff',
            },
            Tabs: {
              inkBarColor: mode === 'dark' ? '#A493F2' : undefined,
              itemActiveColor: mode === 'dark' ? '#E6E8EF' : undefined,
              itemSelectedColor: mode === 'dark' ? '#AFA0F4' : undefined,
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
