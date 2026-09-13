import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';

/**
 * Standardized TimeInput component for QafGo Platform.
 * Displays times formatted as 'HH:SS' / 'HH:MM' (24-hour format).
 * Provides smart auto-masking on manual typing and integrates a native time picker.
 * Emits standard 'HH:mm' (or 'HH:mm:ss') to parent onChange handlers.
 */
export default function TimeInput({
  value = '',
  onChange,
  placeholder = 'HH:SS',
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  name,
  id,
  min,
  max,
  step,
  hideIcon = false,
  autoFocus = false,
  ...rest
}) {
  const nativeInputRef = useRef(null);

  // Convert incoming value to HH:mm
  const formatToDisplay = (val) => {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      return DateTimeFormatter.formatTime(val);
    }
    const str = String(val).trim();
    if (!str) return '';

    // Match HH:mm:ss or HH:mm
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      const parts = str.split(':');
      const hh = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      return `${hh}:${mm}`;
    }

    const parsed = DateTimeFormatter.toDate(str);
    if (parsed) {
      return DateTimeFormatter.formatTime(parsed);
    }

    return str;
  };

  const [displayValue, setDisplayValue] = useState(() => formatToDisplay(value));
  const [timeValue, setTimeValue] = useState(() => formatToDisplay(value));

  useEffect(() => {
    const nextDisplay = formatToDisplay(value);
    setDisplayValue(nextDisplay);
    setTimeValue(nextDisplay);
  }, [value]);

  const emitChange = (newTime) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id || '',
          value: newTime,
        },
      };
      onChange(syntheticEvent);
    }
  };

  // Smart input masking for typing digits (e.g. typing "1430" automatically becomes "14:30")
  const handleInputChange = (e) => {
    const inputVal = e.target.value;

    if (!inputVal) {
      setDisplayValue('');
      setTimeValue('');
      emitChange('');
      return;
    }

    // Keep only numbers and colon
    let cleaned = inputVal.replace(/[^\d:]/g, '');

    const digitsOnly = cleaned.replace(/\D/g, '');
    let formatted = '';
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.substring(0, 2);
      if (digitsOnly.length >= 3) {
        formatted += ':' + digitsOnly.substring(2, 4);
      }
    }

    setDisplayValue(formatted);

    // If fully formatted HH:mm
    if (formatted.length === 5) {
      const [hh, mm] = formatted.split(':').map(Number);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        setTimeValue(formatted);
        emitChange(formatted);
      }
    }
  };

  const handleBlur = () => {
    if (!displayValue) {
      setTimeValue('');
      emitChange('');
      return;
    }

    // Handle single digit hour or minute e.g. "8:30" -> "08:30"
    const parts = displayValue.split(':');
    if (parts.length === 2) {
      let [h, m] = parts;
      if (h.length === 1) h = '0' + h;
      if (m.length === 1) m = '0' + m;
      if (h.length === 2 && m.length === 2) {
        const hh = Number(h);
        const mm = Number(m);
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
          const normalized = `${h}:${m}`;
          setDisplayValue(normalized);
          setTimeValue(normalized);
          emitChange(normalized);
          return;
        }
      }
    }

    // If invalid format on blur, revert to valid timeValue if available, or clear
    if (!/^\d{2}:\d{2}$/.test(displayValue)) {
      if (timeValue) {
        setDisplayValue(timeValue);
      } else {
        setDisplayValue('');
        emitChange('');
      }
    }
  };

  const openPicker = () => {
    if (disabled) return;
    if (nativeInputRef.current) {
      try {
        if (typeof nativeInputRef.current.showPicker === 'function') {
          nativeInputRef.current.showPicker();
        } else {
          nativeInputRef.current.focus();
        }
      } catch (err) {
        nativeInputRef.current.focus();
      }
    }
  };

  const handleNativeChange = (e) => {
    const val = e.target.value; // 'HH:mm'
    const formatted = formatToDisplay(val);
    setTimeValue(formatted);
    setDisplayValue(formatted);
    emitChange(formatted);
  };

  return (
    <div
      className={`relative inline-flex items-center group ${
        className.includes('w-full') ? 'w-full' : ''
      } ${className.includes('flex-1') ? 'flex-1' : ''} ${containerClassName}`}
    >
      <input
        type="text"
        dir="ltr"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        name={name}
        id={id}
        autoFocus={autoFocus}
        className={`font-mono text-center tracking-wider focus:outline-none transition-all ${className}`}
        {...rest}
      />

      {!hideIcon && (
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          disabled={disabled}
          title="Open time picker"
          className="absolute end-2 p-1 text-text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Hidden native time input to trigger system time picker */}
      <input
        type="time"
        ref={nativeInputRef}
        value={timeValue}
        min={min}
        max={max}
        step={step}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleNativeChange}
        disabled={disabled}
        className="sr-only absolute pointer-events-none opacity-0 -z-10 w-0 h-0"
      />
    </div>
  );
}
