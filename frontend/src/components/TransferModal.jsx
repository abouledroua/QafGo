import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeftRight, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useSettings } from '../context/SettingsContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function TransferModal({ 
  isOpen, 
  onClose, 
  student, 
  currentEnrollment, 
  sourceGroupId: propSourceGroupId,
  onSuccess 
}) {
  const { showNotification } = useNotification();
  const { t, isRtl } = useLanguage();
  const { selectedYearId } = useAcademicYear();
  const { settings } = useSettings();

  const [availableGroups, setAvailableGroups] = useState([]);
  const [targetGroupId, setTargetGroupId] = useState('');
  const [reason, setReason] = useState('');
  const [discountType, setDiscountType] = useState('NONE');
  const [discountValue, setDiscountValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Compute effective source group ID and name from all possible sources
  const effectiveSourceGroupId = useMemo(() => {
    if (propSourceGroupId !== undefined && propSourceGroupId !== null && propSourceGroupId !== '') {
      return propSourceGroupId;
    }
    if (currentEnrollment?.group_id !== undefined && currentEnrollment?.group_id !== null && currentEnrollment?.group_id !== '') {
      return currentEnrollment.group_id;
    }
    if (currentEnrollment?.from_group_id !== undefined && currentEnrollment?.from_group_id !== null && currentEnrollment?.from_group_id !== '') {
      return currentEnrollment.from_group_id;
    }
    if (currentEnrollment?.groupId !== undefined && currentEnrollment?.groupId !== null && currentEnrollment?.groupId !== '') {
      return currentEnrollment.groupId;
    }
    if (student?.group_id !== undefined && student?.group_id !== null && student?.group_id !== '') {
      return student.group_id;
    }
    return null;
  }, [propSourceGroupId, currentEnrollment, student]);

  const effectiveSourceGroupName = useMemo(() => {
    return (currentEnrollment?.group_name || currentEnrollment?.name || '').trim().toLowerCase();
  }, [currentEnrollment]);

  // Robust check to determine whether a group is the source group
  const isSourceGroup = useCallback((g) => {
    if (!g) return false;
    const gId = g.id !== undefined && g.id !== null ? String(g.id).trim() : '';

    if (effectiveSourceGroupId !== null && effectiveSourceGroupId !== undefined && effectiveSourceGroupId !== '') {
      const srcId = String(effectiveSourceGroupId).trim();
      if (gId === srcId || (Number(g.id) && Number(effectiveSourceGroupId) && Number(g.id) === Number(effectiveSourceGroupId))) {
        return true;
      }
    }

    if (effectiveSourceGroupName && g.name) {
      if (g.name.trim().toLowerCase() === effectiveSourceGroupName) {
        return true;
      }
    }

    return false;
  }, [effectiveSourceGroupId, effectiveSourceGroupName]);

  // Filtered destination groups (strictly excludes source group and enforces gender match when policy is SEPARATED)
  const destinationGroups = useMemo(() => {
    return availableGroups.filter(g => {
      if (isSourceGroup(g)) return false;
      if (settings?.group_gender_policy === 'SEPARATED' && student?.gender && g.gender && g.gender !== 'ALL') {
        return g.gender === student.gender;
      }
      return true;
    });
  }, [availableGroups, isSourceGroup, settings?.group_gender_policy, student?.gender]);

  useEffect(() => {
    if (isOpen && currentEnrollment) {
      setTargetGroupId('');
      setReason('');
      setDiscountType(currentEnrollment.discount_type || 'NONE');
      setDiscountValue(currentEnrollment.discount_value || 0);

      // Load other groups in the same academic year
      const fetchGroups = async () => {
        try {
          setLoadingGroups(true);
          const academicYearId = currentEnrollment.academic_year_id || selectedYearId;
          const url = academicYearId 
            ? `/groups?academic_year_id=${academicYearId}` 
            : '/groups';
          
          const res = await api.get(url);
          if (res.success && Array.isArray(res.data)) {
            // Filter out current group by ID (string & number) and name
            const filtered = res.data.filter(g => !isSourceGroup(g));
            setAvailableGroups(filtered);
            if (filtered.length > 0) {
              setTargetGroupId(String(filtered[0].id));
            } else {
              setTargetGroupId('');
            }
          }
        } catch (err) {
          showNotification(err.message || t('transfers.fetch_error'), 'error');
        } finally {
          setLoadingGroups(false);
        }
      };

      fetchGroups();
    }
  }, [isOpen, currentEnrollment, selectedYearId, isSourceGroup, showNotification, t]);

  // Keep targetGroupId synced with destinationGroups
  useEffect(() => {
    if (destinationGroups.length > 0) {
      const exists = destinationGroups.some(g => String(g.id) === String(targetGroupId));
      if (!exists) {
        setTargetGroupId(String(destinationGroups[0].id));
      }
    } else {
      setTargetGroupId('');
    }
  }, [destinationGroups, targetGroupId]);

  if (!isOpen || !currentEnrollment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetGroupId || isSourceGroup({ id: targetGroupId, name: selectedTargetGroup?.name })) {
      showNotification(t('transfers.same_group_error', t('transfers.select_warning')), 'warning');
      return;
    }
    if (!reason.trim()) {
      showNotification(t('transfers.select_warning'), 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/transfers', {
        student_id: student.id || student.student_id,
        academic_year_id: currentEnrollment.academic_year_id || selectedYearId,
        current_enrollment_id: currentEnrollment.id || currentEnrollment.enrollment_id,
        target_group_id: parseInt(targetGroupId, 10),
        reason: reason.trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0
      });

      if (res.success) {
        showNotification(res.message || t('transfers.success_msg'), 'success');
        onSuccess();
        onClose();
      }
    } catch (err) {
      showNotification(err.message || t('transfers.error_msg'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTargetGroup = destinationGroups.find(g => String(g.id) === String(targetGroupId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-text-main">
                {t('transfers.modal_title')}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {t('transfers.modal_subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Current Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-surface border border-border/80">
            <div>
              <span className="text-xs text-text-muted block">{t('transfers.student_label')}</span>
              <span className="text-base font-extrabold text-text-main">
                {student?.full_name || student?.student_name || ''}
              </span>
              <span className="text-xs font-mono text-primary block">{student?.reg_no || ''}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">{t('transfers.current_group')}</span>
              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                {currentEnrollment?.group_name || currentEnrollment?.name || ''}
              </span>
              <span className="text-xs text-text-muted block">
                {t('transfers.enrolled_at')} {currentEnrollment?.enrolled_at ? DateTimeFormatter.formatDate(currentEnrollment.enrolled_at) : ''}
              </span>
            </div>
          </div>

          {/* Target Group Selector */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">
              {t('transfers.target_group_label')} <span className="text-rose-500">*</span>
            </label>
            {loadingGroups ? (
              <div className="p-4 text-center text-sm text-text-muted bg-surface rounded-xl">
                {t('transfers.loading_groups')}
              </div>
            ) : destinationGroups.length === 0 ? (
              <div className="p-4 text-sm text-amber-600 bg-amber-500/10 rounded-xl border border-amber-500/20">
                {t('transfers.no_groups_available')}
              </div>
            ) : (
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="w-full p-3.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                required
              >
                {destinationGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.track_type === 'HALAQA' ? t('transfers.track_halaqa') : g.track_type === 'PRESCHOOL' ? t('transfers.track_preschool') : t('transfers.track_tutoring')}) - {g.is_free ? t('transfers.free') : `${g.monthly_fee} ${t('transfers.currency')}`}
                  </option>
                ))}
              </select>
            )}
            {selectedTargetGroup && (
              <div className="mt-2 text-xs text-text-muted flex items-center gap-2">
                <span>{t('transfers.supervisor_teacher')} {selectedTargetGroup.teacher_name || t('transfers.not_specified')}</span>
                <span>•</span>
                <span>{t('transfers.classroom')} {selectedTargetGroup.room || t('transfers.not_specified')}</span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">
              {t('transfers.reason_label')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('transfers.reason_placeholder')}
              className="w-full p-3.5 bg-surface border border-border rounded-xl text-sm text-text-main placeholder-text-muted/60 focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
          </div>

          {/* New Group Discount Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-surface/60 border border-border">
            <div>
              <label className="block text-xs font-bold text-text-main mb-1.5">
                {t('transfers.fee_status')}
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main"
              >
                <option value="NONE">{t('transfers.discount_standard')}</option>
                <option value="FULL_EXEMPTION">{t('transfers.discount_full')}</option>
                <option value="PERCENTAGE">{t('transfers.discount_percent')}</option>
                <option value="FIXED_AMOUNT">{t('transfers.discount_fixed')}</option>
              </select>
            </div>

            {discountType !== 'NONE' && discountType !== 'FULL_EXEMPTION' && (
              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  {t('transfers.discount_value_label')} ({discountType === 'PERCENTAGE' ? '%' : t('transfers.currency')})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main"
                />
              </div>
            )}
          </div>

          {/* Atomic Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>{t('transfers.atomic_title')} </strong>
              {t('transfers.atomic_warning')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:text-text-main bg-surface hover:bg-surface-hover rounded-xl border border-border transition-colors"
            >
              {t('transfers.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || destinationGroups.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-xl shadow-lg shadow-primary/25 transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{submitting ? t('transfers.transferring') : t('transfers.confirm_btn')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

