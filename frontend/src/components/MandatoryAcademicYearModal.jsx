import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import DateInput from './DateInput';
import { Calendar, AlertCircle, Sparkles, Check } from 'lucide-react';

export default function MandatoryAcademicYearModal() {
  const { academicYears, loading: yearsLoading, reloadYears, selectYear } = useAcademicYear();
  const { showNotification } = useNotification();
  const { t, dir, isRtl } = useLanguage();

  const [label, setLabel] = useState('2025/2026');
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Prevent escape key from doing anything
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

  // If still loading or if academic years already exist, don't show modal
  if (yearsLoading || (academicYears && academicYears.length > 0)) {
    return null;
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!label.trim() || !startDate || !endDate) {
      setErrorMsg(t('academic_year_modal.error_fill_fields'));
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setErrorMsg(isRtl ? 'تاريخ بداية الموسم يجب أن يكون قبل تاريخ نهايته' : 'Start date must be before end date');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/academic-years', {
        label: label.trim(),
        start_date: startDate,
        end_date: endDate,
        is_current: true
      });

      if (res.success) {
        showNotification(isRtl ? 'تم إنشاء الموسم الدراسي وتفعيله بنجاح' : 'Academic year created and activated successfully', 'success');
        await reloadYears();
        if (res.yearId) {
          selectYear(res.yearId);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || (isRtl ? 'فشل إنشاء الموسم الدراسي' : 'Failed to create academic year'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none overflow-y-auto"
      dir={dir}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-text-main font-cairo tracking-tight">
            {t('academic_year_modal.title')}
          </h2>

          <p className="text-xs font-semibold text-text-muted leading-relaxed max-w-md mx-auto">
            {t('academic_year_modal.subtitle')}
          </p>
        </div>

        {/* Mandatory Warning Badge */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{t('academic_year_modal.mandatory_notice')}</span>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5 text-start">
              {t('academic_year_modal.label')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('academic_year_modal.label_placeholder')}
              required
              className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-sm font-bold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-start"
            />
          </div>

          {/* Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 text-start">
                {t('academic_year_modal.start_date')} <span className="text-rose-500">*</span>
              </label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-sm font-bold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-start"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 text-start">
                {t('academic_year_modal.end_date')} <span className="text-rose-500">*</span>
              </label>
              <DateInput
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-sm font-bold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-start"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('academic_year_modal.submitting')}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('academic_year_modal.submit_btn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
