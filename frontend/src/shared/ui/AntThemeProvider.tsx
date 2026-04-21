import React, { useEffect, useState } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';

export type ThemeMode = 'light' | 'dark';

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
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

  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  const tokens = {
    colorPrimary: mode === 'dark' ? '#d4af37' : '#c09b46',
    colorInfo: mode === 'dark' ? '#0a84ff' : '#0071e3',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: mode === 'dark' ? '#0c0d10' : '#f5f6fa',
    colorTextBase: mode === 'dark' ? '#e7e9ee' : '#0f172a',
    colorBorder: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    borderRadius: 12,
    borderRadiusLG: 14,
    borderRadiusSM: 10,
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
              headerBg: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
              headerColor: mode === 'dark' ? '#e7e9ee' : '#0f172a',
              rowHoverBg: mode === 'dark' ? 'rgba(212,175,55,0.08)' : 'rgba(192,155,70,0.06)',
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
            },
            Card: {
              colorBgContainer: mode === 'dark' ? 'rgba(24,27,33,0.72)' : 'rgba(255,255,255,0.72)',
            },
            Button: {
              controlHeight: 38,
              fontWeight: 500,
            },
            Modal: {
              borderRadiusLG: 18,
            },
            Input: { controlHeight: 38 },
            Select: { controlHeight: 38 },
            DatePicker: { controlHeight: 38 },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntThemeContext.Provider>
  );
};

export default AntThemeProvider;
