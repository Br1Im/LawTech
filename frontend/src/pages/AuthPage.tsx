import { Button, Form, Input, message, Select, Tabs } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import BG from '../assets/Auth/BG.png';
import { buildApiUrl } from '../shared/utils/apiUtils';
import { getAbsoluteApiUrl } from '../shared/config/constants';

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  userType: 'lawyer' | 'office';
  officeType?: 'new' | 'existing' | '';
  officeId?: string;
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
  padding: '32px',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '400px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
  maxHeight: '750px',
  overflow: 'hidden',
};

const BackLink: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  color: 'var(--color-muted)',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  marginTop: '16px',
};

const FormStyle: CSSProperties = {
  transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
  opacity: 1,
  transform: 'translateY(0)',
};

const AuthPage = () => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [userType, setUserType] = useState<'lawyer' | 'office' | ''>('');
  const [officeType, setOfficeType] = useState<'new' | 'existing' | ''>('');
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [useAbsoluteUrls, setUseAbsoluteUrls] = useState(false);

  const handleRegisterSubmit = async (values: RegisterFormValues) => {
      try {
        let response = await fetch(buildApiUrl('/auth/register'), {
          method: 'POST',
          body: JSON.stringify(values),
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          }
        });

        if (!response.ok && (response.status === 404 || response.type === 'opaque')) {
          console.log('Попытка с абсолютным URL:', getAbsoluteApiUrl('/auth/register'));
          setUseAbsoluteUrls(true);
          response = await fetch(getAbsoluteApiUrl('/auth/register'), {
            method: 'POST',
            body: JSON.stringify(values),
            headers: {
              'Content-Type': 'application/json; charset=UTF-8'
            }
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Ошибка: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('useAbsoluteUrls', String(useAbsoluteUrls));
        message.success('Регистрация успешна!');
        navigate('/crm');
        form.resetFields();
        setUserType('');
        setOfficeType('');
      } catch (error) {
        message.error((error as Error).message || 'Ошибка регистрации');
      }
  };

  const handleLoginSubmit = async (values: LoginFormValues) => {
    try {
      let response;

      if (useAbsoluteUrls || localStorage.getItem('useAbsoluteUrls') === 'true') {
        response = await fetch(getAbsoluteApiUrl('/auth/login'), {
          method: 'POST',
          body: JSON.stringify(values),
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          }
        });
      } else {
        try {
          response = await fetch(buildApiUrl('/auth/login'), {
            method: 'POST',
            body: JSON.stringify(values),
            headers: {
              'Content-Type': 'application/json; charset=UTF-8'
            }
          });

          if (!response.ok && (response.status === 404 || response.type === 'opaque')) {
            console.log('Попытка с абсолютным URL:', getAbsoluteApiUrl('/auth/login'));
            setUseAbsoluteUrls(true);
            localStorage.setItem('useAbsoluteUrls', 'true');
            response = await fetch(getAbsoluteApiUrl('/auth/login'), {
              method: 'POST',
              body: JSON.stringify(values),
              headers: {
                'Content-Type': 'application/json; charset=UTF-8'
              }
            });
          }
        } catch (error) {
          console.log('Ошибка при использовании относительного URL, пробуем абсолютный');
          setUseAbsoluteUrls(true);
          localStorage.setItem('useAbsoluteUrls', 'true');
          response = await fetch(getAbsoluteApiUrl('/auth/login'), {
            method: 'POST',
            body: JSON.stringify(values),
            headers: {
              'Content-Type': 'application/json; charset=UTF-8'
            }
          });
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('useAbsoluteUrls', String(useAbsoluteUrls));
      message.success('Вход успешно выполнен!');
      navigate('/crm');
      form.resetFields();
    } catch (error) {
      message.error((error as Error).message || 'Ошибка входа');
    }
  };

  return (
    <div style={AuthContainer}>
      <div style={{ ...AuthFormContainer, maxHeight: mode === 'register' ? '750px' : '500px' }}>
        <Tabs
          activeKey={mode}
          onChange={(key) => setMode(key as 'register' | 'login')}
          centered
          items={[
            { key: 'register', label: 'Регистрация' },
            { key: 'login', label: 'Вход' },
          ]}
          tabBarStyle={{
            color: 'var(--color-muted)',
            marginBottom: '24px',
          }}
          className="custom-tabs"
          style={{color: 'var(--color-muted)'}}
        />

        {mode === 'register' ? (
          <div style={{ ...FormStyle, opacity: 1, transform: 'translateY(0)' }}>
            <Form onFinish={handleRegisterSubmit} layout="vertical">
              <Form.Item 
                label="Имя" 
                name="name" 
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input
                  placeholder="Имя"
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
            <Form onFinish={handleLoginSubmit} layout="vertical">
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
          style={{
            ...BackLink,
            transition: 'color 0.3s ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-muted)';
          }}
        >
          Вернуться на главную
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