import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '../shared/utils/apiUtils';
import './AuthPage.css';

interface LoginFormValues {
  login: string;
  password: string;
}

type UserType = 'lawyer' | 'office' | 'call_center' | 'manager' | 'okk' | 'expert' | 'admin' | 'representative';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  userType: UserType;
  officeType?: 'new' | 'existing' | '';
  officeId?: string;
  officeName?: string;
  callCenterName?: string;
  phone?: string;
}

const REMEMBER_KEY = 'rememberedLogin';

const USER_TYPES: { value: UserType; label: string }[] = [
  { value: 'office', label: 'Юридический офис' },
  { value: 'call_center', label: 'Колл-центр' },
  { value: 'lawyer', label: 'Частный юрист' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'okk', label: 'Руководитель' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'representative', label: 'Представитель' },
  { value: 'admin', label: 'Администратор' },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('login');
  const [userType, setUserType] = useState<UserType | ''>('');
  const [officeType, setOfficeType] = useState<'new' | 'existing' | ''>('');
  const [userTypeError, setUserTypeError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState(false);
  const [form] = Form.useForm();
  const [verifyStep, setVerifyStep] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Если уже авторизован - на CRM
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/crm', { replace: true });
  }, [navigate]);

  useEffect(() => {
    localStorage.removeItem('useAbsoluteUrls');
    const savedLogin = localStorage.getItem(REMEMBER_KEY);
    if (savedLogin) {
      form.setFieldsValue({ login: savedLogin });
      setRemember(true);
    }
  }, [form]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const persistSession = (data: { token: string; refreshToken?: string; user?: unknown }) => {
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  };

  const selectUserType = (v: UserType) => {
    setUserType(v);
    setUserTypeError(false);
    if (v !== 'office') setOfficeType('');
  };

  const switchMode = (m: 'register' | 'login') => {
    setMode(m);
    setLoginError(false);
    setUserTypeError(false);
  };

  const handleRegisterSubmit = async (raw: Omit<RegisterFormValues, 'userType' | 'officeType'>) => {
    if (!userType) {
      setUserTypeError(true);
      message.error('Выберите тип пользователя');
      return;
    }
    const values: RegisterFormValues = { ...raw, userType, officeType: officeType || '' };
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
      if (data.requiresVerification) {
        setVerifyEmail(data.email || values.email);
        setVerifyCode('');
        setVerifyStep(true);
        message.success('Мы отправили код подтверждения на ' + (data.email || values.email), 6);
        return;
      }
      persistSession(data);
      message.success('Регистрация выполнена. Добро пожаловать!');
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
    setLoginError(false);
    try {
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
      if (!response.ok) {
        let body: { error?: string; code?: string; email?: string } = {};
        try { body = await response.json(); } catch { /* noop */ }
        if (response.status === 403 && body.code === 'EMAIL_NOT_VERIFIED') {
          setVerifyEmail(body.email || values.login);
          setVerifyCode('');
          setVerifyStep(true);
          message.info('Подтвердите email - мы отправили код на вашу почту', 6);
          return;
        }
        setLoginError(true);
        if (response.status === 401) throw new Error('Неверный логин или пароль');
        if (response.status >= 500) throw new Error('Ошибка сервера. Попробуйте позже');
        throw new Error(body.error || `Ошибка: ${response.statusText}`);
      }
      const data = await response.json();
      persistSession(data);
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, values.login);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      message.success('Вход выполнен');
      if (data.user?.needs_office_setup) {
        navigate('/welcome');
      } else {
        navigate('/crm');
      }
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

  const handleVerifySubmit = async () => {
    if (verifyCode.trim().length < 6) {
      message.error('Введите 6-значный код из письма');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/auth/verify-code'), {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail, code: verifyCode.trim() }),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === 'ALREADY_VERIFIED') {
          message.info('Email уже подтверждён, войдите');
          setVerifyStep(false);
          setMode('login');
          return;
        }
        throw new Error(data.message || 'Неверный код подтверждения');
      }
      persistSession(data);
      message.success('Email подтверждён. Добро пожаловать!');
      if (data.user?.needs_office_setup || data.user?.role === 'director') {
        navigate('/welcome');
      } else {
        navigate('/crm');
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка подтверждения', 5);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await fetch(buildApiUrl('/auth/resend-verification'), {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail }),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
      message.success('Новый код отправлен');
      setResendCooldown(60);
    } catch {
      message.error('Не удалось отправить код');
    }
  };

  return (
    <div className="auth-shell">
      {/* фирменные гравюры лендинга */}
      <div className="auth-illus left" aria-hidden>
        <img src={mode === 'register' ? '/auth-media/reg-left.jpg' : '/auth-media/illus-left.jpg'} alt="" width={768} height={1376} decoding="async" />
      </div>
      <div className="auth-illus right" aria-hidden>
        <img src={mode === 'register' ? '/auth-media/reg-right.jpg' : '/auth-media/illus-right.jpg'} alt="" width={768} height={1376} decoding="async" />
      </div>

      <div className="auth-top">
        <Link to="/" className="auth-logo" aria-label="На главную">
          LAW.TECH<small>JURIDICAL CRM</small>
        </Link>
      </div>

      <div className="auth-center">
        {!verifyStep && (
          <>
            <div className="auth-eyebrow">CRM для юридических компаний</div>
            <h1 className="auth-title">
              {mode === 'login' ? (
                <>С <em>возвращением</em></>
              ) : (
                <>Создать <em>аккаунт</em></>
              )}
            </h1>
            <div className="auth-rule" aria-hidden><span /></div>
            <p className="auth-subtitle">
              {mode === 'login' ? 'Войдите в свой рабочий кабинет' : 'Присоединяйтесь к LawTech'}
            </p>
          </>
        )}

        <div className="auth-card">
          {verifyStep ? (
            <div key="verify">
              <h1 className="auth-title" style={{ fontSize: 30, marginTop: 0, textAlign: 'center' }}>Подтвердите <em>email</em></h1>
              <p className="auth-subtitle" style={{ textAlign: 'center', fontSize: 15, marginBottom: 18 }}>
                Мы отправили 6-значный код на <b>{verifyEmail}</b>
              </p>
              <div className="auth-verify-code">
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onPressEnter={handleVerifySubmit}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <Button block loading={loading} className="auth-submit" style={{ marginTop: 18 }} onClick={handleVerifySubmit}>
                Подтвердить email
              </Button>
              <div className="auth-verify-actions">
                <button type="button" onClick={() => { setVerifyStep(false); setMode('login'); }}>← Назад ко входу</button>
                <button type="button" disabled={resendCooldown > 0} onClick={handleResend}>
                  {resendCooldown > 0 ? `Отправить снова (${resendCooldown})` : 'Отправить код снова'}
                </button>
              </div>
            </div>
          ) : mode === 'login' ? (
            <Form key="login" form={form} layout="vertical" onFinish={handleLoginSubmit} requiredMark={false}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login">Логин</label>
                <Form.Item name="login" rules={[{ required: true, message: 'Введите логин' }]} style={{ marginBottom: 0 }}>
                  <Input
                    id="login"
                    autoComplete="username"
                    placeholder="Введите логин"
                    autoFocus
                    status={loginError ? 'error' : ''}
                    onChange={() => loginError && setLoginError(false)}
                  />
                </Form.Item>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="password">Пароль</label>
                <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]} style={{ marginBottom: 0 }}>
                  <Input.Password
                    id="password"
                    autoComplete="current-password"
                    placeholder="Введите пароль"
                    status={loginError ? 'error' : ''}
                    onChange={() => loginError && setLoginError(false)}
                  />
                </Form.Item>
              </div>

              <div className="auth-row">
                <label className="auth-remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Запомнить меня
                </label>
                <button type="button" className="auth-forgot" onClick={() => message.info('Для сброса пароля обратитесь к руководителю или администратору вашего офиса', 6)}>
                  Забыли пароль?
                </button>
              </div>

              <Button htmlType="submit" block loading={loading} className="auth-submit">Войти</Button>

              <div className="auth-switch">
                Нет аккаунта?<button type="button" onClick={() => switchMode('register')}>Создать</button>
              </div>
            </Form>
          ) : (
            <Form key="register" form={form} layout="vertical" onFinish={handleRegisterSubmit} requiredMark={false}>
              <div className="auth-field">
                <label className="auth-label">{userType === 'call_center' ? 'ФИО начальника' : 'Ваше имя'}</label>
                <Form.Item name="name" rules={[{ required: true, message: 'Введите имя' }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="Как к вам обращаться" autoComplete="name" autoFocus />
                </Form.Item>
              </div>
              <div className="auth-field">
                <label className="auth-label">Электронная почта</label>
                <Form.Item name="email" rules={[{ required: true, message: 'Введите почту', type: 'email' }]} style={{ marginBottom: 0 }}>
                  <Input autoComplete="email" placeholder="you@example.com" />
                </Form.Item>
              </div>
              <div className="auth-field">
                <label className="auth-label">Пароль</label>
                <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }, { min: 6, message: 'Минимум 6 символов' }]} style={{ marginBottom: 0 }}>
                  <Input.Password autoComplete="new-password" placeholder="Минимум 6 символов" />
                </Form.Item>
              </div>

              {userType === 'call_center' && (
                <>
                  <div className="auth-field">
                    <label className="auth-label">Название колл-центра</label>
                    <Form.Item name="callCenterName" rules={[{ required: true, message: 'Введите название колл-центра' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Например, Контакт-центр Право" />
                    </Form.Item>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Телефон</label>
                    <Form.Item name="phone" rules={[{ required: true, message: 'Введите телефон' }]} style={{ marginBottom: 0 }}>
                      <Input autoComplete="tel" placeholder="+7 999 000-00-00" />
                    </Form.Item>
                  </div>
                </>
              )}

              <div className="auth-field">
                <label className="auth-label">Тип пользователя</label>
                <div className={`auth-pills${userTypeError ? ' has-error' : ''}`}>
                  {USER_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      className={`auth-pill${userType === t.value ? ' active' : ''}`}
                      onClick={() => selectUserType(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {userTypeError && <div className="auth-pill-error">Выберите тип пользователя</div>}
              </div>

              {userType === 'office' && (
                <div className="auth-field">
                  <label className="auth-label">Тип офиса</label>
                  <div className="auth-pills">
                    <button type="button" className={`auth-pill${officeType === 'new' ? ' active' : ''}`} onClick={() => setOfficeType('new')}>Создать новый</button>
                    <button type="button" className={`auth-pill${officeType === 'existing' ? ' active' : ''}`} onClick={() => setOfficeType('existing')}>Присоединиться</button>
                  </div>
                </div>
              )}
              {userType === 'office' && officeType === 'new' && (
                <div className="auth-field">
                  <label className="auth-label">Название офиса</label>
                  <Form.Item name="officeName" rules={[{ required: true, message: 'Введите название офиса' }]} style={{ marginBottom: 0 }}>
                    <Input placeholder='Например, "Право и Партнёры"' />
                  </Form.Item>
                </div>
              )}
              {userType === 'office' && officeType === 'existing' && (
                <div className="auth-field">
                  <label className="auth-label">ID офиса</label>
                  <Form.Item name="officeId" rules={[{ required: true, message: 'Введите ID офиса' }]} style={{ marginBottom: 0 }}>
                    <Input placeholder="ID офиса" />
                  </Form.Item>
                </div>
              )}
              <Button htmlType="submit" block loading={loading} className="auth-submit" style={{ marginTop: 8 }}>
                Создать аккаунт
              </Button>
              <div className="auth-switch">
                Уже есть аккаунт?<button type="button" onClick={() => switchMode('login')}>Войти</button>
              </div>
            </Form>
          )}
        </div>
      </div>

      {!verifyStep && (
        <div className="auth-foot">
          <div className="safe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Ваши данные под защитой
          </div>
          <div className="safe-sub">Мы используем современные технологии для обеспечения безопасности вашей информации.</div>
          <div className="brand-bottom">LawTech</div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
