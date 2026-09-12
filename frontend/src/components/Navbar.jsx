import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useSidebar } from '../context/SidebarContext';
import { useLanguage } from '../context/LanguageContext';
import QafGoLogo from './QafGoLogo';
import LanguageSelector from './LanguageSelector';
import { 
  Calendar, 
  Palette, 
  Lock, 
  Unlock, 
  LogOut, 
  Check, 
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle
} from 'lucide-react';

export default function Navbar() {
  const { academicYears, selectedYearId, selectedYearObj, selectYear } = useAcademicYear();
  const { themes, currentTheme, setTheme, activeThemeObj } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const { settings } = useSettings();
  const { isOpen, toggleSidebar } = useSidebar();
  const { t, isRtl } = useLanguage();

  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="no-print sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border transition-colors w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Start Section: Sidebar Toggle & Brand Logo */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={`p-2.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
              isOpen
                ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border-border shadow-sm'
            }`}
            title={isOpen ? t('sidebar.collapse') : t('sidebar.expand')}
            aria-label={t('sidebar.collapse')}
          >
            {isRtl ? (
              isOpen ? <PanelRightClose className="w-5 h-5 transition-transform" /> : <PanelRightOpen className="w-5 h-5 transition-transform" />
            ) : (
              isOpen ? <PanelLeftClose className="w-5 h-5 transition-transform" /> : <PanelLeftOpen className="w-5 h-5 transition-transform" />
            )}
          </button>

          {settings?.logo_url ? (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={settings.logo_url}
                alt={settings.school_name || t('nav.brand_title')}
                className="w-12 h-12 rounded-2xl object-contain p-1 bg-surface border border-border shadow-sm shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span 
                  className="font-extrabold text-xl lg:text-2xl text-text-main font-cairo leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl xl:max-w-3xl 2xl:max-w-none"
                  title={settings.school_name}
                >
                  {settings.school_name}
                </span>
                <span className="text-[11px] font-bold text-primary truncate">
                  {t('nav.brand_subtitle')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <QafGoLogo className="w-12 h-12" showText={false} />
              </div>
              <div className="flex flex-col min-w-0">
                <span 
                  className="font-extrabold text-xl lg:text-2xl text-text-main font-cairo leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl xl:max-w-3xl 2xl:max-w-none"
                  title={settings?.school_name || t('nav.brand_title')}
                >
                  {settings?.school_name || t('nav.brand_title')}
                </span>
                <span className="text-[11px] font-bold text-primary truncate">
                  {t('nav.brand_subtitle')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center / End Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 shrink-0">
          
          {/* 1. Global Academic Year Switcher */}
          <div className="hidden sm:flex items-center gap-2 bg-surface px-3 py-1.5 rounded-2xl border border-border">
            <Calendar className="w-4 h-4 text-primary" />
            <div className="flex flex-col text-start">
              <span className="text-[10px] font-bold text-text-muted">{t('nav.academic_year')}</span>
              <select
                value={selectedYearId || ''}
                onChange={(e) => selectYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-text-main focus:outline-none cursor-pointer"
                title={t('nav.switch_year')}
              >
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id} className="bg-surface-card text-text-main">
                    {year.label} {year.is_current ? ` (${t('nav.current_year')})` : ''} {year.is_locked ? ' [🔒]' : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedYearObj?.is_locked ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Lock className="w-3 h-3" />
                <span>{t('common.inactive')}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <Unlock className="w-3 h-3" />
                <span>{t('common.active')}</span>
              </span>
            )}
          </div>

          {/* 2. Language Selector */}
          <LanguageSelector />

          {/* Help & User Guide Button */}
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-muted hover:text-primary transition-colors shadow-sm cursor-pointer"
            title={t('sidebar.help', 'دليل الاستخدام')}
            aria-label={t('sidebar.help', 'دليل الاستخدام')}
          >
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="hidden md:inline">{t('sidebar.help', 'دليل الاستخدام')}</span>
          </button>

          {/* 3. Themes Switcher Dropdown */}
          <div className="hidden sm:block relative" ref={themeRef}>
            <button
              type="button"
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-main transition-colors shadow-sm"
              title={t('settings.theme_setting')}
            >
              <div 
                className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: activeThemeObj.color }}
              />
              <Palette className="w-3.5 h-3.5 text-text-muted" />
              <ChevronDown className="w-3 h-3 text-text-muted" />
            </button>

            {themeDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-72 bg-surface-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 text-xs font-bold text-text-muted border-b border-border/60 mb-1">
                  {t('settings.theme_setting')}
                </div>
                <div className="space-y-1">
                  {themes.map((theme) => {
                    const isSelected = theme.id === currentTheme;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setTheme(theme.id);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-start transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 text-primary border border-primary/25' 
                            : 'hover:bg-surface text-text-main'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-inner flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: theme.color }}
                          />
                          <div className="flex flex-col text-start">
                            <span className="leading-tight">{t(`theme.${theme.id.replace(/-/g, '_')}`, theme.name)}</span>
                            <span className="text-[10px] text-text-muted font-normal">
                              {theme.isDark ? t('nav.theme_dark') : t('nav.theme_light')}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. User Info & Quick Logout */}
          <div className="flex items-center gap-2 border-s border-border ps-3">
            <div className="flex flex-col text-start">
              <span className="text-xs font-bold text-text-main leading-tight">{user?.full_name || t('nav.user_admin')}</span>
              <span className="text-[10px] text-text-muted">{user?.role === 'ADMIN' ? t('nav.user_admin') : 'Staff'}</span>
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-text-muted hover:text-rose-600 rounded-xl hover:bg-rose-500/10 transition-colors"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
