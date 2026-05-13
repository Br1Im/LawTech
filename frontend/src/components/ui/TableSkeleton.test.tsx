import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';

describe('TableSkeleton', () => {
  it('renders default 6 rows × 5 cols including a header row', () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll('.skeleton-table__row');
    expect(rows.length).toBe(6 + 1);
    expect(
      container.querySelectorAll('.skeleton-table__row--head').length
    ).toBe(1);
  });

  it('respects rows/cols overrides and skips header when withHeader=false', () => {
    const { container } = render(
      <TableSkeleton rows={3} cols={4} withHeader={false} />
    );
    const rows = container.querySelectorAll('.skeleton-table__row');
    expect(rows.length).toBe(3);
    expect(
      container.querySelectorAll('.skeleton-table__row--head').length
    ).toBe(0);
    const firstRowCells = rows[0].querySelectorAll('.skeleton-table__cell');
    expect(firstRowCells.length).toBe(4);
  });

  it('exposes aria-busy and aria-live for screen readers', () => {
    const { getByRole } = render(<TableSkeleton />);
    const status = getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('renders a toolbar shimmer block when withToolbar=true', () => {
    const { container } = render(<TableSkeleton withToolbar />);
    expect(
      container.querySelectorAll('.skeleton-table__toolbar').length
    ).toBe(1);
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <EmptyState title="Нет данных" description="Пока ничего нет." />
    );
    expect(getByText('Нет данных')).toBeTruthy();
    expect(getByText('Пока ничего нет.')).toBeTruthy();
  });

  it('uses default title when none provided', () => {
    const { getByText } = render(<EmptyState />);
    expect(getByText('Пока пусто')).toBeTruthy();
  });

  it('renders custom action when provided', () => {
    const { getByText } = render(
      <EmptyState action={<button>Создать</button>} />
    );
    expect(getByText('Создать')).toBeTruthy();
  });
});
