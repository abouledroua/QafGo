import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translate, supportedLanguages } from '../i18n/index.js';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('qafgo_lang');
    return ['ar', 'en', 'fr'].includes(saved) ? saved : 'ar';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isRtl = lang === 'ar';

  const setLanguage = useCallback((newLang) => {
    if (['ar', 'en', 'fr'].includes(newLang)) {
      setLangState(newLang);
      localStorage.setItem('qafgo_lang', newLang);
    }
  }, []);

  const [currency, setCurrencyState] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('qafgo_currency_symbol')) || (lang === 'ar' ? 'د.ج' : 'DZD');
  });

  useEffect(() => {
    const handleCurrencyUpdate = (e) => {
      if (e.detail) {
        setCurrencyState(e.detail);
      }
    };
    window.addEventListener('currency:updated', handleCurrencyUpdate);
    return () => window.removeEventListener('currency:updated', handleCurrencyUpdate);
  }, []);

  const t = useCallback((key, paramsOrDefault, extraParams) => {
    return translate(key, lang, paramsOrDefault, extraParams);
  }, [lang, currency]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    
    // Adjust font classes if needed
    if (lang === 'ar') {
      document.documentElement.classList.add('lang-ar');
      document.documentElement.classList.remove('lang-ltr');
    } else {
      document.documentElement.classList.add('lang-ltr');
      document.documentElement.classList.remove('lang-ar');
    }
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{
      lang,
      currentLanguage: lang,
      setLanguage,
      t,
      dir,
      isRtl,
      currency,
      supportedLanguages
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
