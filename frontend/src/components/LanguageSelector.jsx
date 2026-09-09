import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector({ variant = 'navbar' }) {
  const { lang, setLanguage, supportedLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const current = supportedLanguages.find(l => l.code === lang) || supportedLanguages[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'settings') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {supportedLanguages.map((item) => {
          const isSelected = item.code === lang;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 text-text-main shadow-md shadow-primary/10 ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.flag}</span>
                <div className="text-start">
                  <span className="text-sm font-bold block">{item.label}</span>
                  <span className="text-[11px] font-mono text-text-muted uppercase">{item.code}</span>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>
    );
  }

  // Navbar compact dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-text-main text-xs font-bold transition-all shadow-sm"
        title="تغيير لغة المنصة / Change Language / Changer de langue"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm">{current.flag}</span>
        <span className="hidden md:inline font-bold">{current.label}</span>
        <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto z-50 w-44 p-1.5 bg-surface-card border border-border rounded-2xl shadow-xl backdrop-blur-md animate-fadeIn">
          {supportedLanguages.map((item) => {
            const isSelected = item.code === lang;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLanguage(item.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:text-text-main hover:bg-surface'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.flag}</span>
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
