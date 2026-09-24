/**
 * Persian language utilities: numbers, currency and date formatting
 */

// Convert English numbers to Persian digits (۰۱۲۳۴۵۶۷۸۹)
export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const str = n.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

// Format number as Iranian Toman currency
export function formatToman(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '۰ تومان';
  const formatted = amount.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

// Converts standard Gregorian ISO date to a friendly Jalali Shamsi date string
export function formatJalaliDate(isoDateStr: string | undefined | null): string {
  if (!isoDateStr) return '';
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return isoDateStr;

    // Use browser Intl with Persian calendar
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      calendar: 'persian',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const timeFormatter = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${formatter.format(date)} - ساعت ${timeFormatter.format(date)}`;
  } catch (err) {
    return isoDateStr;
  }
}

// Format short Jalali date (e.g. "۱۵ شهریور ۱۴۰۴")
export function formatShortJalali(isoDateStr: string | undefined | null): string {
  if (!isoDateStr) return '';
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return isoDateStr;
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      calendar: 'persian',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch (err) {
    return isoDateStr;
  }
}

// Format time only (e.g. "۱۹:۳۰")
export function formatTimeOnly(isoDateStr: string | undefined | null): string {
  if (!isoDateStr) return '';
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return '';
    const timeFormatter = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return timeFormatter.format(date);
  } catch (err) {
    return '';
  }
}
