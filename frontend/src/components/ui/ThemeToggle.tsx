import React from 'react';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import './ThemeToggle.css';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle, isMobile = false }) => {
  return (
    <button
      className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
      onClick={onToggle}
      title={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
      style={{
        width: isMobile ? '36px' : '40px',
        height: isMobile ? '36px' : '40px',
      }}
    >
      <div className="theme-toggle-icon">
        {isDark ? (
          <BulbFilled className="icon-filled" />
        ) : (
          <BulbOutlined className="icon-outlined" />
        )}
      </div>
      <div className="theme-toggle-bg"></div>
    </button>
  );
};

export default ThemeToggle;
