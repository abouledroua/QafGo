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

let runtimeCurrency = typeof window !== 'undefined' ? localStorage.getItem('qafgo_currency_symbol') : null;

export function setRuntimeCurrency(symbol) {
  if (!symbol || typeof symbol !== 'string') return;
  const trimmed = symbol.trim();
  if (!trimmed) return;
  runtimeCurrency = trimmed;
  if (typeof window !== 'undefined') {
    localStorage.setItem('qafgo_currency_symbol', trimmed);
  }
  ['ar', 'en', 'fr'].forEach(lang => {
    if (dictionaries[lang]) {
      if (!dictionaries[lang].common) dictionaries[lang].common = {};
      dictionaries[lang].common.currency = trimmed;
      dictionaries[lang].common.dzd = trimmed;
      if (dictionaries[lang].students) dictionaries[lang].students.currency_dzd = trimmed;
      if (dictionaries[lang].transfers) dictionaries[lang].transfers.currency = trimmed;
    }
  });
}

export function getRuntimeCurrency() {
  return runtimeCurrency;
}

if (runtimeCurrency) {
  setRuntimeCurrency(runtimeCurrency);
}

/**
 * Translate key for a given language code
 */
export function translate(key, lang = 'ar', paramsOrDefault = {}, extraParams = {}) {
  // Dynamic currency override for all currency keys
  if (['common.currency', 'common.dzd', 'students.currency_dzd', 'transfers.currency'].includes(key)) {
    if (runtimeCurrency) {
      return runtimeCurrency;
    }
  }

  let fallback = undefined;
  let params = paramsOrDefault;

  if (typeof paramsOrDefault === 'string') {
    fallback = paramsOrDefault;
    params = extraParams || {};
  }

  const selectedLang = ['ar', 'en', 'fr'].includes(lang) ? lang : 'ar';
  const dict = dictionaries[selectedLang] || dictionaries.ar;

  // Try nested key in selected dict
  let value = getNestedValue(dict, key);

  // Fallback to Arabic if not found
  if (value === undefined && selectedLang !== 'ar') {
    value = getNestedValue(dictionaries.ar, key);
  }

  // Fallback to provided default text if still not found, or key
  if (value === undefined) {
    return fallback !== undefined ? interpolate(fallback, params) : key;
  }

  return interpolate(value, params);
}
