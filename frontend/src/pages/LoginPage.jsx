import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import QafGoLogo from '../components/QafGoLogo';
import LanguageSelector from '../components/LanguageSelector';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Palette,
  Check,
  ChevronDown
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const { t, dir, isRtl } = useLanguage();
  const { themes, currentTheme, setTheme, activeThemeObj } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage(t('auth.invalid_credentials'));
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await login(username.trim(), password);
    } catch (err) {
      setErrorMessage(err.message || t('auth.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setUsername('admin');
    setPassword('admin');
    setLoading(true);
    setErrorMessage('');

    try {
      await login('admin', 'admin');
    } catch (err) {
      try {
        await login('admin', 'admin123');
      } catch (err2) {
        setErrorMessage(err.message || t('auth.invalid_credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between bg-surface text-text-main transition-colors select-none relative overflow-hidden"
      dir={dir}
    >
      {/* Background Decorative Blur Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/15 filter blur-3xl pointer-events-none" />

      {/* Top Header Controls: Language & Theme Switcher */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.school_name || t('nav.brand_title')}
              className="w-10 h-10 rounded-2xl object-contain p-1 bg-surface-card border border-border shadow-sm"
            />
          ) : (
            <QafGoLogo className="w-10 h-10" showText={false} />
          )}
          <span className="font-extrabold text-lg text-text-main font-cairo">
            {settings?.school_name || t('nav.brand_title')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-card hover:bg-surface-hover border border-border text-xs font-bold text-text-main transition-colors shadow-sm"
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
              <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-64 bg-surface-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
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
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-start transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary border border-primary/25'
                            : 'hover:bg-surface text-text-main'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-inner flex-shrink-0"
                            style={{ backgroundColor: theme.color }}
                          />
                          <span>{theme.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <LanguageSelector />
        </div>
      </header>

      {/* Main Center Content: Login Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-surface-card/90 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl transition-all">
          {/* Brand & Intro */}
          <div className="text-center mb-6">
            <div className="inline-flex justify-center mb-4">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.school_name || t('nav.brand_title')}
                  className="w-20 h-20 rounded-3xl object-contain p-2 bg-surface border border-border shadow-md"
                />
              ) : (
                <div className="p-3 bg-surface rounded-3xl border border-border shadow-inner">
                  <QafGoLogo className="w-16 h-16" showText={false} />
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black text-text-main font-cairo tracking-tight">
              {t('auth.login_title')}
            </h1>
            <p className="text-xs font-semibold text-text-muted mt-1">
              {t('auth.login_welcome')}
            </p>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-3 text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 text-start">
                {t('auth.username')}
              </label>
              <div className="relative flex items-center">
                <div className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} text-text-muted pointer-events-none`}>
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.username_placeholder')}
                  required
                  autoFocus
                  className={`w-full ${
                    isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
                  } py-3 bg-surface border border-border rounded-2xl text-sm font-semibold text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 text-start">
                {t('auth.password')}
              </label>
              <div className="relative flex items-center">
                <div className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} text-text-muted pointer-events-none`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                  className={`w-full ${
                    isRtl ? 'pr-10 pl-11' : 'pl-10 pr-11'
                  } py-3 bg-surface border border-border rounded-2xl text-sm font-semibold text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRtl ? 'left-3.5' : 'right-3.5'} text-text-muted hover:text-text-main transition-colors p-1`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('auth.logging_in')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t('auth.login_btn')}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-surface-card px-3 text-[11px] font-bold text-text-muted uppercase absolute">
              أو
            </span>
          </div>

          {/* Quick Demo Access Card */}
          <div className="bg-surface border border-border/80 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-text-muted mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{t('auth.demo_title')}</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('auth.quick_demo_login')}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs font-semibold text-text-muted z-10">
        <span>{t('auth.platform_tagline')}</span>
      </footer>
    </div>
  );
}
