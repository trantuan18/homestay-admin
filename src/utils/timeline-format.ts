const viDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function toSafeDate(rawDate: any): Date {
  if (rawDate && typeof rawDate.toDate === 'function') {
    return rawDate.toDate();
  }
  return rawDate instanceof Date ? rawDate : new Date(rawDate);
}

export function formatMinorLabel(rawDate: any, scale: string): string {
  const d = toSafeDate(rawDate);
  if (scale === 'minute' || scale === 'hour') {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (scale === 'day') {
    return `${viDays[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  }
  if (scale === 'week') {
    return `T${Math.ceil(d.getDate() / 7)}`;
  }
  if (scale === 'month') {
    return `Th${d.getMonth() + 1}/${d.getFullYear()}`;
  }
  return String(d.getFullYear());
}

export function formatMajorLabel(rawDate: any, scale: string): string {
  const d = toSafeDate(rawDate);
  if (scale === 'minute') {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
  if (scale === 'hour') {
    return `${viDays[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
  }
  if (scale === 'day' || scale === 'week') {
    return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  }
  if (scale === 'month') {
    return String(d.getFullYear());
  }
  return '';
}
