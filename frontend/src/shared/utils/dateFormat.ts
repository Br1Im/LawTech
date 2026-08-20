const monthLong = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

function safeDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRuDate(value?: string | Date | null, compact = false): string {
  const date = safeDate(value);
  if (!date) return '—';
  return (compact ? monthShort : monthLong).format(date).replace(/\s?г\.$/, '');
}

export function formatRuDateRange(from?: string | Date | null, to?: string | Date | null): string {
  const start = safeDate(from); const end = safeDate(to);
  if (!start || !end) return 'Период не выбран';
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) return `${start.getDate()}–${end.getDate()} ${new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(end).replace(/\s?г\.$/,'')}`;
  if (sameYear) return `${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(start)} – ${formatRuDate(end)}`;
  return `${formatRuDate(start)} – ${formatRuDate(end)}`;
}
