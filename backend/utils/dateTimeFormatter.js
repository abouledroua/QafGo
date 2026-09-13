/**
 * DateTimeFormatter (Backend)
 * 
 * Standardized Date and Time formatting class for QafGo Platform.
 * Enforces 'JJ/MM/AAAA' (DD/MM/YYYY) for all dates and 'HH:SS' for all times.
 */

export class DateTimeFormatter {
  static DATE_FORMAT = 'JJ/MM/AAAA';
  static TIME_FORMAT = 'HH:SS';

  constructor(options = {}) {
    this.dateFormat = options.dateFormat || DateTimeFormatter.DATE_FORMAT;
    this.timeFormat = options.timeFormat || DateTimeFormatter.TIME_FORMAT;
    this.fallback = options.fallback || '-';
  }

  static toDate(input) {
    if (!input) return null;
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    if (typeof input === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input.trim())) {
      const [day, month, year] = input.trim().split('/').map(Number);
      const parsed = new Date(year, month - 1, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  static pad(n, width = 2) {
    return String(n).padStart(width, '0');
  }

  static formatDate(date, fallback = '-') {
    const d = this.toDate(date);
    if (!d) return fallback;

    const jj = this.pad(d.getDate());
    const mm = this.pad(d.getMonth() + 1);
    const aaaa = d.getFullYear();

    return `${jj}/${mm}/${aaaa}`;
  }

  static formatTime(date, options = {}) {
    const withSeconds = typeof options === 'boolean' ? options : !!options.withSeconds;
    const fallback = (typeof options === 'object' && options.fallback) || '-';

    const d = this.toDate(date);
    if (!d) return fallback;

    const hh = this.pad(d.getHours());
    const mm = this.pad(d.getMinutes());
    const ss = this.pad(d.getSeconds());

    if (withSeconds) {
      return `${hh}:${mm}:${ss}`;
    }
    return `${hh}:${mm}`;
  }

  static formatDateTime(date, options = {}) {
    const d = this.toDate(date);
    const fallback = options.fallback || '-';
    if (!d) return fallback;

    const separator = options.separator !== undefined ? options.separator : ' ';
    const formattedDate = this.formatDate(d, fallback);
    const formattedTime = this.formatTime(d, options);

    return `${formattedDate}${separator}${formattedTime}`;
  }

  static toInputDate(date = new Date()) {
    const d = this.toDate(date);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = this.pad(d.getMonth() + 1);
    const dd = this.pad(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  static toInputTime(date = new Date()) {
    const d = this.toDate(date);
    if (!d) return '';
    const hh = this.pad(d.getHours());
    const mm = this.pad(d.getMinutes());
    return `${hh}:${mm}`;
  }

  static isValid(val) {
    return this.toDate(val) !== null;
  }

  static parse(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (match) {
      const [, day, month, year, hours, minutes, seconds] = match;
      const d = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours || 0),
        Number(minutes || 0),
        Number(seconds || 0)
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  static getConsecutiveMonths(startMonthRef, count = 1) {
    if (!startMonthRef) return [];
    const parts = String(startMonthRef).trim().split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return [startMonthRef];

    const safeCount = Math.max(1, parseInt(count, 10) || 1);
    const months = [];
    for (let i = 0; i < safeCount; i++) {
      months.push(`${year}-${this.pad(month)}`);
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    return months;
  }

  formatDate(date) {
    return DateTimeFormatter.formatDate(date, this.fallback);
  }

  formatTime(date, options = {}) {
    return DateTimeFormatter.formatTime(date, { fallback: this.fallback, ...options });
  }

  formatDateTime(date, options = {}) {
    return DateTimeFormatter.formatDateTime(date, { fallback: this.fallback, ...options });
  }
}

export const formatDate = (date, fallback) => DateTimeFormatter.formatDate(date, fallback);
export const formatTime = (date, options) => DateTimeFormatter.formatTime(date, options);
export const formatDateTime = (date, options) => DateTimeFormatter.formatDateTime(date, options);
export const getConsecutiveMonths = (startMonthRef, count) => DateTimeFormatter.getConsecutiveMonths(startMonthRef, count);

export default DateTimeFormatter;
