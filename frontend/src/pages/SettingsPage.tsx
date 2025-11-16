import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Layout } from 'antd';
import Sidebar from '../components/ui/Sidebar';
import { useNavigate } from 'react-router-dom';
import apiClient from '../shared/api/apiClient';

const { Content } = Layout;

const SettingsLayout = styled(Layout)`
  min-height: 100vh;
  background-color: var(--color-bg-alt);
`;

const SettingsContent = styled(Content)`
  padding: 24px;
  background-color: var(--color-bg-alt);
  color: var(--color-text);
  transition: margin-left 0.2s;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 16px;
  }
`;

const SettingsContainer = styled.div`
  max-width: 100%;
  width: 100%;
  margin: 0;
  padding: 0 24px;
`;

const SettingsTitle = styled.h1`
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 32px;
  color: var(--color-text);
`;

const SettingsSection = styled.div`
  background: var(--color-card-bg);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--color-text);
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.div`
  font-size: 16px;
  color: var(--color-text);
`;

const SettingDescription = styled.div`
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
cursor: pointer;
  margin-bottom: 24px;
  transition: background-color 0.2s;
  
  &:hover {
    background: var(--color-primary-hover);
  }
`;

const SettingsPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Применяем тему при изменении состояния
    const theme = isDarkTheme ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Проверяем токен и загружаем данные пользователя
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      try {
        // Проверяем валидность токена через API
        const response = await apiClient.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        localStorage.removeItem('token');
        navigate('/auth');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleTabClick = (tab: string) => {
    // Обработка переключения вкладок в сайдбаре
    console.log('Tab clicked:', tab);
  };

  return (
    <SettingsLayout>
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        activeTab="settings"
        onTabClick={handleTabClick}
        isMobile={isMobile}
        user={user}
      />
      <SettingsContent style={{ marginLeft: collapsed ? '80px' : '200px' }} >
        <SettingsContainer>
          <SettingsTitle>Настройки</SettingsTitle>
          
          <SettingsSection>
            <SectionTitle>Общие настройки</SectionTitle>
            <SettingItem>
              <div>
                <SettingLabel>Тема оформления</SettingLabel>
                <SettingDescription>Выберите светлую или темную тему</SettingDescription>
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-button-text)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {isDarkTheme ? 'Темная' : 'Светлая'}
              </button>
            </SettingItem>
            <SettingItem>
              <div>
                <SettingLabel>Язык интерфейса</SettingLabel>
                <SettingDescription>Выберите язык для отображения интерфейса</SettingDescription>
              </div>
              <div>Русский</div>
            </SettingItem>
          </SettingsSection>

          <SettingsSection>
            <SectionTitle>Уведомления</SectionTitle>
            <SettingItem>
              <div>
                <SettingLabel>Email уведомления</SettingLabel>
                <SettingDescription>Получать уведомления на электронную почту</SettingDescription>
              </div>
              <div>Включено</div>
            </SettingItem>
            <SettingItem>
              <div>
                <SettingLabel>Push уведомления</SettingLabel>
                <SettingDescription>Получать push-уведомления в браузере</SettingDescription>
              </div>
              <div>Включено</div>
            </SettingItem>
          </SettingsSection>

          <SettingsSection>
            <SectionTitle>Безопасность</SectionTitle>
            <SettingItem>
              <div>
                <SettingLabel>Двухфакторная аутентификация</SettingLabel>
                <SettingDescription>Дополнительная защита вашего аккаунта</SettingDescription>
              </div>
              <div>Отключено</div>
            </SettingItem>
            <SettingItem>
              <div>
                <SettingLabel>Сменить пароль</SettingLabel>
                <SettingDescription>Обновить пароль для входа в систему</SettingDescription>
              </div>
              <div>Изменить</div>
            </SettingItem>
          </SettingsSection>
        </SettingsContainer>
      </SettingsContent>
    </SettingsLayout>
  );
};

export default SettingsPage;