/**
 * DateTimeFormatter
 * 
 * Standardized Date and Time formatting class for QafGo Platform.
 * Enforces 'JJ/MM/AAAA' (DD/MM/YYYY) for all dates and 'HH:SS' (or HH:MM) for all times.
 * Handles Date objects, ISO strings, timestamps, and null/undefined gracefully.
 */

export class DateTimeFormatter {
  /**
   * Default formats
   */
  static DATE_FORMAT = 'JJ/MM/AAAA';
  static TIME_FORMAT = 'HH:SS';

  constructor(options = {}) {
    this.dateFormat = options.dateFormat || DateTimeFormatter.DATE_FORMAT;
    this.timeFormat = options.timeFormat || DateTimeFormatter.TIME_FORMAT;
    this.fallback = options.fallback || '-';
  }

  /**
   * Safely coerce any valid date input into a native Date object.
   * @param {Date|string|number} input 
   * @returns {Date|null}
   */
  static toDate(input) {
    if (!input) return null;
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    if (typeof input === 'string') {
      const trimmed = input.trim();
      // Check if input is already formatted as JJ/MM/AAAA or DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const [day, month, year] = trimmed.split('/').map(Number);
        const parsed = new Date(year, month - 1, day);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      // Handle time-only strings like "14:30" or "14:30:00"
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
        const parts = trimmed.split(':').map(Number);
        const d = new Date();
        d.setHours(parts[0], parts[1], parts[2] || 0, 0);
        return d;
      }

      // Handle SQL datetime strings like "2026-09-13 18:30:00"
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed)) {
        const d = new Date(trimmed.replace(' ', 'T'));
        return isNaN(d.getTime()) ? null : d;
      }
    }

    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Pad number with leading zero.
   * @param {number} n 
   * @param {number} width 
   * @returns {string}
   */
  static pad(n, width = 2) {
    return String(n).padStart(width, '0');
  }

  /**
   * Format a date into 'JJ/MM/AAAA' (Day/Month/Year).
   * Example: 2026-09-09 -> '09/09/2026'
   * 
   * @param {Date|string|number} date 
   * @param {string} fallback 
   * @returns {string}
   */
  static formatDate(date, fallback = '-') {
    const d = this.toDate(date);
    if (!d) return fallback;

    const jj = this.pad(d.getDate());
    const mm = this.pad(d.getMonth() + 1);
    const aaaa = d.getFullYear();

    return `${jj}/${mm}/${aaaa}`;
  }

  /**
   * Format a time into 'HH:SS' (Hours and Minutes / Seconds).
   * Example: 14:05:30 -> '14:05' or '14:05:30' if withSeconds is true.
   * 
   * @param {Date|string|number} date 
   * @param {Object|boolean} options - { withSeconds?: boolean, fallback?: string }
   * @returns {string}
   */
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

  /**
   * Format date and time together: 'JJ/MM/AAAA HH:SS'
   * Example: '09/09/2026 14:05'
   * 
   * @param {Date|string|number} date 
   * @param {Object} options - { separator?: string, withSeconds?: boolean, fallback?: string }
   * @returns {string}
   */
  static formatDateTime(date, options = {}) {
    const d = this.toDate(date);
    const fallback = options.fallback || '-';
    if (!d) return fallback;

    const separator = options.separator !== undefined ? options.separator : ' ';
    const formattedDate = this.formatDate(d, fallback);
    const formattedTime = this.formatTime(d, options);

    return `${formattedDate}${separator}${formattedTime}`;
  }

  /**
   * Convert date to standard HTML date input format ('YYYY-MM-DD').
   * @param {Date|string|number} date 
   * @returns {string}
   */
  static toInputDate(date = new Date()) {
    const d = this.toDate(date);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = this.pad(d.getMonth() + 1);
    const dd = this.pad(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Convert date to standard HTML time input format ('HH:MM').
   * @param {Date|string|number} date 
   * @returns {string}
   */
  static toInputTime(date = new Date()) {
    const d = this.toDate(date);
    if (!d) return '';
    const hh = this.pad(d.getHours());
    const mm = this.pad(d.getMinutes());
    return `${hh}:${mm}`;
  }

  /**
   * Check if a given value is a valid date.
   * @param {any} val 
   * @returns {boolean}
   */
  static isValid(val) {
    return this.toDate(val) !== null;
  }

  /**
   * Parse 'JJ/MM/AAAA' or 'JJ/MM/AAAA HH:SS' into a native Date object.
   * @param {string} str 
   * @returns {Date|null}
   */
  static parse(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    
    // Match 'JJ/MM/AAAA HH:MM:SS' or 'JJ/MM/AAAA HH:MM' or 'JJ/MM/AAAA'
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

  /**
   * Generates an array of sequential 'YYYY-MM' strings starting from startMonthRef.
   * Handles year boundary transitions seamlessly.
   * @param {string} startMonthRef e.g. '2026-09'
   * @param {number} count e.g. 3
   * @returns {string[]} e.g. ['2026-09', '2026-10', '2026-11']
   */
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

  // --- Instance methods (utilizing configured options) ---

  formatDate(date) {
    return DateTimeFormatter.formatDate(date, this.fallback);
  }

  formatTime(date, options = {}) {
    return DateTimeFormatter.formatTime(date, { fallback: this.fallback, ...options });
  }

  formatDateTime(date, options = {}) {
    return DateTimeFormatter.formatDateTime(date, { fallback: this.fallback, ...options });
  }

  toInputDate(date) {
    return DateTimeFormatter.toInputDate(date);
  }

  toInputTime(date) {
    return DateTimeFormatter.toInputTime(date);
  }
}

// Singleton default instance
export const defaultDateTimeFormatter = new DateTimeFormatter();

// Top-level exported helper functions for rapid consumption
export const formatDate = (date, fallback) => DateTimeFormatter.formatDate(date, fallback);
export const formatTime = (date, options) => DateTimeFormatter.formatTime(date, options);
export const formatDateTime = (date, options) => DateTimeFormatter.formatDateTime(date, options);
export const toInputDate = (date) => DateTimeFormatter.toInputDate(date);
export const toInputTime = (date) => DateTimeFormatter.toInputTime(date);
export const getConsecutiveMonths = (startMonthRef, count) => DateTimeFormatter.getConsecutiveMonths(startMonthRef, count);

export default DateTimeFormatter;
