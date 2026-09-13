import React, { useState } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import DateInput from '../components/DateInput';
import { Sparkles, Calendar, Layers, Users, CheckCircle2, AlertTriangle, ArrowLeft, Lock, Plus } from 'lucide-react';

export default function RolloverPage() {
  const { academicYears, selectedYearId, reloadYears } = useAcademicYear();
  const { showNotification, confirm } = useNotification();
  const { t, isRtl } = useLanguage();

  const [sourceYearId, setSourceYearId] = useState(selectedYearId || '');
  const [targetYearId, setTargetYearId] = useState('');
  const [cloneGroups, setCloneGroups] = useState(true);
  const [reEnrollStudents, setReEnrollStudents] = useState(true);
  const [lockSourceYear, setLockSourceYear] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  // New Year Quick Creator
  const [newYearModalOpen, setNewYearModalOpen] = useState(false);
  const [newYearLabel, setNewYearLabel] = useState('2026/2027');
  const [newYearStart, setNewYearStart] = useState('2026-09-01');
  const [newYearEnd, setNewYearEnd] = useState('2027-06-30');

  const handleCreateNewYear = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/academic-years', {
        label: newYearLabel,
        start_date: newYearStart,
        end_date: newYearEnd,
        is_current: false
      });

      if (res.success) {
        showNotification(t('rollover.success_add_year'), 'success');
        setNewYearModalOpen(false);
        await reloadYears();
        setTargetYearId(res.yearId);
      }
    } catch (err) {
      showNotification(err.message || t('rollover.fail_add_year'), 'error');
    }
  };

  const handleRunRollover = async () => {
    if (!sourceYearId || !targetYearId) {
      showNotification(t('rollover.select_years_warning'), 'warning');
      return;
    }

    if (sourceYearId == targetYearId) {
      showNotification(t('rollover.same_year_warning'), 'warning');
      return;
    }

    const confirmed = await confirm({
      title: t('rollover.confirm_rollover_title'),
      message: t('rollover.confirm_rollover_msg'),
      confirmText: t('rollover.confirm_yes'),
      cancelText: t('rollover.confirm_cancel')
    });

    if (!confirmed) return;

    try {
      setMigrating(true);
      setMigrationResult(null);

      const res = await api.post('/academic-years/rollover', {
        source_year_id: parseInt(sourceYearId, 10),
        target_year_id: parseInt(targetYearId, 10),
        clone_groups: cloneGroups,
        re_enroll_students: reEnrollStudents
      });

      if (res.success) {
        // Optionally lock source year
        if (lockSourceYear) {
          await api.put(`/academic-years/${sourceYearId}/toggle-lock`);
        }

        await reloadYears();
        setMigrationResult(res);
        showNotification(res.message || t('rollover.success_rollover'), 'success');
      }
    } catch (err) {
      showNotification(err.message || t('rollover.fail_rollover'), 'error');
    } finally {
      setMigrating(false);
    }
  };

  const sourceYear = academicYears.find(y => y.id == sourceYearId);
  const targetYear = academicYears.find(y => y.id == targetYearId);

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl hero-gradient-banner shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/25 backdrop-blur-md text-xs font-bold text-white border border-white/20">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>{t('rollover.wizard_badge')}</span>
        </div>
        <h1 className="text-3xl font-black font-cairo text-white tracking-tight">
          {t('rollover.hero_title')}
        </h1>
        <p className="text-white/90 text-sm leading-relaxed max-w-2xl">
          {t('rollover.hero_desc')}
        </p>
      </div>

      {/* Migration Wizard Steps */}
      <div className="p-6 lg:p-8 bg-surface-card border border-border rounded-3xl shadow-sm space-y-8">
        
        {/* Step 1: Select Source and Target Years */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
            <span>{t('rollover.step1_title')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-surface rounded-2xl border border-border">
            
            {/* Source Year */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-2">
                {t('rollover.source_year_label')}
              </label>
              <select
                value={sourceYearId}
                onChange={(e) => setSourceYearId(e.target.value)}
                className="w-full p-3 bg-surface-card border border-border rounded-xl text-sm font-bold text-text-main"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.is_current ? t('rollover.current_tag') : ''} - ({t('rollover.groups_count', { count: y.groups_count })})
                  </option>
                ))}
              </select>
              {sourceYear && (
                <span className="text-[11px] text-text-muted mt-1 block">
                  {t('rollover.source_stats', { groups: sourceYear.groups_count, students: sourceYear.active_students_count })}
                </span>
              )}
            </div>

            {/* Target Year */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-text-muted">
                  {t('rollover.target_year_label')}
                </label>
                <button
                  type="button"
                  onClick={() => setNewYearModalOpen(true)}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('rollover.add_new_year_btn')}</span>
                </button>
              </div>

              <select
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                className="w-full p-3 bg-surface-card border border-border rounded-xl text-sm font-bold text-text-main"
              >
                <option value="">{t('rollover.select_target_placeholder')}</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id} disabled={y.id == sourceYearId}>
                    {y.label} {y.is_current ? t('rollover.current_tag') : ''} {y.is_locked ? t('rollover.locked_tag') : ''}
                  </option>
                ))}
              </select>
              {targetYear && (
                <span className="text-[11px] text-emerald-600 mt-1 block font-bold">
                  {t('rollover.target_ready')}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Step 2: Migration Parameters */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
            <span>{t('rollover.step2_title')}</span>
          </h3>

          <div className="space-y-3 p-5 bg-surface rounded-2xl border border-border">
            
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cloneGroups}
                onChange={(e) => setCloneGroups(e.target.checked)}
                className="w-5 h-5 accent-primary mt-0.5"
              />
              <div>
                <span className="text-sm font-bold text-text-main block">
                  {t('rollover.clone_groups_title')}
                </span>
                <span className="text-xs text-text-muted">
                  {t('rollover.clone_groups_desc')}
                </span>
              </div>
            </label>

            <div className="border-t border-border/60 my-2"></div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reEnrollStudents}
                disabled={!cloneGroups}
                onChange={(e) => setReEnrollStudents(e.target.checked)}
                className="w-5 h-5 accent-primary mt-0.5 disabled:opacity-40"
              />
              <div>
                <span className="text-sm font-bold text-text-main block">
                  {t('rollover.reenroll_title')}
                </span>
                <span className="text-xs text-text-muted">
                  {t('rollover.reenroll_desc')}
                </span>
              </div>
            </label>

            <div className="border-t border-border/60 my-2"></div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lockSourceYear}
                onChange={(e) => setLockSourceYear(e.target.checked)}
                className="w-5 h-5 accent-primary mt-0.5"
              />
              <div>
                <span className="text-sm font-bold text-text-main block">
                  {t('rollover.lock_source_title')}
                </span>
                <span className="text-xs text-text-muted">
                  {t('rollover.lock_source_desc')}
                </span>
              </div>
            </label>

          </div>
        </div>

        {/* Step 3: Run Action Button */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>{t('rollover.safe_notice')}</span>
          </div>

          <button
            type="button"
            onClick={handleRunRollover}
            disabled={migrating || !targetYearId || targetYearId == sourceYearId}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-black shadow-xl shadow-primary/25 disabled:opacity-50 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            <span>{migrating ? t('rollover.running_rollover') : t('rollover.start_rollover')}</span>
          </button>
        </div>

        {/* Migration Results Banner */}
        {migrationResult && (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/25 rounded-3xl space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-base">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span>{migrationResult.message}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2 border-t border-emerald-500/20 text-emerald-800 dark:text-emerald-200">
              <div>{t('rollover.cloned_groups_stat', { count: migrationResult.stats?.clonedGroupsCount || 0 })}</div>
              <div>{t('rollover.reenrolled_students_stat', { count: migrationResult.stats?.reEnrolledStudentsCount || 0 })}</div>
            </div>
          </div>
        )}

      </div>

      {/* Quick Add Academic Year Modal */}
      {newYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-card border border-border rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-text-main">{t('rollover.new_year_modal_title')}</h3>
            
            <form onSubmit={handleCreateNewYear} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('rollover.year_label_field')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('rollover.year_label_placeholder', 'مثال: 2026/2027')}
                  value={newYearLabel}
                  onChange={(e) => setNewYearLabel(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-main"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('rollover.start_date_field')}</label>
                  <DateInput
                    value={newYearStart}
                    onChange={(e) => setNewYearStart(e.target.value)}
                    className="w-full p-2 bg-surface border border-border rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('rollover.end_date_field')}</label>
                  <DateInput
                    value={newYearEnd}
                    onChange={(e) => setNewYearEnd(e.target.value)}
                    className="w-full p-2 bg-surface border border-border rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewYearModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted bg-surface rounded-xl border border-border"
                >
                  {t('rollover.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md"
                >
                  {t('rollover.add_and_approve')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

