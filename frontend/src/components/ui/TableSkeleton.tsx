import React from 'react';
import './TableSkeleton.css';

/**
 * Skeleton placeholder for a data table while it's loading.
 * Renders shimmering bars in a grid shape (rows × cols), so the user
 * sees the future content layout, not an opaque spinner.
 *
 * Works for both Antd-Table tables and plain HTML <table> sections.
 * Drop in like:
 *   {loading ? <TableSkeleton rows={6} cols={5} /> : <Table ... />}
 */
type Props = {
  rows?: number;
  cols?: number;
  /** Show a header row of slightly darker bars at the top. */
  withHeader?: boolean;
  /** Show a faint "tool row" (search/buttons) above the header. */
  withToolbar?: boolean;
  /** Optional className for outer wrapper. */
  className?: string;
};

const TableSkeleton: React.FC<Props> = ({
  rows = 6,
  cols = 5,
  withHeader = true,
  withToolbar = false,
  className,
}) => {
  return (
    <div
      className={['skeleton-table', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Загрузка данных"
    >
      {withToolbar && (
        <div className="skeleton-table__toolbar">
          <span className="skeleton-shimmer skeleton-table__toolbar-search" />
          <span className="skeleton-shimmer skeleton-table__toolbar-btn" />
          <span className="skeleton-shimmer skeleton-table__toolbar-btn" />
        </div>
      )}

      <div
        className="skeleton-table__grid"
        style={{ ['--cols' as string]: String(cols) }}
      >
        {withHeader && (
          <div className="skeleton-table__row skeleton-table__row--head">
            {Array.from({ length: cols }).map((_, i) => (
              <span
                key={`h-${i}`}
                className="skeleton-shimmer skeleton-table__cell skeleton-table__cell--head"
              />
            ))}
          </div>
        )}

        {Array.from({ length: rows }).map((_, r) => (
          <div className="skeleton-table__row" key={`r-${r}`}>
            {Array.from({ length: cols }).map((_, c) => (
              <span
                key={`c-${r}-${c}`}
                className="skeleton-shimmer skeleton-table__cell"
                style={{ ['--bar-w' as string]: `${60 + ((r + c) % 4) * 10}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
