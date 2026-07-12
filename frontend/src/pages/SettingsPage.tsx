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
  max-width: 720px;
  width: 100%;
  margin: 0;
  padding: 0 24px;
`;

const SettingsTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 28px;
  color: var(--color-text);
  letter-spacing: -0.02em;
`;

const SettingsSection = styled.div`
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: none;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text);
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
`;

const SettingDescription = styled.div`
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
`;

const SettingsPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Тёмная тема удалена из проекта — приложение всегда в светлой теме.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

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
        setUser(response.data.user);
        setIsLoading(false);
      } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        setIsLoading(false);
        localStorage.removeItem('token');
        navigate('/auth');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleTabClick = (tab: string) => {
    navigate(`/crm?tab=${encodeURIComponent(tab)}`);
  };

  if (isLoading) return null;

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