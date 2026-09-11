import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { 
  User, 
  Clock, 
  Calendar, 
  Phone, 
  Award, 
  ArrowLeftRight, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Layers, 
  Wallet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  ChevronRight, 
  TrendingUp,
  Percent,
  Edit3,
  Trash2,
  Camera,
  Image,
  X,
  AlertTriangle
} from 'lucide-react';
import TransferModal from '../components/TransferModal';
import ReceiptModal from '../components/ReceiptModal';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { t, isRtl, dir } = useLanguage();
  const { settings, fetchSettings } = useSettings();

  useEffect(() => {
    if (fetchSettings) {
      fetchSettings();
    }
  }, [fetchSettings]);

  const toBool = (val) => val === true || val === 1 || val === '1' || val === 'true';
  const isQuranEnabled = toBool(settings?.enable_quran_track);
  const isPreschoolEnabled = toBool(settings?.enable_preschool_track);
  const isTutoringEnabled = toBool(settings?.enable_tutoring_track);

  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('TIMELINE'); // 'TIMELINE' | 'ENROLLMENTS' | 'EVALUATIONS' | 'ATTENDANCE' | 'FINANCE'

  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedEnrollmentForTransfer, setSelectedEnrollmentForTransfer] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState(null);

  // Edit Student State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    dob: '',
    gender: 'MALE',
    academic_level: '',
    guardian_name: '',
    guardian_phone: '',
    photo_url: '',
    notes: ''
  });
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Student State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const fetchDossier = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/${id}/history`);
      if (res.success) {
        setDossier(res.data);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showNotification, t]);

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

  const hasEvaluationsTab = isQuranEnabled;

  useEffect(() => {
    if (!hasEvaluationsTab && activeTab === 'EVALUATIONS') {
      setActiveTab('TIMELINE');
    }
  }, [hasEvaluationsTab, activeTab]);

  const displayTimeline = useMemo(() => {
    const timeline = dossier?.timeline;
    if (!timeline) return [];
    return timeline.filter(item => {
      if (item.type === 'TAHFIZ_EVALUATION' && !isQuranEnabled) return false;
      if (item.type === 'PRESCHOOL_EVALUATION' && !isPreschoolEnabled) return false;
      if (item.type === 'TUTORING_GRADE' && !isTutoringEnabled) return false;
      return true;
    });
  }, [dossier?.timeline, isQuranEnabled, isPreschoolEnabled, isTutoringEnabled]);

  const enrollmentsCount = dossier?.enrollments?.length || 0;
  const paymentsCount = dossier?.payments?.length || 0;

  const profileTabs = useMemo(() => {
    const list = [
      { id: 'TIMELINE', label: t('student_profile.tab_timeline'), icon: Clock },
      { id: 'ENROLLMENTS', label: t('student_profile.tab_enrollments', { count: enrollmentsCount }), icon: Layers },
    ];
    if (hasEvaluationsTab) {
      list.push({ id: 'EVALUATIONS', label: t('student_profile.tab_evaluations'), icon: Award });
    }
    list.push(
      { id: 'ATTENDANCE', label: t('student_profile.tab_attendance'), icon: Percent },
      { id: 'FINANCE', label: t('student_profile.tab_finance', { count: paymentsCount }), icon: Wallet }
    );
    return list;
  }, [hasEvaluationsTab, enrollmentsCount, paymentsCount, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-muted font-bold text-base">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!dossier || !dossier.student) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-black text-text-main">{t('student_profile.not_found_title')}</h2>
        <p className="text-xs text-text-muted">{t('student_profile.not_found_desc')}</p>
        <Link to="/students" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs">
          {t('student_profile.return_btn')}
        </Link>
      </div>
    );
  }

  const { student, summary, enrollments, transfers, tahfizLogs, preschoolLogs, tutoringGrades, yearlyAttendanceRates, payments, timeline } = dossier;

  const handleOpenEdit = () => {
    setEditFormData({
      full_name: student.full_name || '',
      dob: student.dob ? student.dob.split('T')[0] : '',
      gender: student.gender || 'MALE',
      academic_level: student.academic_level || '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      photo_url: student.photo_url || '',
      notes: student.notes || ''
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(student.photo_url || null);
    setEditModalOpen(true);
  };

  const handleEditPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification(t('teachers.photo_size_warning', 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت'), 'warning');
      return;
    }

    setEditPhotoFile(file);
    const localUrl = URL.createObjectURL(file);
    setEditPhotoPreview(localUrl);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.guardian_phone) {
      showNotification(t('students.name_required'), 'warning');
      return;
    }

    try {
      setSavingEdit(true);
      let finalPhotoUrl = editFormData.photo_url || '';

      if (editPhotoFile) {
        setUploadingEditPhoto(true);
        const data = new FormData();
        data.append('type', 'students');
        data.append('file', editPhotoFile);

        const uploadRes = await api.post('/settings/upload-assets?type=students', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes?.success && uploadRes?.url) {
          finalPhotoUrl = uploadRes.url;
        }
      }

      const res = await api.put(`/students/${student.id}`, {
        ...editFormData,
        photo_url: finalPhotoUrl
      });
      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setEditModalOpen(false);
        setEditPhotoFile(null);
        fetchDossier();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setUploadingEditPhoto(false);
      setSavingEdit(false);
    }
  };

  const handleOpenDelete = () => {
    const activeEnrollments = (enrollments || []).filter(en => en.status === 'ACTIVE');
    if (activeEnrollments.length > 0) {
      const groupNames = activeEnrollments.map(e => `"${e.group_name}"`).join(isRtl ? '، ' : ', ');
      showNotification(t('student_profile.cannot_delete_title') + ' ' + groupNames, 'warning');
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeletingStudent(true);
      const res = await api.delete(`/students/${student.id}`);
      if (res.success) {
        showNotification(res.message || t('common.deleted'), 'success');
        navigate('/students');
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setDeletingStudent(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
          <Link to="/students" className="hover:text-primary transition-colors">
            {t('student_profile.breadcrumb_back')}
          </Link>
          <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          <span className="text-text-main">{student.full_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-card hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold border border-border hover:border-blue-600 transition-all shadow-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>{t('student_profile.edit_btn')}</span>
          </button>

          {(() => {
            const activeEnrollments = (enrollments || []).filter(en => en.status === 'ACTIVE');
            const hasActive = activeEnrollments.length > 0;
            return (
              <button
                type="button"
                onClick={handleOpenDelete}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                  hasActive
                    ? 'bg-surface-card/50 text-text-muted/60 border-border cursor-not-allowed hover:border-amber-500/50 hover:text-amber-500'
                    : 'bg-surface-card hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border-border hover:border-rose-600'
                }`}
                title={
                  hasActive
                    ? t('student_profile.delete_disabled_btn')
                    : t('student_profile.delete_btn')
                }
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('student_profile.delete_btn')}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="p-4 sm:p-6 lg:p-8 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-sm space-y-5 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-start gap-4">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="w-20 h-20 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-primary shadow-lg shadow-primary/20 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-3xl sm:text-2xl font-black font-cairo shadow-lg shadow-primary/20 flex-shrink-0">
                {student.full_name.charAt(0)}
              </div>
            )}
            <div className="space-y-2 sm:space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-text-main font-cairo">
                  {student.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {student.reg_no}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-surface text-text-muted border border-border">
                  {student.academic_level || t('student_profile.general_level')}
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs text-text-muted pt-1 flex-wrap">
                <span className="bg-surface px-2.5 py-1 rounded-lg border border-border/60">
                  {t('student_profile.dob_label')} <strong className="font-mono">{DateTimeFormatter.formatDate(student.dob, t('student_profile.unspecified'))}</strong>
                </span>
                <span className="bg-surface px-2.5 py-1 rounded-lg border border-border/60">
                  {t('student_profile.guardian_label')} <strong>{student.guardian_name || '-'}</strong>
                </span>
                {student.guardian_phone && (
                  <a 
                    href={`tel:${student.guardian_phone}`}
                    className="inline-flex items-center gap-1.5 font-mono text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{student.guardian_phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Highlights */}
          <div className={`grid grid-cols-2 ${isQuranEnabled ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2.5 sm:gap-3 w-full lg:w-auto`}>
            {isQuranEnabled && (
              <div className="p-3 bg-surface rounded-2xl text-center border border-border">
                <span className="text-[11px] text-text-muted block">{t('student_profile.quick_stats_hizb')}</span>
                <span className="text-xl font-black text-emerald-600 font-cairo">
                  {t('student_profile.hizb_count', { count: summary.maxMemorizedHizb })}
                </span>
              </div>
            )}
            <div className="p-3 bg-surface rounded-2xl text-center border border-border">
              <span className="text-[11px] text-text-muted block">{t('student_profile.quick_stats_sessions')}</span>
              <span className="text-xl font-black text-primary font-cairo">
                {(isQuranEnabled ? summary.totalTahfizSessions : 0) + summary.totalTutoringExams + summary.totalPreschoolEvaluations}
              </span>
            </div>
            <div className="p-3 bg-surface rounded-2xl text-center border border-border">
              <span className="text-[11px] text-text-muted block">{t('student_profile.quick_stats_transfers')}</span>
              <span className="text-xl font-black text-amber-600 font-cairo">{summary.totalTransfers}</span>
            </div>
            <div className={`p-3 bg-surface rounded-2xl text-center border border-border ${!isQuranEnabled ? 'col-span-2 sm:col-span-1' : ''}`}>
              <span className="text-[11px] text-text-muted block">
                {summary.currentDebt > 0 ? t('student_profile.unpaid_dues_label') : t('student_profile.quick_stats_fees')}
              </span>
              <span className={`text-xl font-black font-cairo ${summary.currentDebt > 0 ? 'text-rose-600' : 'text-purple-600'}`}>
                {summary.currentDebt > 0 ? `${summary.currentDebt.toLocaleString()} ${t('common.currency')}` : `${summary.totalPaid.toLocaleString()} ${t('common.currency')}`}
              </span>
              {summary.currentDebt > 0 && (
                <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                  {t('student_profile.unpaid_status_badge')} ({summary.unpaidEnrollments?.[0]?.month_ref})
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Profile Sections / Tabs Navigation: 2-column grid on mobile, full grid on desktop */}
      <div className="p-1.5 bg-surface border border-border rounded-2xl sm:rounded-3xl shadow-sm">
        <div className={`grid ${profileTabs.length === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} gap-1.5 sm:gap-2`}>
          {profileTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isFullWidthMobile = profileTabs.length % 2 === 1 && idx === profileTabs.length - 1;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all select-none ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-black'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-card bg-transparent'
                } ${isFullWidthMobile ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-primary'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Interactive Multi-Year Lifetime Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold text-text-main">{t('student_profile.timeline_title')}</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {t('student_profile.timeline_subtitle')}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {t('student_profile.events_count', { count: displayTimeline.length })}
            </span>
          </div>

          <div className={`relative ${isRtl ? 'pr-5 sm:pr-6 border-r-2 mr-2 sm:mr-3' : 'pl-5 sm:pl-6 border-l-2 ml-2 sm:ml-3'} border-primary/30 space-y-6 sm:space-y-8`}>
            {displayTimeline.length === 0 ? (
              <p className="text-sm text-text-muted py-6">{t('student_profile.no_events')}</p>
            ) : (
              displayTimeline.map((item) => {
                const isEnrollment = item.type === 'ENROLLMENT';
                const isTransferOut = item.type === 'TRANSFER_OUT';
                const isOfficialTransfer = item.type === 'TRANSFER_EVENT';
                const isTahfiz = item.type === 'TAHFIZ_EVALUATION';
                const isPreschool = item.type === 'PRESCHOOL_EVALUATION';
                const isTutoring = item.type === 'TUTORING_GRADE';

                return (
                  <div key={item.id} className="relative group">
                    
                    {/* Timeline Node Dot */}
                    <div className={`absolute ${isRtl ? '-right-[27px] sm:-right-[31px]' : '-left-[27px] sm:-left-[31px]'} top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-surface-card ${
                      isOfficialTransfer || isTransferOut
                        ? 'bg-amber-500 ring-4 ring-amber-500/20'
                        : isTahfiz
                        ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                        : isPreschool
                        ? 'bg-purple-500 ring-4 ring-purple-500/20'
                        : isTutoring
                        ? 'bg-blue-500 ring-4 ring-blue-500/20'
                        : 'bg-primary ring-4 ring-primary/20'
                    }`}></div>

                    {/* Timeline Event Card */}
                    <div className="p-3.5 sm:p-4 bg-surface rounded-2xl border border-border/80 hover:border-primary/40 transition-all shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            isOfficialTransfer || isTransferOut
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : isTahfiz
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : isPreschool
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                              : isTutoring
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              : 'bg-primary/15 text-primary'
                          }`}>
                            {isOfficialTransfer
                              ? t('student_profile.event_official_transfer')
                              : isTransferOut
                              ? t('student_profile.event_transfer_out')
                              : isEnrollment
                              ? t('student_profile.event_enrollment')
                              : isTahfiz
                              ? t('student_profile.event_tahfiz')
                              : isPreschool
                              ? t('student_profile.event_preschool')
                              : t('student_profile.event_tutoring')}
                          </span>
                          <span className="text-xs font-bold text-text-muted">
                            {t('student_profile.academic_year_label', { year: item.year })}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-text-muted">
                          {DateTimeFormatter.formatDate(item.date)}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-text-main">
                        {item.title}
                      </h4>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        {item.subtitle}
                      </p>

                      {item.notes && (
                        <p className="text-xs text-text-main mt-2 p-2 bg-surface-card rounded-lg border border-border/50">
                          {item.notes}
                        </p>
                      )}

                      {item.details && (
                        <div className="text-[11px] font-bold text-primary mt-2">
                          {item.details}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Enrollments & Cohorts History */}
      {activeTab === 'ENROLLMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-main">{t('student_profile.enrollments_title')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((en) => {
              const isActive = en.status === 'ACTIVE';
              const isTransferred = en.status === 'TRANSFERRED';

              return (
                <div key={en.id} className="p-5 bg-surface-card border border-border rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">
                      {t('student_profile.academic_year_label', { year: en.academic_year_label })}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {isActive ? t('student_profile.status_active') : isTransferred ? t('student_profile.status_transferred') : t('student_profile.status_completed')}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-extrabold text-text-main">{en.group_name}</h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t('student_profile.teacher_supervisor')} <strong>{en.teacher_name || t('student_profile.unspecified')}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/60 text-xs space-y-1.5 text-text-muted">
                    <div>{t('student_profile.enroll_date')} <strong className="font-mono">{DateTimeFormatter.formatDate(en.enrolled_at)}</strong></div>
                    {en.ended_at && <div>{t('student_profile.end_date')} <strong className="font-mono">{DateTimeFormatter.formatDate(en.ended_at)}</strong></div>}
                    {en.transfer_reason && (
                      <div className="text-amber-600 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                        {t('student_profile.transfer_reason', { reason: en.transfer_reason })}
                      </div>
                    )}
                    <div className="text-primary font-bold">
                      {en.discount_type === 'FULL_EXEMPTION' ? t('student_profile.exemption_full') : en.is_free ? t('student_profile.free_group') : t('student_profile.monthly_fee', { fee: parseFloat(en.monthly_fee).toLocaleString() })}
                    </div>
                  </div>

                  {isActive && (
                    <div className="pt-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEnrollmentForTransfer(en);
                          setTransferModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>{t('student_profile.transfer_now_btn')}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Evaluations (Tahfiz, PreSchool, Tutoring) */}
      {hasEvaluationsTab && activeTab === 'EVALUATIONS' && (
        <div className="space-y-5 sm:space-y-6">
          
          {/* Quranic Tahfiz progression */}
          {isQuranEnabled && tahfizLogs.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <BookOpen className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-bold text-text-main">{t('student_profile.tahfiz_title')}</h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-surface text-text-muted font-bold">
                    <tr>
                      <th className="p-3 text-start">{t('student_profile.table_date')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_group')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_type')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_range')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_ahzab')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_grade')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_sheikh_notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tahfizLogs.map((tItem) => (
                      <tr key={tItem.id} className="hover:bg-surface/50">
                        <td className="p-3 font-mono">{tItem.date?.split('T')[0]}</td>
                        <td className="p-3 font-bold">{tItem.group_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tItem.type === 'MEMORIZATION' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                          }`}>
                            {tItem.type === 'MEMORIZATION' ? t('student_profile.type_new_memo') : t('student_profile.type_revision')}
                          </span>
                        </td>
                        <td className="p-3">
                          {t('student_profile.range_from_to', { from: tItem.surah_from, to: tItem.surah_to })}
                        </td>
                        <td className="p-3 font-mono">{tItem.hizb_from || '-'} {t('common.to', 'إلى')} {tItem.hizb_to || '-'}</td>
                        <td className="p-3 font-bold text-emerald-600">{tItem.grade}</td>
                        <td className="p-3 text-text-muted">{tItem.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {tahfizLogs.map((tItem) => (
                  <div key={tItem.id} className="p-4 bg-surface rounded-2xl border border-border space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-main text-sm">{tItem.group_name}</span>
                      <span className="font-mono text-text-muted text-[11px]">{tItem.date?.split('T')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tItem.type === 'MEMORIZATION' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {tItem.type === 'MEMORIZATION' ? t('student_profile.type_new_memo') : t('student_profile.type_revision')}
                      </span>
                      <span className="text-text-muted">{t('student_profile.range_from_to', { from: tItem.surah_from, to: tItem.surah_to })}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-text-muted font-mono">{t('student_profile.table_ahzab')}: {tItem.hizb_from || '-'} {t('common.to', 'إلى')} {tItem.hizb_to || '-'}</span>
                      <span className="font-bold text-emerald-600 text-sm font-mono">{t('student_profile.table_grade')}: {tItem.grade}</span>
                    </div>
                    {tItem.notes && (
                      <p className="text-[11px] text-text-muted bg-surface-card p-2 rounded-xl border border-border/60">
                        {tItem.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PreSchool logs */}
          {preschoolLogs.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Baby className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-bold text-text-main">{t('student_profile.preschool_title')}</h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-surface text-text-muted font-bold">
                    <tr>
                      <th className="p-3 text-start">{t('student_profile.table_date')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_category')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_activity')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_rating')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_behavior')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preschoolLogs.map((p) => (
                      <tr key={p.id} className="hover:bg-surface/50">
                        <td className="p-3 font-mono">{p.date?.split('T')[0]}</td>
                        <td className="p-3 font-bold">{p.skill_category}</td>
                        <td className="p-3">{p.activity_title || '-'}</td>
                        <td className="p-3 font-bold text-purple-600">{p.score_rating}</td>
                        <td className="p-3 text-text-muted">{p.behavior_note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {preschoolLogs.map((p) => (
                  <div key={p.id} className="p-4 bg-surface rounded-2xl border border-border space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-main text-sm">{p.skill_category}</span>
                      <span className="font-mono text-text-muted text-[11px]">{p.date?.split('T')[0]}</span>
                    </div>
                    {p.activity_title && (
                      <div className="text-text-muted">
                        <span className="text-[10px] block">{t('student_profile.table_activity')}</span>
                        <span className="font-bold text-text-main">{p.activity_title}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-text-muted">{t('student_profile.table_rating')}</span>
                      <span className="font-bold text-purple-600 text-sm font-mono">{p.score_rating}</span>
                    </div>
                    {p.behavior_note && (
                      <p className="text-[11px] text-text-muted bg-surface-card p-2 rounded-xl border border-border/60">
                        {p.behavior_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tutoring Grades */}
          {tutoringGrades.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <GraduationCap className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-bold text-text-main">{t('student_profile.tutoring_title')}</h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-surface text-text-muted font-bold">
                    <tr>
                      <th className="p-3 text-start">{t('student_profile.table_exam_date')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_subject')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_exam_title')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_score')}</th>
                      <th className="p-3 text-start">{t('student_profile.table_teacher_notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tutoringGrades.map((g) => (
                      <tr key={g.id} className="hover:bg-surface/50">
                        <td className="p-3 font-mono">{g.exam_date?.split('T')[0]}</td>
                        <td className="p-3 font-bold">{g.group_name} ({g.subject_name || '-'})</td>
                        <td className="p-3 font-bold">{g.exam_title}</td>
                        <td className="p-3 font-mono font-bold text-blue-600 text-sm">
                          {g.score} / {g.max_score}
                        </td>
                        <td className="p-3 text-text-muted">{g.teacher_notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {tutoringGrades.map((g) => (
                  <div key={g.id} className="p-4 bg-surface rounded-2xl border border-border space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-main text-sm">{g.group_name} ({g.subject_name || '-'})</span>
                      <span className="font-mono text-text-muted text-[11px]">{g.exam_date?.split('T')[0]}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">{t('student_profile.table_exam_title')}</span>
                      <span className="font-bold text-text-main">{g.exam_title}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-text-muted">{t('student_profile.table_score')}</span>
                      <span className="font-mono font-bold text-blue-600 text-sm">{g.score} / {g.max_score}</span>
                    </div>
                    {g.teacher_notes && (
                      <p className="text-[11px] text-text-muted bg-surface-card p-2 rounded-xl border border-border/60">
                        {g.teacher_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab 4: Attendance Stats per Academic Year */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-text-main">{t('student_profile.attendance_title')}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t('student_profile.attendance_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {yearlyAttendanceRates.map((rate, idx) => (
              <div key={idx} className="p-4 sm:p-5 bg-surface rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-main">
                    {t('student_profile.academic_year_label', { year: rate.yearLabel })}
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-600">
                    {rate.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3 bg-surface-card rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${rate.percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2">
                  <div className="p-2 bg-surface-card rounded-xl">
                    <span className="text-[10px] text-text-muted block">{t('student_profile.att_present')}</span>
                    <span className="font-bold text-emerald-600">{rate.present}</span>
                  </div>
                  <div className="p-2 bg-surface-card rounded-xl">
                    <span className="text-[10px] text-text-muted block">{t('student_profile.att_late')}</span>
                    <span className="font-bold text-amber-600">{rate.late}</span>
                  </div>
                  <div className="p-2 bg-surface-card rounded-xl">
                    <span className="text-[10px] text-text-muted block">{t('student_profile.att_excused')}</span>
                    <span className="font-bold text-blue-600">{rate.excused}</span>
                  </div>
                  <div className="p-2 bg-surface-card rounded-xl">
                    <span className="text-[10px] text-text-muted block">{t('student_profile.att_unexcused')}</span>
                    <span className="font-bold text-rose-600">{rate.unexcused}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Complete Financial Statement */}
      {activeTab === 'FINANCE' && (
        <div className="bg-surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold text-text-main">{t('student_profile.finance_title')}</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {t('student_profile.finance_subtitle')}
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full self-start sm:self-auto border border-emerald-500/20">
              {t('student_profile.finance_total_paid', { total: summary.totalPaid.toLocaleString() })}
            </div>
          </div>

          {/* Active Debt Alert Banner if any unpaid dues */}
          {summary.currentDebt > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                    {t('student_profile.unpaid_banner_title')}: <span className="font-mono font-extrabold">{summary.currentDebt.toLocaleString()} {t('common.currency')}</span>
                  </h4>
                  <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-0.5">
                    {summary.unpaidEnrollments?.map(u => `${u.group_name} (${u.month_ref})`).join(isRtl ? '، ' : ', ')}
                  </p>
                </div>
              </div>
              <Link
                to="/finance"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors text-center shrink-0"
              >
                {t('student_profile.go_to_finance_btn')}
              </Link>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface text-text-muted font-bold">
                <tr>
                  <th className="p-3 text-start">{t('student_profile.table_receipt_no')}</th>
                  <th className="p-3 text-start">{t('student_profile.table_academic_year')}</th>
                  <th className="p-3 text-start">{t('student_profile.table_month')}</th>
                  <th className="p-3 text-start">{t('student_profile.table_group')}</th>
                  <th className="p-3 text-start">{t('student_profile.table_amount')}</th>
                  <th className="p-3 text-start">{t('student_profile.table_status')}</th>
                  <th className="p-3 text-start">{t('student_profile.table_date')}</th>
                  <th className="p-3 text-center">{t('student_profile.table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-text-muted">
                      {t('student_profile.no_payments')}
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isExempt = p.payment_status === 'EXEMPTED';
                    return (
                      <tr key={p.id} className="hover:bg-surface/50">
                        <td className="p-3 font-mono font-bold text-primary">{p.receipt_no}</td>
                        <td className="p-3">{p.academic_year_label}</td>
                        <td className="p-3 font-bold">{p.month_ref}</td>
                        <td className="p-3">{p.group_name}</td>
                        <td className="p-3 font-mono font-bold">
                          {isExempt ? `0.00 ${t('common.currency')}` : `${parseFloat(p.amount).toLocaleString()} ${t('common.currency')}`}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isExempt ? 'bg-emerald-500/15 text-emerald-700' : 'bg-blue-500/15 text-blue-700'
                          }`}>
                            {isExempt ? t('student_profile.status_exempt') : t('student_profile.status_paid')}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-text-muted">{DateTimeFormatter.formatDate(p.payment_date)}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPaymentForReceipt({
                                ...p,
                                student_name: student.full_name,
                                reg_no: student.reg_no
                              });
                              setReceiptModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-text-main border border-border transition-colors"
                            title={t('student_profile.preview_receipt')}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {payments.length === 0 ? (
              <p className="p-6 text-center text-text-muted text-xs">{t('student_profile.no_payments')}</p>
            ) : (
              payments.map((p) => {
                const isExempt = p.payment_status === 'EXEMPTED';
                return (
                  <div key={p.id} className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">{p.receipt_no}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isExempt ? 'bg-emerald-500/15 text-emerald-700' : 'bg-blue-500/15 text-blue-700'
                        }`}>
                          {isExempt ? t('student_profile.status_exempt') : t('student_profile.status_paid')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaymentForReceipt({
                            ...p,
                            student_name: student.full_name,
                            reg_no: student.reg_no
                          });
                          setReceiptModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card hover:bg-primary hover:text-white text-text-main border border-border text-xs font-bold transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('student_profile.preview_receipt')}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('student_profile.table_group')}</span>
                        <span className="font-bold text-text-main">{p.group_name}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('student_profile.table_month')}</span>
                        <span className="font-bold font-mono text-text-main">{p.month_ref}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <span className="font-mono text-text-muted">{DateTimeFormatter.formatDate(p.payment_date)}</span>
                      <span className="font-mono font-bold text-sm text-text-main">
                        {isExempt ? `0.00 ${t('common.currency')}` : `${parseFloat(p.amount).toLocaleString()} ${t('common.currency')}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalOpen && (
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          student={student}
          currentEnrollment={selectedEnrollmentForTransfer}
          onSuccess={fetchDossier}
        />
      )}

      {/* Receipt Modal */}
      {receiptModalOpen && (
        <ReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          payment={selectedPaymentForReceipt}
        />
      )}

      {/* Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('student_profile.edit_modal_title')}</h3>
                  <p className="text-xs text-text-muted">{t('student_profile.edit_modal_subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Photo Upload */}
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-card border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-text-muted" />
                  )}
                  {uploadingEditPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-bold text-text-main block mb-1">{t('student_profile.student_photo')}</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-border text-xs font-bold text-text-main hover:bg-surface cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5 text-text-muted" />
                    <span>{uploadingEditPhoto ? t('student_profile.saving') : t('student_profile.change_photo')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoSelect}
                      disabled={uploadingEditPhoto}
                      className="hidden"
                    />
                  </label>
                  {editPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditPhotoPreview(null);
                        setEditPhotoFile(null);
                        setEditFormData(prev => ({ ...prev, photo_url: '' }));
                      }}
                      className="text-xs text-rose-500 mx-2 hover:underline"
                    >
                      {t('student_profile.remove_photo')}
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('student_profile.full_name')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('student_profile.dob')}</label>
                  <input
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('student_profile.gender')}</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:border-primary outline-none"
                  >
                    <option value="MALE">{t('student_profile.gender_male')}</option>
                    <option value="FEMALE">{t('student_profile.gender_female')}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1">{t('student_profile.academic_level')}</label>
                  <input
                    type="text"
                    placeholder={t('student_profile.academic_level_placeholder')}
                    value={editFormData.academic_level}
                    onChange={(e) => setEditFormData({ ...editFormData, academic_level: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Guardian Info */}
              <div className="p-3 bg-surface/50 rounded-xl border border-border space-y-3">
                <span className="text-xs font-black text-text-muted block">{t('student_profile.guardian_section')}</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">{t('student_profile.guardian_name')}</label>
                    <input
                      type="text"
                      value={editFormData.guardian_name}
                      onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                      className="w-full p-2 bg-surface-card border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">
                      {t('student_profile.guardian_phone')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={editFormData.guardian_phone}
                      onChange={(e) => setEditFormData({ ...editFormData, guardian_phone: e.target.value })}
                      className="w-full p-2 bg-surface-card border border-border rounded-xl text-xs font-mono text-text-main focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('student_profile.extra_notes')}</label>
                <textarea
                  rows="2"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('student_profile.saving')}</span>
                    </>
                  ) : (
                    <span>{t('student_profile.save_changes')}</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('student_profile.delete_modal_title')}</h3>
                  <p className="text-xs text-rose-500">{t('student_profile.delete_sensitive')}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {(() => {
                const activeEnrollments = (enrollments || []).filter(en => en.status === 'ACTIVE');
                if (activeEnrollments.length > 0) {
                  return (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{t('student_profile.cannot_delete_title')}</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {t('student_profile.cannot_delete_enrolled')}
                      </p>
                      <ul className="list-disc list-inside text-xs font-bold space-y-1">
                        {activeEnrollments.map((en, i) => (
                          <li key={i}>{en.group_name}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-text-muted pt-1">
                        {t('student_profile.cannot_delete_hint')}
                      </p>
                    </div>
                  );
                }

                return (
                  <div>
                    <p className="text-xs leading-relaxed text-text-main">
                      {t('student_profile.delete_confirm_text', { name: student.full_name })}
                    </p>
                    <p className="text-[11px] text-text-muted mt-2">
                      {t('student_profile.delete_permanent_warning')}
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                {(() => {
                  const hasActive = (enrollments || []).some(en => en.status === 'ACTIVE');
                  if (hasActive) {
                    return (
                      <button
                        type="button"
                        disabled
                        className="px-5 py-2 text-xs font-bold text-text-muted bg-surface/50 rounded-xl border border-border cursor-not-allowed opacity-50"
                      >
                        {t('student_profile.delete_disabled_btn')}
                      </button>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={deletingStudent}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50"
                    >
                      {deletingStudent ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('student_profile.deleting')}</span>
                        </>
                      ) : (
                        <span>{t('student_profile.confirm_delete_final')}</span>
                      )}
                    </button>
                  );
                })()}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
