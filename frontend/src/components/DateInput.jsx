import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';

/**
 * Standardized DateInput component for QafGo Platform.
 * Displays dates formatted as 'JJ/MM/AAAA' (DD/MM/YYYY).
 * Provides smart auto-masking on manual typing and integrates a native calendar picker.
 * Emits standard 'YYYY-MM-DD' to parent onChange handlers to preserve full backward compatibility.
 */
export default function DateInput({
  value = '',
  onChange,
  placeholder = 'JJ/MM/AAAA',
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  name,
  id,
  min,
  max,
  hideIcon = false,
  autoFocus = false,
  ...rest
}) {
  const nativeInputRef = useRef(null);

  // Convert incoming value (YYYY-MM-DD, DD/MM/YYYY, or Date) to DD/MM/YYYY
  const formatToDisplay = (val) => {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      return DateTimeFormatter.formatDate(val);
    }
    const str = String(val).trim();
    if (!str) return '';

    // If already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      return str;
    }

    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.substring(0, 10).split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    // Attempt date parsing
    const parsed = DateTimeFormatter.toDate(str);
    if (parsed) {
      return DateTimeFormatter.formatDate(parsed);
    }

    return str;
  };

  // Convert DD/MM/YYYY string to YYYY-MM-DD (ISO)
  const formatToIso = (displayStr) => {
    if (!displayStr) return '';
    const str = String(displayStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [day, month, year] = str.split('/');
      return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    return '';
  };

  const [displayValue, setDisplayValue] = useState(() => formatToDisplay(value));
  const [isoValue, setIsoValue] = useState(() => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return formatToIso(formatToDisplay(value));
  });

  // Sync state if external value changes
  useEffect(() => {
    const nextDisplay = formatToDisplay(value);
    setDisplayValue(nextDisplay);
    setIsoValue(formatToIso(nextDisplay));
  }, [value]);

  const emitChange = (newIso) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id || '',
          value: newIso,
        },
      };
      onChange(syntheticEvent);
    }
  };

  // Smart input masking for typing (e.g. typing digits automatically inserts '/')
  const handleInputChange = (e) => {
    const inputVal = e.target.value;
    
    // Allow clearing
    if (!inputVal) {
      setDisplayValue('');
      setIsoValue('');
      emitChange('');
      return;
    }

    // Keep only numbers and slashes
    let cleaned = inputVal.replace(/[^\d/]/g, '');

    // Auto-insert slashes as numbers are typed
    const digitsOnly = cleaned.replace(/\D/g, '');
    let formatted = '';
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.substring(0, 2);
      if (digitsOnly.length >= 3) {
        formatted += '/' + digitsOnly.substring(2, 4);
      }
      if (digitsOnly.length >= 5) {
        formatted += '/' + digitsOnly.substring(4, 8);
      }
    }

    setDisplayValue(formatted);

    // If fully formatted DD/MM/YYYY
    if (formatted.length === 10) {
      const [day, month, year] = formatted.split('/').map(Number);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const nextIso = formatToIso(formatted);
        setIsoValue(nextIso);
        emitChange(nextIso);
      }
    }
  };

  const handleBlur = () => {
    if (!displayValue) {
      setIsoValue('');
      emitChange('');
      return;
    }

    // If user entered short format like 1/2/2026, normalize to 01/02/2026
    const parts = displayValue.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (d.length === 1) d = '0' + d;
      if (m.length === 1) m = '0' + m;
      if (y.length === 2) y = '20' + y;
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        const normalized = `${d}/${m}/${y}`;
        const day = Number(d);
        const month = Number(m);
        const year = Number(y);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          setDisplayValue(normalized);
          const nextIso = formatToIso(normalized);
          setIsoValue(nextIso);
          emitChange(nextIso);
          return;
        }
      }
    }

    // If invalid format on blur, revert to current valid isoValue if available, or clear
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(displayValue)) {
      if (isoValue) {
        setDisplayValue(formatToDisplay(isoValue));
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
    const val = e.target.value; // 'YYYY-MM-DD'
    setIsoValue(val);
    const display = formatToDisplay(val);
    setDisplayValue(display);
    emitChange(val);
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
          title="Open calendar"
          className="absolute end-2 p-1 text-text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Hidden native date input to trigger system calendar picker */}
      <input
        type="date"
        ref={nativeInputRef}
        value={isoValue}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleNativeChange}
        disabled={disabled}
        className="sr-only absolute pointer-events-none opacity-0 -z-10 w-0 h-0"
      />
    </div>
  );
}
