import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Layers, 
  Users, 
  CalendarCheck, 
  ClipboardCheck, 
  ArrowLeftRight, 
  Plus, 
  UserPlus, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Clock, 
  MapPin, 
  Check, 
  ChevronRight,
  Save,
  Award,
  UserCheck,
  UserX,
  AlertTriangle,
  Edit3,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  Play,
  Pause,
  RotateCcw,
  Archive
} from 'lucide-react';
import TransferModal from '../components/TransferModal';
import SearchableSelect from '../components/SearchableSelect';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function GroupDetailsPage() {
  const { id } = useParams();
  const { showNotification, confirm } = useNotification();
  const { t, isRtl, dir } = useLanguage();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ROSTER'); // 'ROSTER' | 'ATTENDANCE' | 'EVALUATION'

  // Teachers List for Substitution & Reassignment
  const [allTeachers, setAllTeachers] = useState([]);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [newPrimaryTeacherId, setNewPrimaryTeacherId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Classrooms List & Reassign Room
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [changeRoomModalOpen, setChangeRoomModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [changingRoom, setChangingRoom] = useState(false);

  // Temporary Date Range Substitution state
  const [rangeSubModalOpen, setRangeSubModalOpen] = useState(false);
  const [rangeSubTeacherId, setRangeSubTeacherId] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState(() => DateTimeFormatter.toInputDate());
  const [rangeEndDate, setRangeEndDate] = useState(() => DateTimeFormatter.toInputDate());
  const [rangeSubNotes, setRangeSubNotes] = useState('');
  const [rangeSaving, setRangeSaving] = useState(false);

  // Teacher Attendance & Substitution for Session
  const [teacherAttendance, setTeacherAttendance] = useState({
    status: 'PRESENT',
    substitute_teacher_id: '',
    notes: '',
    teacher_name: '',
    teacher_photo: null,
    substitute_teacher_name: null,
    substitute_teacher_photo: null
  });
  const [savingTeacherAttendance, setSavingTeacherAttendance] = useState(false);

  // Student Attendance state
  const [attendanceDate, setAttendanceDate] = useState(() => DateTimeFormatter.toInputDate());
  const [attendanceList, setAttendanceList] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState(null);
  const [selectedEnrollmentForTransfer, setSelectedEnrollmentForTransfer] = useState(null);

  // Direct Enroll modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [enrollDiscountType, setEnrollDiscountType] = useState('NONE');
  const [enrollDiscountValue, setEnrollDiscountValue] = useState(0);

  // Filter out students who are already actively enrolled in this group
  const enrolledStudentIds = useMemo(() => {
    return new Set((group?.students || [])
      .filter(s => s.enrollment_status === 'ACTIVE')
      .map(s => s.id)
    );
  }, [group?.students]);

  const availableStudentsForEnroll = useMemo(() => {
    return allStudents.filter(s => !enrolledStudentIds.has(s.id));
  }, [allStudents, enrolledStudentIds]);

  // Evaluation state
  const [evalStudentEnrollmentId, setEvalStudentEnrollmentId] = useState('');
  const [evalDate, setEvalDate] = useState(() => DateTimeFormatter.toInputDate());
  // Halaqa fields
  const [evalTahfizType, setEvalTahfizType] = useState('MEMORIZATION');
  const [evalSurahFrom, setEvalSurahFrom] = useState('');
  const [evalSurahTo, setEvalSurahTo] = useState('');
  const [evalHizbFrom, setEvalHizbFrom] = useState('');
  const [evalHizbTo, setEvalHizbTo] = useState('');
  const [evalTahfizGrade, setEvalTahfizGrade] = useState('MUMTAZ');
  const [evalTahfizNotes, setEvalTahfizNotes] = useState('');
  // PreSchool fields
  const [evalSkillCategory, setEvalSkillCategory] = useState('LETTERS');
  const [evalActivityTitle, setEvalActivityTitle] = useState('');
  const [evalScoreRating, setEvalScoreRating] = useState('EXCELLENT');
  const [evalBehaviorNote, setEvalBehaviorNote] = useState('');
  // Tutoring fields
  const [evalExamTitle, setEvalExamTitle] = useState('');
  const [evalScore, setEvalScore] = useState('');
  const [evalMaxScore, setEvalMaxScore] = useState(20);
  const [evalTeacherNotes, setEvalTeacherNotes] = useState('');

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/groups/${id}`);
      if (res.success) {
        setGroup(res.data);
        if (res.data.students?.length > 0 && !evalStudentEnrollmentId) {
          setEvalStudentEnrollmentId(res.data.students[0].enrollment_id);
        }
      }
    } catch (err) {
      showNotification(err.message || 'فشل جلب تفاصيل الفوج', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showNotification]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  // Load All Teachers for Substitution & Reassignment
  const fetchTeachers = useCallback(async () => {
    try {
      const res = await api.get('/teachers');
      if (res.success) {
        setAllTeachers(res.data);
      }
    } catch (err) {
      console.error('Failed to load teachers:', err);
    }
  }, []);

  // Load All Classrooms for Room Reassignment
  const fetchClassrooms = useCallback(async () => {
    try {
      const res = await api.get('/classrooms');
      if (res.success) {
        setAllClassrooms(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchClassrooms();
  }, [fetchTeachers, fetchClassrooms]);

  // Load Teacher Attendance for this group & date
  const fetchTeacherAttendance = useCallback(async () => {
    if (!group?.id) return;
    try {
      const res = await api.get(`/attendance/teacher/group/${group.id}?date=${attendanceDate}`);
      if (res.success && res.data) {
        setTeacherAttendance({
          status: res.data.status || 'PRESENT',
          substitute_teacher_id: res.data.substitute_teacher_id ? String(res.data.substitute_teacher_id) : '',
          notes: res.data.notes || '',
          teacher_name: res.data.teacher_name,
          teacher_photo: res.data.teacher_photo,
          substitute_teacher_name: res.data.substitute_teacher_name,
          substitute_teacher_photo: res.data.substitute_teacher_photo
        });
      }
    } catch (err) {
      console.error('Failed to load teacher attendance:', err);
    }
  }, [group?.id, attendanceDate]);

  // Load Attendance when date or tab changes
  useEffect(() => {
    if (activeTab === 'ATTENDANCE' && group?.id) {
      const fetchAttendance = async () => {
        try {
          const res = await api.get(`/attendance/group/${group.id}?date=${attendanceDate}`);
          if (res.success) {
            setAttendanceList(res.data);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchAttendance();
      fetchTeacherAttendance();
    }
  }, [activeTab, attendanceDate, group?.id, fetchTeacherAttendance]);

  // Load available students for enroll modal
  useEffect(() => {
    if (enrollModalOpen) {
      setSelectedStudentId('');
      const fetchStudents = async () => {
        try {
          const res = await api.get('/students');
          if (res.success) {
            setAllStudents(res.data || []);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchStudents();
    }
  }, [enrollModalOpen]);

  // Save Teacher Attendance & Substitution
  const handleSaveTeacherAttendance = async (silent = false) => {
    if (!group?.teacher_id) return;
    try {
      setSavingTeacherAttendance(true);
      const res = await api.post('/attendance/teacher', {
        teacher_id: group.teacher_id,
        group_id: group.id,
        date: attendanceDate,
        status: teacherAttendance.status,
        substitute_teacher_id: teacherAttendance.substitute_teacher_id ? parseInt(teacherAttendance.substitute_teacher_id, 10) : null,
        notes: teacherAttendance.notes || ''
      });
      if (res.success) {
        if (!silent) {
          showNotification(res.message || t('group_details.save_teacher_status'), 'success');
        }
        fetchTeacherAttendance();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setSavingTeacherAttendance(false);
    }
  };

  // Reassign Primary Teacher Permanently
  const handleReassignTeacher = async (e) => {
    e.preventDefault();
    try {
      setReassigning(true);
      const res = await api.put(`/groups/${group.id}`, {
        teacher_id: newPrimaryTeacherId ? parseInt(newPrimaryTeacherId, 10) : null
      });
      if (res.success) {
        showNotification(res.message || t('group_details.confirm_reassign_teacher'), 'success');
        setReassignModalOpen(false);
        fetchGroupDetails();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setReassigning(false);
    }
  };

  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Lifecycle Status Change (PENDING, ACTIVE, STOPPED, ARCHIVED)
  const handleStatusChange = async (newStatus) => {
    if (!group) return;

    const groupName = group.name || '';
    let title = t('confirm_dialog.title_status_change');
    let subtitle = t('confirm_dialog.subtitle_status_change');
    let message = t('confirm_dialog.start_group_msg', { name: groupName });
    let confirmText = t('confirm_dialog.confirm_btn');
    let variant = 'warning';
    let icon = null;

    if (newStatus === 'ACTIVE') {
      const isRestart = group.status === 'STOPPED';
      title = isRestart ? t('confirm_dialog.restart_group_title') : t('confirm_dialog.start_group_title');
      subtitle = t('confirm_dialog.subtitle_status_change');
      message = isRestart
        ? t('confirm_dialog.restart_group_msg', { name: groupName })
        : t('confirm_dialog.start_group_msg', { name: groupName });
      confirmText = isRestart ? t('group_details.restart_group') : t('group_details.start_group');
      variant = 'success';
      icon = isRestart ? 'rotate-ccw' : 'play';
    } else if (newStatus === 'STOPPED') {
      const isFromArchived = group.status === 'ARCHIVED';
      if (isFromArchived) {
        title = t('confirm_dialog.restore_group_title');
        subtitle = t('confirm_dialog.subtitle_status_change');
        message = t('confirm_dialog.restore_group_msg', { name: groupName });
        confirmText = t('group_details.restore_group');
        variant = 'info';
        icon = 'rotate-ccw';
      } else {
        title = t('confirm_dialog.stop_group_title');
        subtitle = t('confirm_dialog.subtitle_status_change');
        message = t('confirm_dialog.stop_group_msg', { name: groupName });
        confirmText = t('group_details.stop_group');
        variant = 'danger';
        icon = 'pause';
      }
    } else if (newStatus === 'ARCHIVED') {
      title = t('confirm_dialog.archive_group_title');
      subtitle = t('confirm_dialog.subtitle_status_change');
      message = t('confirm_dialog.archive_group_msg', { name: groupName });
      confirmText = t('group_details.archive_group');
      variant = 'warning';
      icon = 'archive';
    }

    const accepted = await confirm({
      title,
      subtitle,
      message,
      confirmText,
      cancelText: t('common.cancel'),
      variant,
      icon
    });

    if (!accepted) return;

    try {
      setUpdatingStatus(true);
      const res = await api.patch(`/groups/${group.id}/status`, { status: newStatus });
      if (res.success) {
        showNotification(res.message || t('tracks.group_status_updated_success'), 'success');
        fetchGroupDetails();
      }
    } catch (err) {
      showNotification(err.message || t('tracks.group_status_updated_failed'), 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Change Classroom for Group
  const handleChangeRoom = async (e) => {
    e.preventDefault();
    try {
      setChangingRoom(true);
      const res = await api.put(`/groups/${group.id}`, {
        room: newRoom || null
      });
      if (res.success) {
        showNotification(t('group_details.confirm_change_room'), 'success');
        setChangeRoomModalOpen(false);
        fetchGroupDetails();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setChangingRoom(false);
    }
  };

  // Save Temporary Substitution for Multiple Days (Date Range)
  const handleSaveRangeSubstitution = async (e) => {
    e.preventDefault();
    if (!rangeSubTeacherId || !rangeStartDate || !rangeEndDate) {
      showNotification(t('group_details.substitute_teacher_select'), 'warning');
      return;
    }
    try {
      setRangeSaving(true);
      const res = await api.post('/attendance/teacher/range', {
        teacher_id: group.teacher_id,
        group_id: group.id,
        substitute_teacher_id: parseInt(rangeSubTeacherId, 10),
        start_date: rangeStartDate,
        end_date: rangeEndDate,
        notes: rangeSubNotes || ''
      });
      if (res.success) {
        showNotification(res.message || t('group_details.confirm_range_sub'), 'success');
        setRangeSubModalOpen(false);
        fetchTeacherAttendance();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setRangeSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    try {
      setSavingAttendance(true);
      const records = attendanceList.map(a => ({
        enrollment_id: a.enrollment_id,
        status: a.status,
        notes: a.notes || ''
      }));

      const res = await api.post('/attendance/bulk', {
        date: attendanceDate,
        records
      });

      if (group?.teacher_id) {
        await handleSaveTeacherAttendance(true);
      }

      if (res.success) {
        showNotification(res.message || t('group_details.save_attendance'), 'success');
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAttendanceStatusChange = (enrollmentId, newStatus) => {
    setAttendanceList(prev => prev.map(item => {
      if (item.enrollment_id === enrollmentId) {
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  const handleOpenEnrollModal = () => {
    setSelectedStudentId('');
    setEnrollDiscountType('NONE');
    setEnrollDiscountValue(0);
    setEnrollModalOpen(true);
  };

  const handleCloseEnrollModal = () => {
    setEnrollModalOpen(false);
    setSelectedStudentId('');
    setEnrollDiscountType('NONE');
    setEnrollDiscountValue(0);
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showNotification(t('group_details.select_student_label'), 'warning');
      return;
    }

    try {
      const res = await api.post(`/groups/${group.id}/enroll`, {
        student_id: parseInt(selectedStudentId, 10),
        discount_type: enrollDiscountType,
        discount_value: parseFloat(enrollDiscountValue) || 0
      });

      if (res.success) {
        showNotification(res.message || t('group_details.confirm_enroll_btn'), 'success');
        setEnrollModalOpen(false);
        fetchGroupDetails();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evalStudentEnrollmentId) {
      showNotification(t('group_details.eval_target_student'), 'warning');
      return;
    }

    try {
      if (group.track_type === 'HALAQA') {
        if (!evalSurahFrom || !evalSurahTo) {
          showNotification(t('group_details.eval_from_surah'), 'warning');
          return;
        }
        await api.post('/evaluations/tahfiz', {
          enrollment_id: evalStudentEnrollmentId,
          date: evalDate,
          type: evalTahfizType,
          surah_from: evalSurahFrom,
          surah_to: evalSurahTo,
          hizb_from: evalHizbFrom ? parseFloat(evalHizbFrom) : null,
          hizb_to: evalHizbTo ? parseFloat(evalHizbTo) : null,
          grade: evalTahfizGrade,
          notes: evalTahfizNotes
        });
        showNotification(t('group_details.eval_submit_btn'), 'success');
      } else if (group.track_type === 'PRESCHOOL') {
        await api.post('/evaluations/preschool', {
          enrollment_id: evalStudentEnrollmentId,
          date: evalDate,
          skill_category: evalSkillCategory,
          activity_title: evalActivityTitle,
          score_rating: evalScoreRating,
          behavior_note: evalBehaviorNote
        });
        showNotification(t('group_details.eval_submit_btn'), 'success');
      } else if (group.track_type === 'TUTORING') {
        if (!evalExamTitle || evalScore === '') {
          showNotification(t('group_details.eval_exam_title'), 'warning');
          return;
        }
        await api.post('/evaluations/tutoring', {
          enrollment_id: evalStudentEnrollmentId,
          exam_title: evalExamTitle,
          score: parseFloat(evalScore),
          max_score: parseFloat(evalMaxScore) || 20,
          exam_date: evalDate,
          teacher_notes: evalTeacherNotes
        });
        showNotification(t('group_details.eval_submit_btn'), 'success');
      }

      // Reset form
      setEvalSurahFrom('');
      setEvalSurahTo('');
      setEvalActivityTitle('');
      setEvalExamTitle('');
      setEvalScore('');
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-text-muted">{t('group_details.loading_group')}</div>;
  }

  if (!group) {
    return <div className="p-12 text-center text-text-muted">{t('group_details.group_not_found')}</div>;
  }

  const isHalaqa = group.track_type === 'HALAQA';
  const isPreschool = group.track_type === 'PRESCHOOL';
  const isTutoring = group.track_type === 'TUTORING';

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
        <Link to="/tracks" className="hover:text-primary transition-colors">{t('group_details.back_to_tracks')}</Link>
        <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
        <span className="text-text-main">{group.name}</span>
      </div>

      {/* Group Header Card */}
      <div className="p-6 lg:p-8 bg-surface-card border border-border rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isHalaqa 
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                  : isPreschool 
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
              }`}>
                {isHalaqa && <BookOpen className="w-3.5 h-3.5" />}
                {isPreschool && <Baby className="w-3.5 h-3.5" />}
                {isTutoring && <GraduationCap className="w-3.5 h-3.5" />}
                <span>
                  {isHalaqa ? t('group_details.track_quran') : isPreschool ? t('group_details.track_preschool') : t('group_details.track_tutoring')}
                </span>
              </span>

              {group.is_free ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                  {t('group_details.fully_free_badge')}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface text-text-main border border-border">
                  {t('group_details.monthly_fee_badge', { fee: parseFloat(group.monthly_fee).toLocaleString() })}
                </span>
              )}

              {/* Status Pill */}
              {group.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/25">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('group_details.status_pending')}</span>
                </span>
              )}
              {(!group.status || group.status === 'ACTIVE') && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t('group_details.status_active')}</span>
                </span>
              )}
              {group.status === 'STOPPED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/25">
                  <Pause className="w-3.5 h-3.5" />
                  <span>{t('group_details.status_stopped')}</span>
                </span>
              )}
              {group.status === 'ARCHIVED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25">
                  <Archive className="w-3.5 h-3.5" />
                  <span>{t('group_details.status_archived')}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-text-main font-cairo">
              {group.name}
            </h1>
            {group.subject_name && (
              <p className="text-sm text-text-muted">{group.subject_name}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Lifecycle Controls */}
            {group.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                  title={t('group_details.start_group')}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{t('group_details.start_group')}</span>
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('ARCHIVED')}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border text-xs font-bold transition-all disabled:opacity-50"
                  title={t('group_details.archive_group')}
                >
                  <Archive className="w-4 h-4" />
                  <span>{t('tracks.action_archive')}</span>
                </button>
              </>
            )}

            {(!group.status || group.status === 'ACTIVE') && (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleStatusChange('STOPPED')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                title={t('group_details.stop_group')}
              >
                <Pause className="w-4 h-4" />
                <span>{t('group_details.stop_group')}</span>
              </button>
            )}

            {group.status === 'STOPPED' && (
              <>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                  title={t('group_details.restart_group')}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('group_details.restart_group')}</span>
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('ARCHIVED')}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  title={t('group_details.archive_group')}
                >
                  <Archive className="w-4 h-4" />
                  <span>{t('group_details.archive_group')}</span>
                </button>
              </>
            )}

            {group.status === 'ARCHIVED' && (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleStatusChange('STOPPED')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                title={t('group_details.restore_group')}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('group_details.restore_group')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenEnrollModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('group_details.add_student_btn')}</span>
            </button>
          </div>
        </div>

        {/* Group Meta Info Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/80 text-xs text-text-muted">
          <div className="flex items-center justify-between gap-2 p-2.5 bg-surface/60 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span>{t('group_details.supervisor')} <strong className="text-text-main">{group.teacher_name || t('group_details.unspecified')}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewPrimaryTeacherId(group.teacher_id ? String(group.teacher_id) : '');
                setReassignModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-all"
              title={t('group_details.reassign_teacher_modal_title')}
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('group_details.change_supervisor')}</span>
            </button>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 bg-surface/60 rounded-2xl border border-border/60">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>{t('group_details.weekly_schedule')} <strong className="text-text-main">{group.schedule || t('group_details.unspecified')}</strong></span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 bg-surface/60 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{t('group_details.classroom')} <strong className="text-text-main">{group.room || t('group_details.unspecified_room')}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewRoom(group.room || '');
                setChangeRoomModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-all"
              title={t('group_details.change_room_modal_title')}
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('group_details.change_classroom')}</span>
            </button>
          </div>
        </div>

        {/* Contextual Status Banner */}
        {group.status === 'PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-amber-900 dark:text-amber-100 font-bold mb-0.5">
                {t('group_details.banner_pending_title')}
              </strong>
              <span>
                {t('group_details.banner_pending_desc')}
              </span>
            </div>
          </div>
        )}

        {group.status === 'STOPPED' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
            <Pause className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-rose-900 dark:text-rose-100 font-bold mb-0.5">
                {t('group_details.banner_stopped_title')}
              </strong>
              <span>
                {t('group_details.banner_stopped_desc')}
              </span>
            </div>
          </div>
        )}

        {group.status === 'ARCHIVED' && (
          <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/25 flex items-start gap-3 text-xs text-slate-800 dark:text-slate-200">
            <Archive className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-0.5">
                {t('group_details.banner_archived_title')}
              </strong>
              <span>
                {t('group_details.banner_archived_desc')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'ROSTER'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('group_details.tab_roster_count', { count: group.students?.length || 0 })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>رصد الحضور والغياب اليومي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EVALUATION')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'EVALUATION'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>
            {isHalaqa ? 'رصد الحفظ والمراجعة' : isPreschool ? 'رصد المهارات والسلوك' : 'رصد درجات الاختبارات'}
          </span>
        </button>
      </div>

      {/* Tab 1: Roster */}
      {activeTab === 'ROSTER' && (
        <div className="bg-surface-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-surface text-text-muted text-xs font-bold border-b border-border">
                <tr>
                  <th className="p-4 text-start">{t('group_details.table_reg_no')}</th>
                  <th className="p-4 text-start">{t('group_details.table_student_name')}</th>
                  <th className="p-4 text-start">{t('group_details.table_academic_level')}</th>
                  <th className="p-4 text-start">{t('group_details.table_enrollment_status')}</th>
                  <th className="p-4 text-start">{t('group_details.table_fee_status')}</th>
                  <th className="p-4 text-start">{t('group_details.table_guardian')}</th>
                  <th className="p-4 text-center">{t('group_details.table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.students?.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-text-muted">
                      {t('group_details.no_students_in_group')}
                    </td>
                  </tr>
                ) : (
                  group.students?.map((student) => {
                    const isActive = student.enrollment_status === 'ACTIVE';
                    const isTransferred = student.enrollment_status === 'TRANSFERRED';

                    return (
                      <tr key={student.enrollment_id} className="hover:bg-surface/50 transition-colors">
                        <td className="p-4 font-mono text-xs font-bold text-primary">
                          {student.reg_no}
                        </td>
                        <td className="p-4 font-bold text-text-main">
                          <div className="flex items-center gap-2.5">
                            {student.photo_url ? (
                              <img
                                src={student.photo_url}
                                alt={student.student_name}
                                className="w-8 h-8 rounded-xl object-cover border border-border shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/20">
                                {student.student_name?.charAt(0)}
                              </div>
                            )}
                            <Link to={`/students/${student.student_id}`} className="hover:text-primary transition-colors">
                              {student.student_name}
                            </Link>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-text-muted">
                          {student.academic_level || '-'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            isActive 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : isTransferred 
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {isActive ? t('group_details.active_and_continuous') : isTransferred ? t('group_details.transferred_to_other') : t('group_details.withdrawn')}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          {group.is_free ? (
                            <span className="text-emerald-600 font-bold">{t('group_details.fully_free_group')}</span>
                          ) : student.discount_type === 'FULL_EXEMPTION' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <Award className="w-3 h-3" />
                              {t('group_details.full_exemption_badge')}
                            </span>
                          ) : student.discount_type === 'PERCENTAGE' ? (
                            <span className="font-bold text-primary">{t('group_details.discount_percent_badge', { val: student.discount_value })}</span>
                          ) : student.discount_type === 'FIXED_AMOUNT' ? (
                            <span className="font-bold text-primary">{t('group_details.discount_fixed_badge', { val: student.discount_value })}</span>
                          ) : (
                            <span className="text-text-muted">{t('group_details.full_fee_badge')}</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-text-muted">
                          <div>{student.guardian_name || '-'}</div>
                          <div className="font-mono text-text-main mt-0.5">{student.guardian_phone}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/students/${student.student_id}`}
                              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-xs font-bold border border-border transition-all"
                            >
                              {t('group_details.history_dossier_btn')}
                            </Link>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForTransfer(student);
                                  setSelectedEnrollmentForTransfer({
                                    id: student.enrollment_id,
                                    student_id: student.student_id,
                                    group_id: group.id,
                                    group_name: group.name,
                                    academic_year_id: group.academic_year_id,
                                    enrolled_at: student.enrolled_at,
                                    discount_type: student.discount_type,
                                    discount_value: student.discount_value
                                  });
                                  setTransferModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/20 transition-all"
                                title={t('group_details.transfer_btn')}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>{t('group_details.transfer_btn')}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Marking */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-surface-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-lg font-bold text-text-main">{t('group_details.attendance_title')}</h3>
                <p className="text-xs text-text-muted">
                  {t('group_details.attendance_date_desc', { date: DateTimeFormatter.formatDate(attendanceDate) })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="p-2.5 rounded-xl bg-surface border border-border text-sm font-bold text-text-main focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{savingAttendance ? t('group_details.saving') : t('group_details.save_attendance')}</span>
              </button>
            </div>
          </div>

          {/* Teacher Attendance & Substitution Card */}
          {group.teacher_id ? (
            <div className="p-5 bg-surface rounded-2xl border border-border/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    {teacherAttendance.teacher_photo ? (
                      <img 
                        src={`http://localhost:5000${teacherAttendance.teacher_photo}`} 
                        alt={teacherAttendance.teacher_name || group.teacher_name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Users className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">{t('group_details.supervising_teacher')}</span>
                      <strong className="text-sm font-bold text-text-main">{group.teacher_name}</strong>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      {t('group_details.teacher_attendance_desc')}
                    </p>
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTeacherAttendance(prev => ({ ...prev, status: 'PRESENT', substitute_teacher_id: '' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherAttendance.status === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-surface-card text-text-muted hover:text-emerald-600 border border-border'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('group_details.status_present')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherAttendance(prev => ({ ...prev, status: 'ABSENT' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherAttendance.status === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-surface-card text-text-muted hover:text-rose-600 border border-border'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{t('group_details.status_absent')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherAttendance(prev => ({ ...prev, status: 'EXCUSED' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherAttendance.status === 'EXCUSED'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-surface-card text-text-muted hover:text-blue-600 border border-border'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('group_details.status_excused')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherAttendance(prev => ({ ...prev, status: 'LATE' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherAttendance.status === 'LATE'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-surface-card text-text-muted hover:text-amber-600 border border-border'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('group_details.status_late')}</span>
                  </button>
                </div>
              </div>

              {/* Substitution and Notes (Displayed if Absent, Excused, or if Substitute already chosen) */}
              {(teacherAttendance.status === 'ABSENT' || teacherAttendance.status === 'EXCUSED' || teacherAttendance.substitute_teacher_id) && (
                <div className="p-4 bg-surface-card rounded-xl border border-border space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{t('group_details.substitute_required_notice')}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">
                        {t('group_details.substitute_teacher_label')}
                      </label>
                      <select
                        value={teacherAttendance.substitute_teacher_id || ''}
                        onChange={(e) => setTeacherAttendance(prev => ({ ...prev, substitute_teacher_id: e.target.value }))}
                        className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                      >
                        <option value="">{t('group_details.no_substitute')}</option>
                        {allTeachers
                          .filter(t => t.id !== group.teacher_id)
                          .map(t => (
                            <option key={t.id} value={t.id}>
                              {t.full_name} ({t.phone || '-'})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">
                        {t('group_details.absence_reason_label')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('group_details.absence_reason_placeholder')}
                        value={teacherAttendance.notes || ''}
                        onChange={(e) => setTeacherAttendance(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Save button for Teacher Attendance */}
              <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                <div>
                  {teacherAttendance.status === 'ABSENT' || teacherAttendance.status === 'EXCUSED' ? (
                    teacherAttendance.substitute_teacher_id ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('group_details.substitute_assigned')}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">{t('group_details.no_substitute_yet')}</span>
                    )
                  ) : (
                    <span className="text-emerald-600 font-medium">{t('group_details.teacher_present_msg')}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRangeSubTeacherId('');
                      setRangeStartDate(attendanceDate);
                      setRangeEndDate(attendanceDate);
                      setRangeSubNotes('');
                      setRangeSubModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface border border-border text-text-main text-xs font-bold transition-all shadow-sm"
                    title={t('group_details.range_sub_modal_title')}
                  >
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{t('group_details.range_sub_btn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveTeacherAttendance(false)}
                    disabled={savingTeacherAttendance}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingTeacherAttendance ? t('group_details.saving') : t('group_details.save_teacher_status')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('group_details.no_primary_teacher')}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewPrimaryTeacherId('');
                  setReassignModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
              >
                {t('group_details.assign_teacher_btn')}
              </button>
            </div>
          )}

          {/* Student Attendance Section Header */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-text-muted mb-2">{t('group_details.students_attendance_header')}</h4>
          </div>

          <div className="space-y-3">
            {attendanceList.length === 0 ? (
              <p className="p-8 text-center text-text-muted">{t('group_details.no_students_attendance')}</p>
            ) : (
              attendanceList.map((item) => (
                <div 
                  key={item.enrollment_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface rounded-2xl border border-border/60"
                >
                  <div>
                    <h4 className="font-bold text-sm text-text-main">{item.student_name}</h4>
                    <span className="text-xs font-mono text-primary">{item.reg_no}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAttendanceStatusChange(item.enrollment_id, 'PRESENT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        item.status === 'PRESENT'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-surface-card text-text-muted hover:text-emerald-600 border border-border'
                      }`}
                    >
                      {t('group_details.status_present')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttendanceStatusChange(item.enrollment_id, 'LATE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        item.status === 'LATE'
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-surface-card text-text-muted hover:text-amber-600 border border-border'
                      }`}
                    >
                      {t('group_details.status_late')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttendanceStatusChange(item.enrollment_id, 'EXCUSED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        item.status === 'EXCUSED'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-surface-card text-text-muted hover:text-blue-600 border border-border'
                      }`}
                    >
                      {t('group_details.status_excused')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttendanceStatusChange(item.enrollment_id, 'UNEXCUSED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        item.status === 'UNEXCUSED'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-surface-card text-text-muted hover:text-rose-600 border border-border'
                      }`}
                    >
                      {t('group_details.status_absent')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Track-Specific Evaluation Form */}
      {activeTab === 'EVALUATION' && (
        <div className="bg-surface-card border border-border rounded-3xl p-6 lg:p-8 space-y-6 shadow-sm">
          <div className="border-b border-border pb-4">
            <h3 className="text-xl font-bold text-text-main">
              {isHalaqa && t('group_details.eval_form_title_halaqa')}
              {isPreschool && t('group_details.eval_form_title_preschool')}
              {isTutoring && t('group_details.eval_form_title_tutoring')}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {t('group_details.eval_hint')}
            </p>
          </div>

          <form onSubmit={handleSaveEvaluation} className="space-y-6">
            
            {/* Student Selector & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  {t('group_details.eval_target_student')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={evalStudentEnrollmentId}
                  onChange={(e) => setEvalStudentEnrollmentId(e.target.value)}
                  className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-bold text-text-main"
                  required
                >
                  {group.students?.filter(s => s.enrollment_status === 'ACTIVE').map((s) => (
                    <option key={s.enrollment_id} value={s.enrollment_id}>
                      {s.student_name} ({s.reg_no})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  {t('group_details.eval_date_label')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={evalDate}
                  onChange={(e) => setEvalDate(e.target.value)}
                  className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main"
                  required
                />
              </div>
            </div>

            {/* 1. Track: HALAQA SPECIFIC FIELDS */}
            {isHalaqa && (
              <div className="space-y-4 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_session_type')}</label>
                    <select
                      value={evalTahfizType}
                      onChange={(e) => setEvalTahfizType(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold"
                    >
                      <option value="MEMORIZATION">{t('group_details.eval_type_memorization')}</option>
                      <option value="REVISION">{t('group_details.eval_type_revision')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_from_surah')} <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="ex: Al-Baqarah"
                      value={evalSurahFrom}
                      onChange={(e) => setEvalSurahFrom(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_to_surah')} <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="ex: Aal-Imran"
                      value={evalSurahTo}
                      onChange={(e) => setEvalSurahTo(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_from_hizb')}</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={evalHizbFrom}
                      onChange={(e) => setEvalHizbFrom(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_to_hizb')}</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="3.5"
                      value={evalHizbTo}
                      onChange={(e) => setEvalHizbTo(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_grade_label')}</label>
                    <select
                      value={evalTahfizGrade}
                      onChange={(e) => setEvalTahfizGrade(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold"
                    >
                      <option value="MUMTAZ">{t('group_details.eval_grade_mumtaz')}</option>
                      <option value="JAYYID_JIDDAN">{t('group_details.eval_grade_jayyid_jiddan')}</option>
                      <option value="JAYYID">{t('group_details.eval_grade_jayyid')}</option>
                      <option value="MAQBOOL">{t('group_details.eval_grade_maqbool')}</option>
                      <option value="IADAH">{t('group_details.eval_grade_iadah')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_notes_label')}</label>
                  <textarea
                    rows="2"
                    placeholder={t('group_details.eval_notes_placeholder')}
                    value={evalTahfizNotes}
                    onChange={(e) => setEvalTahfizNotes(e.target.value)}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {/* 2. Track: PRESCHOOL SPECIFIC FIELDS */}
            {isPreschool && (
              <div className="space-y-4 p-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_skill_category')}</label>
                    <select
                      value={evalSkillCategory}
                      onChange={(e) => setEvalSkillCategory(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold"
                    >
                      <option value="LETTERS">{t('group_details.eval_cat_letters')}</option>
                      <option value="NUMBERS">{t('group_details.eval_cat_numbers')}</option>
                      <option value="MOTOR_SKILLS">{t('group_details.eval_cat_motor')}</option>
                      <option value="BEHAVIOR">{t('group_details.eval_cat_behavior')}</option>
                      <option value="SOCIAL">{t('group_details.eval_cat_social')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_activity_title')}</label>
                    <input
                      type="text"
                      placeholder={t('group_details.eval_activity_placeholder')}
                      value={evalActivityTitle}
                      onChange={(e) => setEvalActivityTitle(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_rating_label')}</label>
                    <select
                      value={evalScoreRating}
                      onChange={(e) => setEvalScoreRating(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold"
                    >
                      <option value="EXCELLENT">{t('group_details.eval_rate_excellent')}</option>
                      <option value="VERY_GOOD">{t('group_details.eval_rate_very_good')}</option>
                      <option value="GOOD">{t('group_details.eval_rate_good')}</option>
                      <option value="NEEDS_IMPROVEMENT">{t('group_details.eval_rate_needs_imp')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_behavior_notes')}</label>
                  <textarea
                    rows="2"
                    placeholder={t('group_details.eval_behavior_placeholder')}
                    value={evalBehaviorNote}
                    onChange={(e) => setEvalBehaviorNote(e.target.value)}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {/* 3. Track: TUTORING SPECIFIC FIELDS */}
            {isTutoring && (
              <div className="space-y-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_exam_title')} <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder={t('group_details.eval_exam_placeholder')}
                      value={evalExamTitle}
                      onChange={(e) => setEvalExamTitle(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_score_label')} <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="18.5"
                      value={evalScore}
                      onChange={(e) => setEvalScore(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_max_score_label')}</label>
                    <input
                      type="number"
                      step="1"
                      value={evalMaxScore}
                      onChange={(e) => setEvalMaxScore(e.target.value)}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.eval_teacher_notes')}</label>
                  <textarea
                    rows="2"
                    placeholder={t('group_details.eval_teacher_notes_placeholder')}
                    value={evalTeacherNotes}
                    onChange={(e) => setEvalTeacherNotes(e.target.value)}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{t('group_details.eval_submit_btn')}</span>
            </button>

          </form>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalOpen && (
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          student={selectedStudentForTransfer}
          currentEnrollment={selectedEnrollmentForTransfer}
          onSuccess={fetchGroupDetails}
        />
      )}

      {/* Direct Enroll Modal */}
      {enrollModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={handleCloseEnrollModal}
        >
          <div 
            className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-text-main">{t('group_details.enroll_modal_title')}</h3>
              <button
                type="button"
                onClick={handleCloseEnrollModal}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('group_details.select_student_label')} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={availableStudentsForEnroll.map(s => ({
                    value: String(s.id),
                    label: s.full_name,
                    sublabel: s.academic_level || s.guardian_phone || '',
                    badge: s.reg_no,
                    searchExtra: `${s.full_name} ${s.reg_no} ${s.academic_level || ''} ${s.guardian_name || ''} ${s.guardian_phone || ''}`
                  }))}
                  value={selectedStudentId}
                  onChange={(val) => setSelectedStudentId(val)}
                  placeholder={t('group_details.select_student_placeholder')}
                  searchPlaceholder={t('group_details.search_student_placeholder')}
                  icon={Users}
                />
              </div>

              {!group.is_free && (
                <div className="p-3 bg-surface rounded-xl border border-border space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">{t('group_details.discount_status_label')}</label>
                    <select
                      value={enrollDiscountType}
                      onChange={(e) => setEnrollDiscountType(e.target.value)}
                      className="w-full p-2 bg-surface-card border border-border rounded-lg text-xs font-bold"
                    >
                      <option value="NONE">{t('group_details.discount_none')}</option>
                      <option value="FULL_EXEMPTION">{t('group_details.discount_exempt')}</option>
                      <option value="PERCENTAGE">{t('group_details.discount_percent')}</option>
                      <option value="FIXED_AMOUNT">{t('group_details.discount_fixed')}</option>
                    </select>
                  </div>

                  {enrollDiscountType !== 'NONE' && enrollDiscountType !== 'FULL_EXEMPTION' && (
                    <div>
                      <label className="block text-xs font-bold text-text-main mb-1">{t('group_details.discount_value_label')}</label>
                      <input
                        type="number"
                        min="0"
                        value={enrollDiscountValue}
                        onChange={(e) => setEnrollDiscountValue(e.target.value)}
                        className="w-full p-2 bg-surface-card border border-border rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseEnrollModal}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all"
                >
                  {t('group_details.confirm_enroll_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Primary Supervisor Modal */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-main">{t('group_details.reassign_teacher_modal_title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignTeacher} className="space-y-4">
              <p className="text-xs text-text-muted leading-relaxed">
                {t('group_details.reassign_teacher_label')} <strong className="text-text-main">{group.name}</strong>:
              </p>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.supervising_teacher')}</label>
                <SearchableSelect
                  options={allTeachers.map(t => ({
                    value: String(t.id),
                    label: t.full_name,
                    sublabel: t.specialty,
                    badge: t.phone || '-',
                    searchExtra: `${t.full_name} ${t.specialty || ''} ${t.phone || ''}`
                  }))}
                  value={newPrimaryTeacherId}
                  onChange={(val) => setNewPrimaryTeacherId(val)}
                  placeholder={t('group_details.select_student_placeholder')}
                  searchPlaceholder={t('teachers.search_placeholder')}
                  icon={GraduationCap}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  disabled={reassigning}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{reassigning ? t('common.loading') : t('group_details.confirm_reassign_teacher')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Classroom Modal */}
      {changeRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-text-main">
                  {t('group_details.change_room_modal_title')} ({group.name})
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setChangeRoomModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeRoom} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-text-muted">
                    {t('group_details.select_room_label')}
                  </label>
                  <Link to="/timetable" className="text-[11px] text-primary hover:underline font-bold">
                    {t('classrooms_timetable.title')}
                  </Link>
                </div>
                <SearchableSelect
                  options={allClassrooms.map(c => ({
                    value: c.name,
                    label: c.name,
                    sublabel: c.code ? `رمز: ${c.code}` : '',
                    badge: `${c.capacity} ${t('classrooms_timetable.room_capacity')}`,
                    searchExtra: `${c.name} ${c.code || ''}`
                  }))}
                  value={newRoom}
                  onChange={(val) => setNewRoom(val)}
                  placeholder={t('group_details.select_room_label')}
                  searchPlaceholder={t('classrooms_timetable.rooms_tab')}
                  icon={MapPin}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setChangeRoomModalOpen(false)}
                  disabled={changingRoom}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changingRoom}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-2 transition-all"
                >
                  {changingRoom ? t('common.loading') : t('group_details.confirm_change_room')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Date Range Substitution Modal */}
      {rangeSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-main">{t('group_details.range_sub_modal_title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setRangeSubModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRangeSubstitution} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
                {t('group_details.range_sub_desc')}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.substitute_teacher_select')} *</label>
                <SearchableSelect
                  options={allTeachers
                    .filter(t => t.id !== group.teacher_id)
                    .map(t => ({
                      value: String(t.id),
                      label: t.full_name,
                      sublabel: t.specialty,
                      badge: t.phone || '-',
                      searchExtra: `${t.full_name} ${t.specialty || ''} ${t.phone || ''}`
                    }))}
                  value={rangeSubTeacherId}
                  onChange={(val) => setRangeSubTeacherId(val)}
                  placeholder={t('group_details.substitute_teacher_select')}
                  searchPlaceholder={t('teachers.search_placeholder')}
                  icon={GraduationCap}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.start_date')} *</label>
                  <input
                    type="date"
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.end_date')} *</label>
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.absence_reason_label')}</label>
                <input
                  type="text"
                  placeholder={t('group_details.absence_reason_placeholder')}
                  value={rangeSubNotes}
                  onChange={(e) => setRangeSubNotes(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRangeSubModalOpen(false)}
                  disabled={rangeSaving}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={rangeSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{rangeSaving ? t('common.loading') : t('group_details.confirm_range_sub')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
