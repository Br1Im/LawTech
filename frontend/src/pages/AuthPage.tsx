import { Button, Form, Input, message, Select, Tabs } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import BG from '../assets/Auth/BG.png';
import { buildApiUrl } from '../shared/utils/apiUtils';

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  userType: 'lawyer' | 'office' | 'manager' | 'okk' | 'expert' | 'admin' | 'representative';
  officeType?: 'new' | 'existing' | '';
  officeId?: string;
}

// Добавляем стили анимаций в head
if (typeof document !== 'undefined') {
  const styleId = 'auth-page-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes shimmer {
        0% {
          background-position: -1000px 0;
        }
        100% {
          background-position: 1000px 0;
        }
      }

      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .auth-container-animated {
        position: relative;
        overflow: hidden;
      }

      .auth-container-animated::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(212, 175, 55, 0.2));
        pointer-events: none;
        animation: fadeInUp 1s ease forwards;
      }

      .floating-particle {
        position: absolute;
        width: 6px;
        height: 6px;
        background: linear-gradient(135deg, #d4af37, #f5d97b);
        border-radius: 50%;
        opacity: 0.6;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        z-index: 1;
        animation: float ease-in-out infinite;
      }

      .auth-form-animated {
        animation: scaleIn 0.6s ease forwards;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px);
        border-radius: 20px !important;
        border: 1px solid rgba(212, 175, 55, 0.2);
        position: relative;
        overflow: hidden;
      }

      .auth-form-animated::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #d4af37, #f5d97b, #d4af37);
        background-size: 200% auto;
        animation: shimmer 3s linear infinite;
      }

      .auth-logo {
        animation: fadeInUp 0.8s ease forwards;
        animation-delay: 0.2s;
        opacity: 0;
      }

      .auth-logo h1 {
        background: linear-gradient(135deg, #d4af37, #f5d97b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 32px;
        font-weight: 800;
        margin: 0 0 8px 0;
      }

      .auth-tabs {
        animation: fadeInUp 0.8s ease forwards;
        animation-delay: 0.4s;
        opacity: 0;
      }

      .auth-tabs .ant-tabs-tab {
        font-size: 16px;
        font-weight: 600;
        padding: 12px 24px;
        transition: all 0.3s ease;
      }

      .auth-tabs .ant-tabs-tab:hover {
        color: #d4af37;
      }

      .auth-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
        color: #d4af37;
      }

      .auth-tabs .ant-tabs-ink-bar {
        background: linear-gradient(90deg, #d4af37, #f5d97b);
        height: 3px;
      }

      .auth-form-animated .ant-form-item {
        animation: slideIn 0.5s ease forwards;
        opacity: 0;
      }

      .auth-form-animated .ant-form-item:nth-child(1) { animation-delay: 0.1s; }
      .auth-form-animated .ant-form-item:nth-child(2) { animation-delay: 0.2s; }
      .auth-form-animated .ant-form-item:nth-child(3) { animation-delay: 0.3s; }
      .auth-form-animated .ant-form-item:nth-child(4) { animation-delay: 0.4s; }
      .auth-form-animated .ant-form-item:nth-child(5) { animation-delay: 0.5s; }
      .auth-form-animated .ant-form-item:nth-child(6) { animation-delay: 0.6s; }
      .auth-form-animated .ant-form-item:nth-child(7) { animation-delay: 0.7s; }

      .auth-form-animated .ant-input,
      .auth-form-animated .ant-input-password,
      .auth-form-animated .ant-select-selector {
        border-radius: 8px !important;
        border: 2px solid #e0e0e0 !important;
        padding: 10px 15px !important;
        transition: all 0.3s ease !important;
        height: auto !important;
        min-height: 40px !important;
      }

      .auth-form-animated .ant-input:hover,
      .auth-form-animated .ant-input-password:hover,
      .auth-form-animated .ant-select:hover .ant-select-selector {
        border-color: #d4af37 !important;
      }

      .auth-form-animated .ant-input:focus,
      .auth-form-animated .ant-input-password:focus,
      .auth-form-animated .ant-input-focused,
      .auth-form-animated .ant-select-focused .ant-select-selector {
        border-color: #d4af37 !important;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1) !important;
      }

      .auth-form-animated .ant-btn-primary {
        width: 100%;
        height: 48px !important;
        border-radius: 12px !important;
        background: linear-gradient(135deg, #d4af37, #f5d97b) !important;
        border: none !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        color: #fff !important;
        cursor: pointer;
        transition: all 0.3s ease !important;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4) !important;
      }

      .auth-form-animated .ant-btn-primary::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s;
      }

      .auth-form-animated .ant-btn-primary:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(212, 175, 55, 0.6) !important;
      }

      .auth-form-animated .ant-btn-primary:hover::before {
        left: 100%;
      }

      .auth-form-animated .ant-btn-primary:active {
        transform: translateY(0) !important;
      }

      .auth-back-link {
        animation: fadeInUp 0.8s ease forwards;
        animation-delay: 0.6s;
        opacity: 0;
        transition: all 0.3s ease;
      }

      .auth-back-link:hover {
        color: #d4af37 !important;
        transform: translateX(-5px);
      }

      .test-accounts-btn {
        animation: fadeInUp 0.8s ease forwards;
        animation-delay: 0.8s;
        opacity: 0;
        transition: all 0.3s ease;
      }

      .test-accounts-btn:hover {
        border-color: #d4af37 !important;
        color: #d4af37 !important;
        background: rgba(212, 175, 55, 0.05) !important;
      }

      .test-account-item {
        animation: slideIn 0.5s ease forwards;
        opacity: 0;
        transition: all 0.3s ease;
      }

      .test-account-item:nth-child(1) { animation-delay: 0.1s; }
      .test-account-item:nth-child(2) { animation-delay: 0.2s; }
      .test-account-item:nth-child(3) { animation-delay: 0.3s; }

      .test-account-item:hover {
        border-color: #d4af37 !important;
        transform: translateX(5px);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
      }
    `;
    document.head.appendChild(style);
  }
}

const AuthContainer: CSSProperties = {
  width: '100vw',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundImage: `url(${BG})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const AuthFormContainer: CSSProperties = {
  backgroundColor: 'var(--color-bg)',
  padding: '40px',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '450px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  maxHeight: '900px',
  overflow: 'hidden',
  position: 'relative',
  zIndex: 2,
};

