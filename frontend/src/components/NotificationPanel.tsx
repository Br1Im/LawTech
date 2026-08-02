import React from 'react';
import { BellOutlined, CloseOutlined, CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined, SoundOutlined, SoundFilled } from '@ant-design/icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  soundEnabled = true,
  onToggleSound
}) => {
  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: 'var(--color-warning)' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: 'var(--color-error)' }} />;
      default:
        return <InfoCircleOutlined style={{ color: 'var(--color-accent)' }} />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  };

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: window.innerWidth <= 768 ? 'rgba(0, 0, 0, 0.45)' : 'transparent',
      zIndex: 1500,
      display: 'flex',
      justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-end',
      alignItems: window.innerWidth <= 768 ? 'flex-start' : 'flex-start',
      paddingTop: window.innerWidth <= 768 ? '70px' : '70px',
      paddingRight: window.innerWidth <= 768 ? '0' : '24px',
      paddingBottom: '0',
      pointerEvents: 'none',
    } satisfies React.CSSProperties,
    panel: {
      width: window.innerWidth <= 768 ? '100%' : 'min(400px, calc(100vw - 24px))',
      maxWidth: window.innerWidth <= 768 ? '100vw' : '400px',
      maxHeight: window.innerWidth <= 768 ? 'calc(100vh - 70px)' : '80vh',
      backgroundColor: 'var(--color-bg)',
      borderRadius: window.innerWidth <= 768 ? '0 0 16px 16px' : '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
      pointerEvents: 'auto',
      animation: window.innerWidth <= 768 ? 'slideDown 0.3s ease-out' : 'slideIn 0.3s ease-out',
    } satisfies React.CSSProperties,
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'var(--color-bg-alt)',
    } satisfies React.CSSProperties,
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-text)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } satisfies React.CSSProperties,
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      color: 'var(--color-muted)',
      transition: 'all 0.2s ease',
    } satisfies React.CSSProperties,
    content: {
      maxHeight: 'calc(80vh - 120px)',
      overflowY: 'auto' as const,
    } satisfies React.CSSProperties,
    emptyState: {
      padding: '40px 20px',
      textAlign: 'center' as const,
      color: 'var(--color-muted)',
    } satisfies React.CSSProperties,
    notificationItem: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--color-border)',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    } satisfies React.CSSProperties,
    notificationHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
    } satisfies React.CSSProperties,
    notificationTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--color-text)',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } satisfies React.CSSProperties,
    notificationTime: {
      fontSize: '12px',
      color: 'var(--color-muted)',
    } satisfies React.CSSProperties,
    notificationMessage: {
      fontSize: '13px',
      color: 'var(--color-text-secondary)',
      lineHeight: '1.4',
      margin: 0,
    } satisfies React.CSSProperties,
    unreadDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: 'var(--color-accent)',
      marginLeft: '8px',
    } satisfies React.CSSProperties,
    footer: {
      padding: '12px 20px',
      borderTop: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-alt)',
    } satisfies React.CSSProperties,
    markAllButton: {
      background: 'none',
      border: 'none',
      color: 'var(--color-accent)',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'all 0.2s ease',
    } satisfies React.CSSProperties,
  };

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h3 style={styles.title}>
              <BellOutlined />
              Уведомления
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  marginLeft: '8px'
                }}>
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </h3>
            {onToggleSound && (
              <button
                aria-label="???? ???????????"
                title={soundEnabled ? '????????? ???? ???????????' : '???????? ???? ???????????'}
                style={{ ...styles.closeButton, marginLeft: 'auto', marginRight: '8px' }}
                onClick={onToggleSound}
              >
                {soundEnabled ? <SoundFilled /> : <SoundOutlined />}
              </button>
            )}
            <button
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-muted)';
              }}
            >
              <CloseOutlined />
            </button>
          </div>
          
          <div style={styles.content}>
            {notifications.length === 0 ? (
              <div style={styles.emptyState}>
                <BellOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
                <p>Нет уведомлений</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationItem,
                    backgroundColor: notification.read ? 'transparent' : 'var(--color-bg-alt)',
                  }}
                  onClick={() => onMarkAsRead(notification.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : 'var(--color-bg-alt)';
                  }}
                >
                  <div style={styles.notificationHeader}>
                    <h4 style={styles.notificationTitle}>
                      {getNotificationIcon(notification.type)}
                      {notification.title}
                      {!notification.read && <div style={styles.unreadDot} />}
                    </h4>
                    <span style={styles.notificationTime}>
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p style={styles.notificationMessage}>
                    {notification.message}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && notifications.some(n => !n.read) && (
            <div style={styles.footer}>
              <button
                style={styles.markAllButton}
                onClick={onMarkAllAsRead}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Отметить все как прочитанные
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;