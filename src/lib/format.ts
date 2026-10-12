import type { Lang } from './i18n';

export type Precision = 'exact' | 'month' | 'year' | 'approximate' | 'uncertain';
export type Calendar = 'gregory' | 'persian';

function parts(date: string): { y: number; m?: number; d?: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

/**
 * Format a date for display.
 *
 * Dates are stored as Gregorian strings. With calendar "persian" (Persian
 * pages only) a full day date is converted by Intl, e.g. 1948-03-12 →
 * «۲۱ اسفند ۱۳۲۶». Month- and year-only dates are NOT converted, because one
 * Gregorian month/year spans two Persian ones; they stay Gregorian.
 */
export function formatDate(
  date: string,
  precision: Precision = 'exact',
  lang: Lang = 'fa',
  calendar: Calendar = 'gregory',
): string {
  const { y, m, d } = parts(date);
  const persian = lang === 'fa' && calendar === 'persian' && Boolean(m && d);
  const locale = lang === 'fa' ? `fa-IR-u-ca-${persian ? 'persian' : 'gregory'}` : 'en-GB';
  let opts: Intl.DateTimeFormatOptions;
  let value: Date;
  if (m && d) {
    opts = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    value = new Date(Date.UTC(y, m - 1, d));
  } else if (m) {
    opts = { year: 'numeric', month: 'long', timeZone: 'UTC' };
    value = new Date(Date.UTC(y, m - 1, 1));
  } else {
    opts = { year: 'numeric', timeZone: 'UTC' };
    value = new Date(Date.UTC(y, 0, 1));
  }
  const text = new Intl.DateTimeFormat(locale, opts).format(value);
  if (precision === 'approximate') return lang === 'fa' ? `حدود ${text}` : `c. ${text}`;
  if (precision === 'uncertain') return lang === 'fa' ? `${text} (نیازمند تأیید)` : `${text} (to be verified)`;
  return text;
}

/** Year(s) for the hero: Persian year first (with Gregorian beside it) when the calendar is Persian and the date is a full day. */
export function lifeYear(date: string, lang: Lang = 'fa', calendar: Calendar = 'gregory'): { primary: string; secondary?: string } {
  const { y, m, d } = parts(date);
  const gregorian = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-GB', { useGrouping: false }).format(y);
  if (lang === 'fa' && calendar === 'persian' && m && d) {
    const persian = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(y, m - 1, d)),
    );
    return { primary: persian, secondary: gregorian };
  }
  return { primary: gregorian };
}

/** Exact-ish dates get a solid marker, approximate ones a hollow marker. */
export function isExact(precision: Precision): boolean {
  return precision === 'exact' || precision === 'month' || precision === 'year';
}
