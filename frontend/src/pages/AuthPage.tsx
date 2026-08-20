import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '../shared/utils/apiUtils';
import './AuthPage.css';

interface LoginFormValues {
  login: string;
  password: string;
}

interface AccessRequestFormValues {
  full_name: string;
  email: string;
  phone: string;
}

const REMEMBER_KEY = 'rememberedLogin';


const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('login');
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

  const switchMode = (m: 'register' | 'login') => {
    setMode(m);
    setLoginError(false);
  };

  const handleAccessRequestSubmit = async (values: AccessRequestFormValues) => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/access-requests'), {
        method: 'POST',
        body: JSON.stringify({ ...values, consent: true, website: '' }),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Не удалось отправить заявку');
      message.success('Заявка отправлена. Мы свяжемся с вами в рабочее время', 6);
      form.resetFields();
      setMode('login');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Не удалось отправить заявку', 5);
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
                <>Запросить <em>доступ</em></>
              )}
            </h1>
            <div className="auth-rule" aria-hidden><span /></div>
            <p className="auth-subtitle">
              {mode === 'login' ? 'Войдите в свой рабочий кабинет' : 'Оставьте контакты, мы свяжемся с вами'}
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
                Нет доступа?<button type="button" onClick={() => switchMode('register')}>Оставить заявку</button>
              </div>
            </Form>
          ) : (
            <Form key="request" form={form} layout="vertical" onFinish={handleAccessRequestSubmit} requiredMark={false}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="request-name">ФИО</label>
                <Form.Item name="full_name" rules={[{ required: true, message: 'Введите ФИО' }, { min: 5, message: 'Укажите полное имя' }]} style={{ marginBottom: 0 }}>
                  <Input id="request-name" placeholder="Иванов Иван Иванович" autoComplete="name" autoFocus />
                </Form.Item>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="request-email">Электронная почта</label>
                <Form.Item name="email" rules={[{ required: true, message: 'Введите почту' }, { type: 'email', message: 'Проверьте адрес почты' }]} style={{ marginBottom: 0 }}>
                  <Input id="request-email" type="email" autoComplete="email" placeholder="you@example.com" />
                </Form.Item>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="request-phone">Номер телефона</label>
                <Form.Item name="phone" rules={[{ required: true, message: 'Введите телефон' }, { pattern: /^(?:\D*\d){10,15}\D*$/, message: 'Проверьте номер телефона' }]} style={{ marginBottom: 0 }}>
                  <Input id="request-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 999 000-00-00" />
                </Form.Item>
              </div>
              <p className="auth-request-note">Отправка заявки не создаёт аккаунт. Доступ подключает команда LawTech после согласования.</p>
              <Button htmlType="submit" block loading={loading} className="auth-submit" style={{ marginTop: 8 }}>
                Отправить заявку
              </Button>
              <div className="auth-switch">
                Уже есть доступ?<button type="button" onClick={() => switchMode('login')}>Войти</button>
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
