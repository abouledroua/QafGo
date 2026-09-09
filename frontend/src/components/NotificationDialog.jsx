import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, HelpCircle, Play, Pause, Archive, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const DURATION_MS = 5000;

export default function NotificationDialog({ notification, onClose, confirmDialog }) {
  const { t, dir, isRtl } = useLanguage();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(DURATION_MS);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      return;
    }

    remainingTimeRef.current = DURATION_MS;
    startTimeRef.current = Date.now();
    setProgress(100);
    setIsPaused(false);

    const updateTimer = () => {
      if (isPaused) {
        animFrameRef.current = requestAnimationFrame(updateTimer);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed >= DURATION_MS) {
        onClose();
      } else {
        animFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [notification, isPaused, onClose]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now() - ((100 - progress) / 100) * DURATION_MS;
    setIsPaused(false);
  };

  return (
    <>
      {/* 1. Confirm Dialog Modal (Zero native confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-md p-6 bg-surface-card border border-border rounded-3xl shadow-2xl transition-all"
            dir={dir}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                confirmDialog.variant === 'success'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : confirmDialog.variant === 'danger'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : confirmDialog.variant === 'info'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}>
                {confirmDialog.icon === 'play' ? (
                  <Play className="w-7 h-7 fill-current" />
                ) : confirmDialog.icon === 'pause' ? (
                  <Pause className="w-7 h-7" />
                ) : confirmDialog.icon === 'archive' ? (
                  <Archive className="w-7 h-7" />
                ) : confirmDialog.icon === 'rotate-ccw' ? (
                  <RotateCcw className="w-7 h-7" />
                ) : confirmDialog.variant === 'success' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : confirmDialog.variant === 'danger' ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <HelpCircle className="w-7 h-7" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-black text-text-main">{confirmDialog.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">{confirmDialog.subtitle || t('confirm_dialog.subtitle_default')}</p>
              </div>
            </div>

            <div className="text-sm text-text-main leading-relaxed mb-6 bg-surface p-4 rounded-2xl border border-border">
              {confirmDialog.message}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border transition-colors"
              >
                {confirmDialog.cancelText || t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-lg transition-all ${
                  confirmDialog.variant === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : confirmDialog.variant === 'info'
                    ? 'bg-primary hover:bg-primary-hover shadow-primary/25'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                }`}
              >
                {confirmDialog.confirmText || t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Toast Notification with 5s countdown progress bar & pause-on-hover */}
      {notification && (
        <div 
          className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-[9998] max-w-md w-full shadow-2xl transition-all animate-slideUp`}
          dir={dir}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative overflow-hidden bg-surface-card border border-border rounded-2xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              {/* Type Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {notification.type === 'success' && (
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                {notification.type === 'error' && (
                  <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                {notification.type === 'warning' && (
                  <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                {notification.type === 'info' && (
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Info className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-text-main">{notification.title}</h4>
                  <button
                    onClick={onClose}
                    className="p-1 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
                    title={t('common.close')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">{notification.message}</p>
                {isPaused && (
                  <span className="inline-block mt-1 text-xs text-primary font-medium">
                    ({t('common.timer_paused') || '...'})
                  </span>
                )}
              </div>
            </div>

            {/* 5-Second Animated Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-surface">
              <div
                className={`h-full transition-all duration-75 ${
                  notification.type === 'success'
                    ? 'bg-emerald-500'
                    : notification.type === 'error'
                    ? 'bg-rose-500'
                    : notification.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
