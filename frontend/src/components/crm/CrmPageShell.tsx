import React from 'react';
import styled from '@emotion/styled';

interface StatCardData {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
}

interface CrmPageShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  stats?: StatCardData[];
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 0 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-text);
  }
  span {
    color: var(--color-muted);
    font-size: 13.5px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
`;

const StatCard = styled.div`
  padding: 18px 20px;
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 48px rgba(15,23,42,0.12);
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-muted);
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .value {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.01em;
  }
  .sub {
    font-size: 12px;
    color: var(--color-muted);
  }
  .icon svg { color: var(--color-accent); }
`;

export const TableCard = styled.div`
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 8px 8px 4px;
  overflow: hidden;

  .ant-table-wrapper { background: transparent; }
  .ant-table { background: transparent; }
  .ant-table-thead > tr > th {
    background: transparent !important;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }
  .ant-table-tbody > tr > td { background: transparent !important; }
  .ant-table-tbody > tr:hover > td { background: rgba(192,155,70,0.06) !important; }
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const CrmPageShell: React.FC<CrmPageShellProps> = ({
  title,
  subtitle,
  actions,
  stats,
  toolbar,
  children,
}) => {
  return (
    <Page>
      <Header>
        <HeaderLeft>
          <h2>{title}</h2>
          {subtitle && <span>{subtitle}</span>}
        </HeaderLeft>
        {actions && <Actions>{actions}</Actions>}
      </Header>

      {stats && stats.length > 0 && (
        <StatsGrid>
          {stats.map((s, i) => (
            <StatCard key={i}>
              <div className="label icon">
                {s.icon}
                <span>{s.label}</span>
              </div>
              <div className="value">{s.value}</div>
              {s.sub && <div className="sub">{s.sub}</div>}
            </StatCard>
          ))}
        </StatsGrid>
      )}

      {toolbar}

      {children}
    </Page>
  );
};

export default CrmPageShell;
