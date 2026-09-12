import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { Laptop, KeyRound, Check, Copy, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export default function MandatoryDeviceModal() {
  const { user } = useAuth();
  const { deviceKey, deviceName: initialName, isRegistered, loading: deviceLoading, registerDevice } = useDevice();
  const { showNotification } = useNotification();
  const { t, dir, isRtl } = useLanguage();

  const [name, setName] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [isClaimingExisting, setIsClaimingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Suggestions for quick selection
  const suggestions = [
    t('device_modal.sug_reception'),
    t('device_modal.sug_admin'),
    t('device_modal.sug_director'),
    t('device_modal.sug_finance'),
    t('device_modal.sug_teachers')
  ];

  // Prevent escape key from closing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Sync initial name if any
  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName]);

  // Only show when authenticated and device is NOT registered
  if (!user || deviceLoading || isRegistered) {
    return null;
  }

  const activeKey = (isClaimingExisting && customKey.trim()) ? customKey.trim().toUpperCase() : deviceKey;

  const handleCopyKey = () => {
    if (!activeKey) return;
    navigator.clipboard.writeText(activeKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg(t('device_modal.err_name_required'));
      return;
    }

    if (isClaimingExisting) {
      const cleanCustomKey = customKey.trim().toUpperCase();
      if (!/^[A-Z0-9]{5,8}$/.test(cleanCustomKey)) {
        setErrorMsg(t('device_modal.err_key_invalid'));
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await registerDevice(cleanName, isClaimingExisting ? customKey.trim().toUpperCase() : null);
      showNotification(
        t('device_modal.success_msg', { name: cleanName }),
        'success'
      );
    } catch (err) {
      setErrorMsg(err.message || t('device_modal.err_name_required'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir={dir}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-surface-card border-2 border-primary/30 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-primary" />

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-primary/15 rounded-2xl text-primary border border-primary/25 shrink-0 shadow-inner">
            <Laptop className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-text-main">
                {t('device_modal.title')}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
                {t('device_modal.mandatory_badge')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {t('device_modal.subtitle')}
            </p>
          </div>
        </div>

        {/* Unique Key Card */}
        <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-text-muted">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>{t('device_modal.key_label')}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyKey}
              className="text-primary hover:underline flex items-center gap-1 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('device_modal.copied_btn') : t('device_modal.copy_btn')}</span>
            </button>
          </div>

          <div className="flex items-center justify-center p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-mono text-2xl font-black tracking-widest selection:bg-primary selection:text-white">
            {activeKey}
          </div>

          <p className="text-[11px] text-text-muted text-center">
            {t('device_modal.key_hint')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Device Name Input */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-bold text-text-main">
              {t('device_modal.name_label')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('device_modal.name_placeholder')}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-main text-sm font-medium outline-none transition-all placeholder:text-text-muted/60"
            />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-text-muted">
              {t('device_modal.quick_suggestions')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setName(sug)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    name === sug
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface hover:bg-surface-card border border-border text-text-muted hover:text-text-main'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle: Link to an existing registered key */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsClaimingExisting(!isClaimingExisting)}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <span>
                {isClaimingExisting
                  ? t('device_modal.use_generated_toggle')
                  : t('device_modal.link_existing_toggle')}
              </span>
            </button>

            {isClaimingExisting && (
              <div className="mt-2.5 p-3 rounded-xl bg-surface border border-border space-y-1.5 animate-fadeIn">
                <label className="block text-[11px] font-bold text-text-muted">
                  {t('device_modal.existing_key_label')}
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                  placeholder="QF88K"
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-border focus:border-primary text-text-main font-mono text-sm uppercase outline-none"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black text-sm sm:text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{t('device_modal.saving_btn')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{t('device_modal.save_btn')}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
