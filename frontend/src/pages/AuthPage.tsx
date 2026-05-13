import { Button, Form, Input, message, Select, Tabs } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '../shared/utils/apiUtils';
import ThemeToggle from '../components/ui/ThemeToggle';
import './AuthPage.css';

interface LoginFormValues {
  login: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  userType: 'lawyer' | 'office' | 'manager' | 'okk' | 'expert' | 'admin' | 'representative';
  officeType?: 'new' | 'existing' | '';
  officeId?: string;
  officeName?: string;
}

const testAccounts = [
  { name: 'Администратор — Иван Админов', email: 'admin@lawtech.ru', password: 'admin123', role: 'admin' },
  { name: 'Директор — Пётр Директоров', email: 'director@pravoved.ru', password: 'director123', role: 'director' },
  { name: 'Юрист — Анна Юристова', email: 'lawyer1@pravoved.ru', password: 'lawyer123', role: 'lawyer' },
  { name: 'Эксперт — Мария Экспертова', email: 'expert@test.com', password: 'test123', role: 'expert' },
  { name: 'Менеджер — Сергей Менеджеров', email: 'manager@test.com', password: 'test123', role: 'manager' },
  { name: 'ОКК — Ольга Контрольная', email: 'okk@test.com', password: 'test123', role: 'okk' },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('login');
  const [userType, setUserType] = useState<RegisterFormValues['userType'] | ''>('');
  const [officeType, setOfficeType] = useState<'new' | 'existing' | ''>('');
  const [loading, setLoading] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const [form] = Form.useForm();
  const [activeUsers, setActiveUsers] = useState(247);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveUsers((v) =>
        Math.max(180, Math.min(420, v + Math.floor(Math.random() * 7) - 3))
      );
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Если уже авторизован — на CRM
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/crm', { replace: true });
  }, [navigate]);

  useEffect(() => {
    localStorage.removeItem('useAbsoluteUrls');
  }, []);

  const handleRegisterSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/auth/register'), {
        method: 'POST',
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
      if (!response.ok) {
        let err = '';
        try { err = (await response.json()).error || ''; } catch { /* noop */ }
        if (response.status === 409) throw new Error('Пользователь с таким email уже существует');
        if (response.status === 400) throw new Error(err || 'Проверьте заполнение полей');
        if (response.status >= 500) throw new Error('Ошибка сервера. Попробуйте позже');
        throw new Error(err || `Ошибка: ${response.statusText}`);
      }
      const data = await response.json();
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      message.success('Регистрация выполнена. Добро пожаловать!');
      // Директор — на создание офиса, остальные — в CRM
      if (data.user?.needs_office_setup || data.user?.role === 'director') {
        navigate('/welcome');
      } else {
        navigate('/crm');
      }
      form.resetFields();
      setUserType('');
      setOfficeType('');
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('fetch')) {
        message.error('Не удалось подключиться к серверу', 5);
      } else if (e instanceof Error) {
        message.error(e.message, 5);
      } else {
        message.error('Произошла ошибка при регистрации', 5);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
      if (!response.ok) {
        let err = '';
        try { err = (await response.json()).error || ''; } catch { /* noop */ }
        if (response.status === 401) throw new Error('Неверный логин или пароль');
        if (response.status >= 500) throw new Error('Ошибка сервера. Попробуйте позже');
        throw new Error(err || `Ошибка: ${response.statusText}`);
      }
      const data = await response.json();
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      message.success('Вход выполнен');
      // Директор без офисов — на создание
      if (data.user?.needs_office_setup) {
        navigate('/welcome');
      } else {
        navigate('/crm');
      }
      form.resetFields();
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('fetch')) {
        message.error('Не удалось подключиться к серверу', 5);
      } else if (e instanceof Error) {
        message.error(e.message, 5);
      } else {
        message.error('Ошибка входа', 5);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillTestAccount = (acc: typeof testAccounts[number]) => {
    setMode('login');
    setTimeout(() => {
      form.setFieldsValue({ login: acc.email, password: acc.password });
    }, 10);
    setShowTestAccounts(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__bg" aria-hidden>
        <div className="auth-shell__grid" />
      </div>

      <aside className="auth-brand">
        <Link to="/" className="auth-brand__logo" aria-label="На главную">
          <span className="auth-brand__logo-mark">L</span>
          <span>LawTech</span>
        </Link>

        <div className="auth-brand__hero">
          <div className="auth-brand__eyebrow">
            <b>{activeUsers}</b>&nbsp;юристов работают сейчас
          </div>
          <h1 className="auth-brand__title">
            Юридическая практика&nbsp;на <em>автопилоте</em>
          </h1>
          <p className="auth-brand__lead">
            Клиенты, дела, документы, финансы и AI-поиск по законодательству —
            всё в одном рабочем пространстве. Глубокая интеграция, быстрые ответы,
            прозрачная аналитика.
          </p>
          <div className="auth-brand__chips">
            <span className="auth-brand__chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              ФЗ-152 · данные в РФ
            </span>
            <span className="auth-brand__chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Ответ AI — 1.2s
            </span>
            <span className="auth-brand__chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              E2E-шифрование
            </span>
          </div>

          <div className="auth-brand__mockup" aria-hidden>
            <div className="auth-brand__mockup-glow" />
            <div className="auth-brand__mockup-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>
              Сегодня в LawTech
            </div>
            <div className="auth-brand__mockup-row">
              <span>Активные дела</span>
              <span>
                <b>1 248</b> <span className="delta">↑ 12,4%</span>
              </span>
            </div>
            <div className="auth-brand__mockup-row">
              <span>Договоров подписано</span>
              <span>
                <b>34</b> <span className="delta">сегодня</span>
              </span>
            </div>
            <div className="auth-brand__mockup-row">
              <span>AI-проверок</span>
              <span>
                <b>187</b> <span className="delta">без рисков</span>
              </span>
            </div>
          </div>
        </div>

        <div className="auth-brand__footer">
          <Link to="/" className="auth-brand__back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            На главную
          </Link>
          <span>© {new Date().getFullYear()} LawTech</span>
        </div>
      </aside>

      <section className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card__theme"><ThemeToggle /></div>

          <div className="auth-card__header">
            <h2 className="auth-card__title">
              {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
            </h2>
            <p className="auth-card__subtitle">
              {mode === 'login' ? 'Войдите в свой рабочий кабинет' : 'Зарегистрируйтесь за 30 секунд'}
            </p>
          </div>

          <Tabs
            activeKey={mode}
            onChange={(k) => setMode(k as 'register' | 'login')}
            centered
            className="auth-tabs"
            items={[
              { key: 'login', label: 'Вход' },
              { key: 'register', label: 'Регистрация' },
            ]}
          />

          {mode === 'login' ? (
            <Form key="login" form={form} layout="vertical" className="auth-form" onFinish={handleLoginSubmit}>
              <Form.Item
                label="Логин"
                name="login"
                rules={[{ required: true, message: 'Введите логин' }]}
              >
                <Input autoComplete="username" placeholder="Ваш логин" />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password autoComplete="current-password" placeholder="••••••••" />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit" block loading={loading} className="auth-submit">
                  Войти
                </Button>
              </Form.Item>

              <button type="button" className="auth-test-toggle" onClick={() => setShowTestAccounts((v) => !v)}>
                {showTestAccounts ? 'Скрыть тестовые аккаунты' : 'Тестовые аккаунты для демо'}
              </button>
              {showTestAccounts && (
                <div className="auth-test-panel">
                  {testAccounts.map((a) => (
                    <div key={a.email} className="auth-test-item" onClick={() => fillTestAccount(a)}>
                      <div className="auth-test-item__name">{a.name}</div>
                      <div className="auth-test-item__email">{a.email} · {a.password}</div>
                      <span className="auth-test-item__role">{a.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </Form>
          ) : (
            <Form key="register" form={form} layout="vertical" className="auth-form" onFinish={handleRegisterSubmit}>
              <Form.Item
                label="Ваше имя"
                name="name"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input placeholder="Как к вам обращаться" autoComplete="name" />
              </Form.Item>
              <Form.Item
                label="Электронная почта"
                name="email"
                rules={[{ required: true, message: 'Введите почту', type: 'email' }]}
              >
                <Input autoComplete="email" placeholder="you@example.com" />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }, { min: 6, message: 'Минимум 6 символов' }]}
              >
                <Input.Password autoComplete="new-password" placeholder="Минимум 6 символов" />
              </Form.Item>
              <Form.Item
                label="Тип пользователя"
                name="userType"
                rules={[{ required: true, message: 'Выберите тип' }]}
              >
                <Select
                  placeholder="Выберите, кто вы"
                  onChange={(v) => setUserType(v)}
                  options={[
                    { value: 'office', label: 'Юридический офис / фирма' },
                    { value: 'lawyer', label: 'Частный юрист' },
                    { value: 'manager', label: 'Менеджер' },
                    { value: 'okk', label: 'ОКК' },
                    { value: 'expert', label: 'Эксперт' },
                    { value: 'representative', label: 'Представитель' },
                    { value: 'admin', label: 'Администратор' },
                  ]}
                />
              </Form.Item>
              {userType === 'office' && (
                <Form.Item
                  label="Тип офиса"
                  name="officeType"
                  rules={[{ required: true, message: 'Выберите тип офиса' }]}
                >
                  <Select
                    placeholder="Новый или существующий"
                    onChange={(v) => setOfficeType(v)}
                    options={[
                      { value: 'new', label: 'Создать новый офис' },
                      { value: 'existing', label: 'Присоединиться к существующему' },
                    ]}
                  />
                </Form.Item>
              )}
              {userType === 'office' && officeType === 'new' && (
                <Form.Item
                  label="Название офиса"
                  name="officeName"
                  rules={[{ required: true, message: 'Введите название офиса' }]}
                >
                  <Input placeholder='Например, "Право и Партнёры"' />
                </Form.Item>
              )}
              {userType === 'office' && officeType === 'existing' && (
                <Form.Item
                  label="ID офиса"
                  name="officeId"
                  rules={[{ required: true, message: 'Введите ID офиса' }]}
                >
                  <Input placeholder="ID офиса" />
                </Form.Item>
              )}
              <Form.Item>
                <Button htmlType="submit" block loading={loading} className="auth-submit">
                  Создать аккаунт
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