const BackLink: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  color: 'var(--color-muted)',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  marginTop: '20px',
};

const FormStyle: CSSProperties = {
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 1,
  transform: 'translateY(0)',
};

const AuthPage = () => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [userType, setUserType] = useState<'lawyer' | 'office' | 'manager' | 'okk' | 'expert' | 'admin' | 'representative' | ''>('');
  const [officeType, setOfficeType] = useState<'new' | 'existing' | ''>('');
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  // Проверка авторизации - если уже авторизован, перенаправляем на CRM
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Пользователь уже авторизован, перенаправляем на CRM');
      navigate('/crm', { replace: true });
    }
  }, [navigate]);

  // Очистка localStorage от флага useAbsoluteUrls при загрузке компонента
  useEffect(() => {
    localStorage.removeItem('useAbsoluteUrls');
  }, []);

  // Тестовые аккаунты
  const testAccounts = [
    {
      name: 'Администратор - Иван Админов',
      email: 'admin@lawtech.ru',
      password: 'admin123',
      role: 'admin'
    },
    {
      name: 'Директор - Петр Директоров', 
      email: 'director@pravoved.ru',
      password: 'director123',
      role: 'director'
    },
    {
      name: 'Юрист - Анна Юристова',
      email: 'lawyer1@pravoved.ru', 
      password: 'lawyer123',
      role: 'lawyer'
    }
  ];

  // Функция для автозаполнения формы тестовыми данными
  const fillTestAccount = (account: typeof testAccounts[0]) => {
    form.setFieldsValue({
      email: account.email,
      password: account.password
    });
    setMode('login');
    setShowTestAccounts(false);
  };

  const handleRegisterSubmit = async (values: RegisterFormValues) => {
      try {
        console.log('📝 Попытка регистрации:', { email: values.email, userType: values.userType });
        
        const apiUrl = buildApiUrl('/auth/register');
        console.log('📡 URL запроса:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify(values),
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          }
        });

        console.log('📥 Ответ сервера:', response.status, response.statusText);

        if (!response.ok) {
          let errorMessage = '';
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || '';
            console.error('❌ Ошибка от сервера:', errorData);
          } catch {
            console.error('❌ Не удалось прочитать ответ сервера');
          }
          
          // Формируем понятное сообщение об ошибке
          if (response.status === 400) {
            throw new Error(errorMessage || 'Неверные данные. Проверьте заполнение полей');
          } else if (response.status === 409) {
            throw new Error('Пользователь с таким email уже существует');
          } else if (response.status === 500) {
            throw new Error('Ошибка сервера. Попробуйте позже');
          } else if (response.status === 0 || !response.status) {
            throw new Error('Сервер недоступен');
          } else {
            throw new Error(errorMessage || `Ошибка: ${response.statusText}`);
          }
        }

        const data = await response.json();
        console.log('✅ Успешная регистрация');
        
        localStorage.setItem('token', data.token);
        message.success('Регистрация выполнена успешно!');
        navigate('/crm');
        form.resetFields();
        setUserType('');
        setOfficeType('');
      } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        
        // Определяем тип ошибки и показываем понятное сообщение
        if (error instanceof TypeError && error.message.includes('fetch')) {
          message.error('Не удалось подключиться к серверу. Попробуйте позже', 5);
        } else if (error instanceof Error) {
          message.error(error.message, 5);
        } else {
          message.error('Произошла ошибка при регистрации', 5);
        }
      }
  };

  const handleLoginSubmit = async (values: LoginFormValues) => {
    try {
      console.log('🔐 Попытка входа:', { email: values.email });
      
      const apiUrl = buildApiUrl('/auth/login');
      console.log('📡 URL запроса:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(values),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        }
      });

      console.log('📥 Ответ сервера:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = '';
        
        // Клонируем response для возможности повторного чтения
        const responseClone = response.clone();
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || '';
          console.error('❌ Ошибка от сервера:', errorData);
        } catch {
          // Если не удается парсить JSON, используем клонированный response для текста
          try {
            const errorText = await responseClone.text();
            errorMessage = errorText || '';
            console.error('❌ Текст ошибки:', errorText);
          } catch {
            console.error('❌ Не удалось прочитать ответ сервера');
          }
        }
        
        // Формируем понятное сообщение об ошибке
        if (response.status === 401) {
          throw new Error('❌ Неверный email или пароль');
        } else if (response.status === 404) {
          throw new Error('❌ Пользователь не найден');
        } else if (response.status === 500) {
          throw new Error('❌ Ошибка сервера. Попробуйте позже');
        } else if (response.status === 0 || !response.status) {
          throw new Error('❌ Сервер недоступен. Проверьте подключение');
        } else {
          throw new Error(errorMessage || `❌ Ошибка ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Успешный вход, данные:', data);
      
      if (!data.token) {
        throw new Error('Сервер не вернул токен');
      }
      
      console.log('💾 Сохраняем токен в localStorage');
      localStorage.setItem('token', data.token);
      
      // Проверяем что токен сохранился
      const savedToken = localStorage.getItem('token');
      console.log('✅ Токен сохранен:', savedToken ? 'Да' : 'Нет');
      
      message.success('Вход выполнен успешно!');
      
      console.log('🔄 Переход на /crm');
      navigate('/crm');
      form.resetFields();
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      
      // Определяем тип ошибки и показываем понятное сообщение
      if (error instanceof TypeError && error.message.includes('fetch')) {
        message.error('❌ Не удалось подключиться к серверу. Проверьте, что сервер запущен на порту 3001', 5);
      } else if (error instanceof Error) {
        message.error(error.message, 5);
      } else {
        message.error('❌ Произошла неизвестная ошибка при входе', 5);
      }
    }
  };

  return (
    <div style={AuthContainer} className="auth-container-animated">
      {/* Плавающие частицы */}
      <div className="floating-particle" style={{ left: '10%', top: '20%', animationDuration: '3s', animationDelay: '0s' }} />
      <div className="floating-particle" style={{ left: '85%', top: '30%', animationDuration: '4s', animationDelay: '0.5s' }} />
      <div className="floating-particle" style={{ left: '15%', top: '70%', animationDuration: '3.5s', animationDelay: '1s' }} />
      <div className="floating-particle" style={{ left: '90%', top: '60%', animationDuration: '4.5s', animationDelay: '1.5s' }} />
      <div className="floating-particle" style={{ left: '50%', top: '10%', animationDuration: '3.8s', animationDelay: '2s' }} />
      <div className="floating-particle" style={{ left: '50%', top: '90%', animationDuration: '4.2s', animationDelay: '2.5s' }} />
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '40px',
          height: '40px',
          backgroundColor: showTestAccounts ? 'var(--color-primary)' : 'rgba(0,0,0,0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
        onClick={() => setShowTestAccounts(!showTestAccounts)}
        title="Тестовые аккаунты"
      >
        🔧
      </div>
      
      {showTestAccounts && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          width: '300px',
          backgroundColor: 'var(--color-bg)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          zIndex: 999,
          padding: '16px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '8px'
          }}>
            <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: '16px' }}>Тестовые аккаунты</h3>
            <button 
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--color-muted)',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setShowTestAccounts(false)}
            >
              ×
            </button>
          </div>
          <div>
            {testAccounts.map((account, index) => (
              <div 
                key={index}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: 'var(--color-bg-secondary, rgba(0,0,0,0.05))',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => fillTestAccount(account)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-light, rgba(0,0,0,0.1))';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary, rgba(0,0,0,0.05))';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                <div style={{ fontWeight: '500', color: 'var(--color-text)', fontSize: '14px', marginBottom: '4px' }}>{account.name}</div>
                <div style={{ color: 'var(--color-muted)', fontSize: '12px', marginBottom: '2px' }}>{account.email}</div>
                <div style={{ color: 'var(--color-primary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '500' }}>{account.role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ ...AuthFormContainer, maxHeight: mode === 'register' ? '900px' : '600px' }} className="auth-form-animated">
        <div className="auth-logo" style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1>LawTech CRM</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', margin: 0 }}>Управление юридическим офисом</p>
        </div>
        <Tabs
          activeKey={mode}
          onChange={(key) => setMode(key as 'register' | 'login')}
          centered
          className="auth-tabs"
          items={[
            { key: 'register', label: 'Регистрация' },
            { key: 'login', label: 'Вход' },
          ]}
          tabBarStyle={{
            color: 'var(--color-muted)',
            marginBottom: '24px',
          }}
        />

        {mode === 'register' ? (
          <div style={{ ...FormStyle, opacity: 1, transform: 'translateY(0)' }}>
            <Form form={form} onFinish={handleRegisterSubmit} layout="vertical">
              <Form.Item 
                className="auth-form-item"
                label="Имя" 
                name="name" 
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input
                  className="auth-input"
                  placeholder="Имя"
                />
              </Form.Item>
              <Form.Item
                label="Электронная почта"
                name="email"
                rules={[{ required: true, message: 'Введите почту', type: 'email' }]}
              >
                <Input
                  placeholder="Электронная почта"
                  style={{
                    borderColor: 'var(--color-border)',
                    transition: 'border-color 0.3s ease-in-out',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password
                  placeholder="Пароль"
                  style={{
                    borderColor: 'var(--color-border)',
                    transition: 'border-color 0.3s ease-in-out',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Тип пользователя"
                name="userType"
                rules={[{ required: true, message: 'Выберите тип пользователя' }]}
              >
                <Select
                  value={userType}
                  onChange={(value) => setUserType(value)}
                  placeholder="Выберите тип пользователя"
                >
                  <Select.Option value="lawyer">Одиночный юрист</Select.Option>
                  <Select.Option value="office">Офис</Select.Option>
                  <Select.Option value="manager">Менеджер</Select.Option>
                  <Select.Option value="okk">ОКК</Select.Option>
                  <Select.Option value="expert">Эксперт</Select.Option>
                  <Select.Option value="admin">Администратор</Select.Option>
                  <Select.Option value="representative">Представитель</Select.Option>
                </Select>
              </Form.Item>
              {userType === 'office' && (
                <Form.Item
                  label="Тип офиса"
                  name="officeType"
                  rules={[{ required: true, message: 'Выберите тип офиса' }]}
                >
                  <Select
                    value={officeType}
                    onChange={(value) => setOfficeType(value)}
                    placeholder="Выберите тип офиса"
                  >
                    <Select.Option value="new">Новый офис</Select.Option>
                    <Select.Option value="existing">Существующий офис</Select.Option>
                  </Select>
                </Form.Item>
              )}
              {userType === 'office' && officeType === 'existing' && (
                <Form.Item
                  label="ID офиса"
                  name="officeId"
                  rules={[{ required: true, message: 'Введите ID офиса' }]}
                >
                  <Input
                    placeholder="ID офиса"
                    style={{
                      borderColor: 'var(--color-border)',
                      transition: 'border-color 0.3s ease-in-out',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-primary)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-border)';
                    }}
                  />
                </Form.Item>
              )}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  style={{
                    backgroundColor: 'var(--color-button-bg)',
                    borderColor: 'var(--color-button-bg)',
                    color: 'var(--color-button-text)',
                  }}
                  onMouseEnter={(e) => {       
                    e.currentTarget.style.color = 'var(--color-button-text)';
                    e.currentTarget.style.borderColor = 'var(--color-button-bg)';
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-button-text)';
                    e.currentTarget.style.borderColor = 'var(--color-button-bg)';
                    e.currentTarget.style.backgroundColor = 'var(--color-button-bg)';
                  }}
                >
                  Зарегистрироваться
                </Button>
              </Form.Item>
            </Form>
          </div>
        ) : (
          <div style={{ ...FormStyle, opacity: 1, transform: 'translateY(0)' }}>
            <Form form={form} onFinish={handleLoginSubmit} layout="vertical">
              <Form.Item
                label="Электронная почта"
                name="email"
                rules={[{ required: true, message: 'Введите почту', type: 'email' }]}
              >
                <Input
                  placeholder="Электронная почта"
                  style={{
                    borderColor: 'var(--color-border)',
                    transition: 'border-color 0.3s ease-in-out',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password
                  placeholder="Пароль"
                  style={{
                    borderColor: 'var(--color-border)',
                    transition: 'border-color 0.3s ease-in-out',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                  }}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  style={{
                    backgroundColor: 'var(--color-button-bg)',
                    borderColor: 'var(--color-button-bg)',
                    color: 'var(--color-button-text)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-button-text)';
                    e.currentTarget.style.borderColor = 'var(--color-button-bg)';
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-button-bg)';
                    e.currentTarget.style.color = 'var(--color-button-text)';
                    e.currentTarget.style.borderColor = 'var(--color-button-bg)';
                  }}
                >
                  Войти
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        <Link
          to="/"
          style={BackLink}
          className="auth-back-link"
        >
          ← Вернуться на главную
        </Link>
      </div>

      <style>
        {`
          .custom-tabs .ant-tabs-tab {
            transition: all 0.3s ease-in-out;
          }
          .custom-tabs .ant-tabs-tab .ant-tabs-tab-btn {
            color: var(--color-text) !important;
          }
          .custom-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
            color: var(--color-text) !important;
          }
          .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: var(--color-text) !important;
            font-weight: 500;
          }
          .custom-tabs .ant-tabs-ink-bar {
            backgroundColor: var(--color-accent) !important;
          }
          .custom-tabs .ant-tabs-tab-btn {
            padding: 8px 16px;
            border-radius: 4px;
          }
          .ant-form-item-label > label {
            color: var(--color-text) !important;
          }
        `}
      </style>
    </div>
  );
};

export default AuthPage;