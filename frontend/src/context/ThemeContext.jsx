import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'sky-blue',
    name: 'الأزرق السماوي الهادئ',
    isDark: false,
    color: '#2563eb',
    bgPreview: '#f8fafc',
    className: 'theme-sky-blue'
  },
  {
    id: 'classic-emerald',
    name: 'الزمردي التقليدي',
    isDark: false,
    color: '#064e3b',
    bgPreview: '#faf7f2',
    className: 'theme-classic-emerald'
  },
  {
    id: 'soft-lavender',
    name: 'الخزامي الناعم',
    isDark: false,
    color: '#7c3aed',
    bgPreview: '#fcfaff',
    className: 'theme-soft-lavender'
  },
  {
    id: 'brown-light',
    name: 'البني الفاتح الدافئ',
    isDark: false,
    color: '#854d0e',
    bgPreview: '#faf6ee',
    className: 'theme-brown-light'
  },
  {
    id: 'royal-navy',
    name: 'الكحلي الملكي العميق',
    isDark: true,
    color: '#3b82f6',
    bgPreview: '#0b1329',
    className: 'theme-royal-navy'
  },
  {
    id: 'emerald-night',
    name: 'الزمردي الليلي الداكن',
    isDark: true,
    color: '#10b981',
    bgPreview: '#05140f',
    className: 'theme-emerald-night'
  },
  {
    id: 'slate-space',
    name: 'الفضاء الرمادي المتدرج',
    isDark: true,
    color: '#94a3b8',
    bgPreview: '#0f172a',
    className: 'theme-slate-space'
  }
];

export const DEFAULT_THEME_ID = 'brown-light';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('qafgo_theme') || DEFAULT_THEME_ID;
  });

  const defaultThemeObj = THEMES.find(t => t.id === DEFAULT_THEME_ID) || THEMES[0];

  useEffect(() => {
    const themeObj = THEMES.find(t => t.id === currentTheme) || defaultThemeObj;
    
    // Remove all previous theme classes
    THEMES.forEach(t => {
      document.documentElement.classList.remove(t.className);
    });

    // Add selected theme class
    document.documentElement.classList.add(themeObj.className);

    // Toggle Tailwind dark class
    if (themeObj.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('qafgo_theme', currentTheme);
  }, [currentTheme, defaultThemeObj]);

  const setTheme = (themeId) => {
    setCurrentTheme(themeId);
  };

  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || defaultThemeObj;

  return (
    <ThemeContext.Provider value={{ currentTheme, activeThemeObj, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
