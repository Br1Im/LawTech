import React from 'react';
import { InboxOutlined } from '@ant-design/icons';
import './EmptyState.css';

/**
 * Pleasant empty-state with a soft circular icon, primary title, and a hint.
 * Replaces the default Antd <Empty> when the section is genuinely empty
 * (not loading). Renders ~140-180px tall so users immediately see "пусто"
 * rather than wondering if it's still loading.
 */
type Props = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

const EmptyState: React.FC<Props> = ({
  title = 'Пока пусто',
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={['empty-state', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="empty-state__icon" aria-hidden="true">
        {icon ?? <InboxOutlined />}
      </div>
      <div className="empty-state__title">{title}</div>
      {description && (
        <div className="empty-state__description">{description}</div>
      )}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
};

export default EmptyState;
