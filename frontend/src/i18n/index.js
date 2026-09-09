import ar from './ar.json';
import en from './en.json';
import fr from './fr.json';

export const dictionaries = { ar, en, fr };

export const supportedLanguages = [
  { code: 'ar', label: 'العربية', dir: 'rtl', flag: '🇩🇿' },
  { code: 'en', label: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', dir: 'ltr', flag: '🇫🇷' }
];

/**
 * Nested key lookup: 'students.table_name' -> ar.students.table_name
 */
function getNestedValue(obj, keyPath) {
  if (!obj || !keyPath) return undefined;
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Format string with {param} replacement
 */
function interpolate(template, params = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Translate key for a given language code
 */
export function translate(key, lang = 'ar', params = {}) {
  const selectedLang = ['ar', 'en', 'fr'].includes(lang) ? lang : 'ar';
  const dict = dictionaries[selectedLang] || dictionaries.ar;

  // Try nested key in selected dict
  let value = getNestedValue(dict, key);

  // Fallback to Arabic if not found
  if (value === undefined && selectedLang !== 'ar') {
    value = getNestedValue(dictionaries.ar, key);
  }

  // Fallback to key if still not found
  if (value === undefined) {
    return key;
  }

  return interpolate(value, params);
}
