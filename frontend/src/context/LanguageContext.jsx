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

  const t = useCallback((key, params) => {
    return translate(key, lang, params);
  }, [lang]);

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
