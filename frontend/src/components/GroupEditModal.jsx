import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  X, 
  Layers, 
  GraduationCap, 
  MapPin, 
  Check, 
  Edit3,
  Calendar,
  Clock,
  Loader2 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';
import GroupScheduleBuilder from './GroupScheduleBuilder';

export default function GroupEditModal({
  isOpen,
  onClose,
  group,
  teachers: externalTeachers = [],
  classrooms: externalClassrooms = [],
  onSuccess
}) {
  const { settings } = useSettings();
  const { showNotification } = useNotification();
  const { t, dir } = useLanguage();
  const { user: authUser } = useAuth();

  const [teachers, setTeachers] = useState(externalTeachers);
  const [classrooms, setClassrooms] = useState(externalClassrooms);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    track_type: 'HALAQA',
    gender: 'MALE',
    subject_name: '',
    teacher_id: '',
    room: '',
    schedule: '',
    sessions: [],
    is_free: false,
    monthly_fee: 1500,
    month_calculation_type: 'CALENDAR_MONTH',
    package_quota: ''
  });

  // Track availability from settings
  const isQuranEnabled = Boolean(settings?.enable_quran_track);
  const isPreschoolEnabled = Boolean(settings?.enable_preschool_track);
  const isTutoringEnabled = Boolean(settings?.enable_tutoring_track);

  // Sync internal dependencies if props update
  useEffect(() => {
    if (externalTeachers && externalTeachers.length > 0) {
      setTeachers(externalTeachers);
    }
  }, [externalTeachers]);

  useEffect(() => {
    if (externalClassrooms && externalClassrooms.length > 0) {
      setClassrooms(externalClassrooms);
    }
  }, [externalClassrooms]);

  // Load teachers/classrooms if not already provided
  useEffect(() => {
    if (!isOpen) return;

    if (teachers.length === 0 || classrooms.length === 0) {
      const fetchDeps = async () => {
        try {
          const [tRes, cRes] = await Promise.all([
            teachers.length === 0 ? api.get('/teachers') : Promise.resolve(null),
            classrooms.length === 0 ? api.get('/classrooms') : Promise.resolve(null)
          ]);
          if (tRes && tRes.success) setTeachers(tRes.data || []);
          if (cRes && cRes.success) setClassrooms(cRes.data || []);
        } catch (err) {
          console.error('Failed to load modal dependencies:', err);
        }
      };
      fetchDeps();
    }
  }, [isOpen, teachers.length, classrooms.length]);

  const [scheduleConflict, setScheduleConflict] = useState(false);

  // Filter teachers matching the currently selected track type in modal
  const filteredTeachers = useMemo(() => {
    const selectedTrack = formData.track_type;
    if (!selectedTrack) return teachers;
    return teachers.filter(tc => {
      if (Array.isArray(tc.track_types) && tc.track_types.length > 0) {
        if (tc.track_types.includes('GENERAL') || tc.track_types.includes('ALL')) return true;
        return tc.track_types.includes(selectedTrack);
      }
      if (typeof tc.track_type === 'string') {
        if (tc.track_type === 'GENERAL' || tc.track_type.includes('ALL')) return true;
        const types = tc.track_type.split(',').map(s => s.trim());
        return types.includes(selectedTrack);
      }
      return true;
    });
  }, [teachers, formData.track_type]);

  // Initialize form data from group
  useEffect(() => {
    if (isOpen && group) {
      setScheduleConflict(false);
      setFormData({
        name: group.name || '',
        track_type: group.track_type || 'HALAQA',
        gender: group.gender || (authUser?.gender_access === 'FEMALE' ? 'FEMALE' : 'MALE'),
        subject_name: group.subject_name || '',
        teacher_id: group.teacher_id ? String(group.teacher_id) : '',
        room: group.room || '',
        schedule: group.schedule || '',
        sessions: [],
        is_free: Boolean(group.is_free),
        monthly_fee: group.monthly_fee !== undefined ? group.monthly_fee : 1500,
        month_calculation_type: group.month_calculation_type || 'CALENDAR_MONTH',
        package_quota: group.package_quota !== undefined && group.package_quota !== null ? group.package_quota : ''
      });
    }
  }, [isOpen, group, authUser]);

  if (!isOpen || !group) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification(t('tracks.group_name_required'), 'warning');
      return;
    }

    if (formData.track_type === 'TUTORING' && scheduleConflict) {
      showNotification(t('tracks.schedule_overlap_error_toast'), 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        track_type: formData.track_type,
        gender: settings?.group_gender_policy === 'SEPARATED' ? (formData.gender || 'MALE') : 'ALL',
        subject_name: formData.track_type === 'PRESCHOOL' ? null : (formData.subject_name.trim() || null),
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id, 10) : null,
        room: formData.room || null,
        schedule: formData.schedule || null,
        sessions: formData.sessions,
        is_free: formData.is_free,
        monthly_fee: formData.is_free ? 0 : parseFloat(formData.monthly_fee) || 0,
        month_calculation_type: formData.is_free ? 'CALENDAR_MONTH' : (formData.month_calculation_type || 'CALENDAR_MONTH'),
        package_quota: (!formData.is_free && formData.month_calculation_type !== 'CALENDAR_MONTH' && formData.package_quota) 
          ? parseInt(formData.package_quota, 10) 
          : null
      };

      const res = await api.put(`/groups/${group.id}`, payload);
      if (res.success) {
        showNotification(res.message || t('tracks.group_updated_success'), 'success');
        if (onSuccess) {
          onSuccess({ ...group, ...payload });
        }
        onClose();
      }
    } catch (err) {
      showNotification(err.message || t('tracks.group_updated_failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        dir={dir}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-text-main font-cairo">
                {t('tracks.edit_group_title')}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {group.name} {group.academic_year_label ? `(${group.academic_year_label})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-hover transition-colors"
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Educational Track */}
          <div>
            <label className="block text-xs font-bold text-text-main mb-1">
              {t('tracks.educational_track_label')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.track_type}
              onChange={(e) => {
                const newTrack = e.target.value;
                setFormData(prev => {
                  let keepTeacher = false;
                  if (prev.teacher_id) {
                    const currentTeacher = teachers.find(tc => String(tc.id) === String(prev.teacher_id));
                    if (currentTeacher) {
                      const trackList = Array.isArray(currentTeacher.track_types)
                        ? currentTeacher.track_types
                        : (currentTeacher.track_type ? currentTeacher.track_type.split(',').map(s => s.trim()) : ['GENERAL']);
                      keepTeacher = trackList.includes('GENERAL') || trackList.includes('ALL') || trackList.includes(newTrack);
                    }
                  }
                  return {
                    ...prev,
                    track_type: newTrack,
                    teacher_id: keepTeacher ? prev.teacher_id : ''
                  };
                });
              }}
              className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
            >
              {isQuranEnabled && (
                <option value="HALAQA">{t('tracks.track_quran')}</option>
              )}
              {isPreschoolEnabled && (
                <option value="PRESCHOOL">{t('tracks.track_preschool')}</option>
              )}
              {isTutoringEnabled && (
                <option value="TUTORING">{t('tracks.track_tutoring')}</option>
              )}
            </select>
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-xs font-bold text-text-main mb-1">
              {t('tracks.group_name_label')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t('tracks.group_name_placeholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>

          {/* Group Gender Selection (when policy is SEPARATED) */}
          {settings?.group_gender_policy === 'SEPARATED' && (
            <div>
              <label className="block text-xs font-bold text-text-main mb-1.5">
                {t('tracks.group_gender_label')} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={authUser?.gender_access === 'FEMALE'}
                  onClick={() => setFormData({ ...formData, gender: 'MALE' })}
                  className={`p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                    formData.gender === 'MALE'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-600 font-bold shadow-xs'
                      : 'bg-surface border-border text-text-muted hover:border-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="text-base font-bold">♂</span>
                  <span className="text-xs">{t('tracks.group_gender_male')}</span>
                </button>

                <button
                  type="button"
                  disabled={authUser?.gender_access === 'MALE'}
                  onClick={() => setFormData({ ...formData, gender: 'FEMALE' })}
                  className={`p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                    formData.gender === 'FEMALE'
                      ? 'bg-pink-500/10 border-pink-500 text-pink-600 font-bold shadow-xs'
                      : 'bg-surface border-border text-text-muted hover:border-pink-500/40 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="text-base font-bold">♀</span>
                  <span className="text-xs">{t('tracks.group_gender_female')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Subject / Program (hidden when track is preschool) */}
          {formData.track_type !== 'PRESCHOOL' && (
            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                {t('tracks.subject_program_label')}
              </label>
              <input
                type="text"
                placeholder={t('tracks.subject_program_placeholder')}
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          )}

          {/* Teacher Supervisor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-bold text-text-main">
                  {t('tracks.teacher_label')}
                </label>
                <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                  ({filteredTeachers.length})
                </span>
              </div>
              <Link 
                to="/teachers" 
                className="text-[11px] text-primary hover:underline font-bold"
                title={t('tracks.manage_teachers_link')}
              >
                {t('tracks.manage_teachers_link')}
              </Link>
            </div>
            <SearchableSelect
              options={filteredTeachers.map(tc => ({
                value: String(tc.id),
                label: tc.full_name,
                sublabel: tc.specialty,
                badge: tc.phone || '',
                avatarUrl: tc.photo_url || null,
                avatarText: tc.full_name ? tc.full_name.charAt(0).toUpperCase() : '?',
                searchExtra: `${tc.full_name} ${tc.specialty || ''} ${tc.phone || ''}`
              }))}
              value={formData.teacher_id}
              onChange={(val) => setFormData({ ...formData, teacher_id: val })}
              placeholder={
                formData.track_type === 'HALAQA'
                  ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_quran') })
                  : formData.track_type === 'PRESCHOOL'
                  ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_preschool') })
                  : formData.track_type === 'TUTORING'
                  ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_tutoring') })
                  : t('tracks.select_teacher_placeholder')
              }
              searchPlaceholder={t('tracks.search_teacher_placeholder')}
              icon={GraduationCap}
            />
            {filteredTeachers.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                {t('tracks.no_teachers_for_track_hint')}
              </p>
            )}
          </div>

          {/* Classroom */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-text-main">
                {t('tracks.classroom_label')}
              </label>
              <Link 
                to="/timetable" 
                className="text-[11px] text-primary hover:underline font-bold"
                title={t('tracks.manage_classrooms_link')}
              >
                {t('tracks.manage_classrooms_link')}
              </Link>
            </div>
            <SearchableSelect
              options={classrooms.map(c => ({
                value: c.name,
                label: c.name,
                sublabel: c.code ? `${t('classrooms_timetable.classroom_code', 'رمز')}: ${c.code}` : '',
                badge: `${t('classrooms_timetable.room_capacity')}: ${c.capacity}`,
                searchExtra: `${c.name} ${c.code || ''} ${c.equipment || ''}`
              }))}
              value={formData.room}
              onChange={(val) => setFormData({ ...formData, room: val })}
              placeholder={t('tracks.select_classroom_placeholder')}
              searchPlaceholder={t('tracks.search_classroom_placeholder')}
              icon={MapPin}
            />
          </div>

          {/* Weekly Schedule Builder */}
          <div>
            <label className="block text-xs font-bold text-text-main mb-1">
              {t('tracks.weekly_schedule_label')}
            </label>
            <GroupScheduleBuilder
              trackType={formData.track_type}
              value={formData.schedule}
              onChange={(scheduleText, sessionsList, meta) => {
                setFormData(prev => ({
                  ...prev,
                  schedule: scheduleText,
                  sessions: sessionsList
                }));
                setScheduleConflict(Boolean(meta?.hasConflict));
              }}
            />
          </div>

          {/* Flexible Pricing Options */}
          <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-text-main block">
                  {t('tracks.fully_free_group')}
                </span>
                <span className="text-xs text-text-muted">
                  {t('tracks.fully_free_hint')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>

            {!formData.is_free && (
              <div className="space-y-4 pt-3 border-t border-border">
                {/* Month Calculation Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-text-main mb-2">
                    {t('tracks.month_calculation_type_label')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. Calendar Month */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, month_calculation_type: 'CALENDAR_MONTH' })}
                      className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between gap-1.5 ${
                        formData.month_calculation_type === 'CALENDAR_MONTH'
                          ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/30'
                          : 'bg-surface-card border-border text-text-muted hover:border-text-muted/40 hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{t('tracks.calc_calendar_month')}</span>
                      </div>
                      <span className="text-[10px] opacity-80 leading-relaxed">{t('tracks.calc_calendar_month_desc')}</span>
                    </button>

                    {/* 2. Per Number of Sessions */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, month_calculation_type: 'PER_SESSION' })}
                      className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between gap-1.5 ${
                        formData.month_calculation_type === 'PER_SESSION'
                          ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/30'
                          : 'bg-surface-card border-border text-text-muted hover:border-text-muted/40 hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{t('tracks.calc_per_session')}</span>
                      </div>
                      <span className="text-[10px] opacity-80 leading-relaxed">{t('tracks.calc_per_session_desc')}</span>
                    </button>

                    {/* 3. Per Number of Hours */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, month_calculation_type: 'PER_HOUR' })}
                      className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between gap-1.5 ${
                        formData.month_calculation_type === 'PER_HOUR'
                          ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/30'
                          : 'bg-surface-card border-border text-text-muted hover:border-text-muted/40 hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{t('tracks.calc_per_hour')}</span>
                      </div>
                      <span className="text-[10px] opacity-80 leading-relaxed">{t('tracks.calc_per_hour_desc')}</span>
                    </button>
                  </div>
                </div>

                {/* Inputs based on calculation mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">
                      {t('tracks.monthly_fee_standard')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  </div>

                  {formData.month_calculation_type === 'PER_SESSION' && (
                    <div>
                      <label className="block text-xs font-bold text-text-main mb-1">
                        {t('tracks.sessions_quota_label')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="8"
                        value={formData.package_quota}
                        onChange={(e) => setFormData({ ...formData, package_quota: e.target.value })}
                        className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
                        required
                      />
                    </div>
                  )}

                  {formData.month_calculation_type === 'PER_HOUR' && (
                    <div>
                      <label className="block text-xs font-bold text-text-main mb-1">
                        {t('tracks.hours_quota_label')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="12"
                        value={formData.package_quota}
                        onChange={(e) => setFormData({ ...formData, package_quota: e.target.value })}
                        className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Live rate indicators */}
                {formData.month_calculation_type === 'PER_SESSION' && formData.package_quota > 0 && formData.monthly_fee > 0 && (
                  <div className="text-xs text-primary font-mono font-bold bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg inline-block">
                    {t('tracks.unit_rate_per_session', { rate: Math.round(parseFloat(formData.monthly_fee) / parseInt(formData.package_quota, 10)).toLocaleString() })}
                  </div>
                )}
                {formData.month_calculation_type === 'PER_HOUR' && formData.package_quota > 0 && formData.monthly_fee > 0 && (
                  <div className="text-xs text-primary font-mono font-bold bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg inline-block">
                    {t('tracks.unit_rate_per_hour', { rate: Math.round(parseFloat(formData.monthly_fee) / parseInt(formData.package_quota, 10)).toLocaleString() })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit / Cancel Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('common.saving', 'جاري الحفظ...')}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('tracks.update_group_btn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
