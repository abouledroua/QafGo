import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import DateInput from '../components/DateInput';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
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
  Archive,
  Printer,
  Wallet,
  CreditCard,
  XCircle,
  AlertCircle,
  ChevronLeft,
  PlusCircle,
  Eye,
  Trash2,
  CalendarDays,
  ListOrdered
} from 'lucide-react';
import TransferModal from '../components/TransferModal';
import SearchableSelect from '../components/SearchableSelect';
import GroupScheduleBuilder from '../components/GroupScheduleBuilder';
import GroupEditModal from '../components/GroupEditModal';
import GroupRosterPrintModal from '../components/GroupRosterPrintModal';
import GroupAttendancePrintModal from '../components/GroupAttendancePrintModal';
import PreschoolBadgesPrintModal from '../components/PreschoolBadgesPrintModal';
import ReceiptModal from '../components/ReceiptModal';
import RefundModal from '../components/RefundModal';
import { DateTimeFormatter, getConsecutiveMonths } from '../utils/dateTimeFormatter';
import ExportExcelButton from '../components/ExportExcelButton';

export default function GroupDetailsPage() {
  const { id } = useParams();
  const { showNotification, confirm } = useNotification();
  const { t, isRtl, dir, currency } = useLanguage();
  const { settings } = useSettings();
  const { user: authUser } = useAuth();

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

  // Full Edit Group Modal state
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);

  // Print Roster Modal state (A4)
  const [printRosterModalOpen, setPrintRosterModalOpen] = useState(false);

  // Print Preschool Badges Modal state
  const [printBadgesModalOpen, setPrintBadgesModalOpen] = useState(false);
  const [selectedStudentForBadge, setSelectedStudentForBadge] = useState(null);

  // Print Attendance Modal state (A4 Daily & Monthly)
  const [printAttendanceModalOpen, setPrintAttendanceModalOpen] = useState(false);
  const [printAttendanceMode, setPrintAttendanceMode] = useState('DAILY'); // 'DAILY' | 'MONTHLY'

  // Change Schedule State
  const [changeScheduleModalOpen, setChangeScheduleModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState('');
  const [newSessions, setNewSessions] = useState([]);
  const [scheduleConflict, setScheduleConflict] = useState(false);
  const [changingSchedule, setChangingSchedule] = useState(false);

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
  const [attendanceMeta, setAttendanceMeta] = useState({
    hasRecord: false,
    recordedDates: [],
    scheduledDays: [],
    isScheduledDay: false,
    schedule: ''
  });
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [createSessionModalOpen, setCreateSessionModalOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(() => DateTimeFormatter.toInputDate());

  // Group Sessions History & Subview state ('LIST' = History List | 'SHEET' = Scoring Sheet)
  const [attendanceSubView, setAttendanceSubView] = useState('LIST');
  const [sessionsList, setSessionsList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Edit Session Date modal state
  const [editDateModalOpen, setEditDateModalOpen] = useState(false);
  const [editingSessionDate, setEditingSessionDate] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [updatingDate, setUpdatingDate] = useState(false);

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

  // Toggle showing transferred students in group roster (default false)
  const [showTransferred, setShowTransferred] = useState(false);

  // Filter group students based on transferred toggle
  const visibleStudents = useMemo(() => {
    const list = group?.students || [];
    if (showTransferred) return list;
    return list.filter(s => s.enrollment_status !== 'TRANSFERRED');
  }, [group?.students, showTransferred]);

  // Filter out students who are already actively enrolled in this group
  const enrolledStudentIds = useMemo(() => {
    return new Set((group?.students || [])
      .filter(s => s.enrollment_status === 'ACTIVE')
      .map(s => s.id)
    );
  }, [group?.students]);

  const totalPresentCount = useMemo(() => {
    return attendanceList.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  }, [attendanceList]);

  const totalAbsentCount = useMemo(() => {
    return attendanceList.filter(a => a.status === 'ABSENT' || a.status === 'UNEXCUSED').length;
  }, [attendanceList]);

  const averageAttendanceRate = useMemo(() => {
    if (!sessionsList || sessionsList.length === 0) return 0;
    const sum = sessionsList.reduce((acc, s) => acc + (s.attendance_rate || 0), 0);
    return Math.round(sum / sessionsList.length);
  }, [sessionsList]);

  const activeSessionInfo = useMemo(() => {
    return sessionsList.find(s => s.date === attendanceDate) || null;
  }, [sessionsList, attendanceDate]);

  const availableStudentsForEnroll = useMemo(() => {
    return allStudents.filter(s => {
      if (enrolledStudentIds.has(s.id)) return false;
      if (settings?.group_gender_policy === 'SEPARATED' && group?.gender && group.gender !== 'ALL') {
        return s.gender === group.gender;
      }
      return true;
    });
  }, [allStudents, enrolledStudentIds, settings?.group_gender_policy, group?.gender]);

  // Teachers matching this group track
  const filteredGroupTeachers = useMemo(() => {
    const groupTrack = group?.track_type;
    if (!groupTrack) return allTeachers;
    return allTeachers.filter(tc => {
      if (Array.isArray(tc.track_types) && tc.track_types.length > 0) {
        if (tc.track_types.includes('GENERAL') || tc.track_types.includes('ALL')) return true;
        return tc.track_types.includes(groupTrack);
      }
      if (typeof tc.track_type === 'string') {
        if (tc.track_type === 'GENERAL' || tc.track_type.includes('ALL')) return true;
        const types = tc.track_type.split(',').map(s => s.trim());
        return types.includes(groupTrack);
      }
      return true;
    });
  }, [allTeachers, group?.track_type]);

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

  // Direct Fee Payment Modal States
  const [selectedFeeMonth, setSelectedFeeMonth] = useState(new Date().toISOString().slice(0, 7));
  const [directPayModalOpen, setDirectPayModalOpen] = useState(false);
  const [payingStudent, setPayingStudent] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    month_ref: new Date().toISOString().slice(0, 7),
    notes: ''
  });
  const [payingSubmitting, setPayingSubmitting] = useState(false);
  const [receiptToPreview, setReceiptToPreview] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [studentForRefund, setStudentForRefund] = useState(null);

  const fetchGroupDetails = useCallback(async (month = selectedFeeMonth) => {
    try {
      setLoading(true);
      const res = await api.get(`/groups/${id}?month_ref=${month}`);
      if (res.success) {
        setGroup(res.data);
        if (res.data.students?.length > 0 && !evalStudentEnrollmentId) {
          setEvalStudentEnrollmentId(res.data.students[0].enrollment_id);
        }
      }
    } catch (err) {
      showNotification(err.message || t('groups.fetch_error', 'فشل جلب تفاصيل الفوج'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, selectedFeeMonth, showNotification, t, evalStudentEnrollmentId]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleOpenDirectPay = (student) => {
    setPayingStudent(student);
    const expected = student.payment_info?.expected_amount !== undefined 
      ? student.payment_info.expected_amount 
      : (group?.is_free ? 0 : parseFloat(group?.monthly_fee || 0));
    const remaining = student.payment_info?.remaining_amount !== undefined 
      ? student.payment_info.remaining_amount 
      : expected;
    const initialFee = remaining > 0 ? remaining : expected;

    setPaymentForm({
      months_count: 1, // Default 1 month
      single_month_fee: expected > 0 ? expected : initialFee,
      amount: initialFee,
      payment_date: new Date().toISOString().split('T')[0],
      month_ref: selectedFeeMonth,
      notes: ''
    });
    setDirectPayModalOpen(true);
  };

  const handleDirectPayMonthsCountChange = (val) => {
    const safeCount = Math.max(1, parseInt(val, 10) || 1);
    const baseFee = paymentForm.single_month_fee !== undefined 
      ? paymentForm.single_month_fee 
      : (payingStudent?.payment_info?.expected_amount || parseFloat(group?.monthly_fee || 0));
    
    setPaymentForm(prev => ({
      ...prev,
      months_count: safeCount,
      amount: Math.round(baseFee * safeCount * 100) / 100
    }));
  };

  const directPayCoveredMonths = useMemo(() => {
    return getConsecutiveMonths(paymentForm.month_ref, paymentForm.months_count || 1);
  }, [paymentForm.month_ref, paymentForm.months_count]);

  const handleSubmitDirectPayment = async (e) => {
    e.preventDefault();
    if (!payingStudent || !group) return;
    try {
      setPayingSubmitting(true);
      const payload = {
        academic_year_id: group.academic_year_id,
        student_id: payingStudent.student_id,
        group_id: group.id,
        amount: parseFloat(paymentForm.amount || 0),
        months_count: parseInt(paymentForm.months_count, 10) || 1,
        payment_date: paymentForm.payment_date,
        month_ref: paymentForm.month_ref,
        payment_status: 'PAID',
        notes: paymentForm.notes || t('group_details.default_pay_notes', { group: group.name }, `دفع اشتراك فوج ${group.name}`)
      };
      const res = await api.post('/finance/payments', payload);
      if (res.success) {
        showNotification(res.message || t('finance.payment_recorded_success', 'تم تسجيل وصل الدفع بنجاح'), 'success');
        setDirectPayModalOpen(false);
        await fetchGroupDetails(paymentForm.month_ref);
        if (res.data?.receipt_no) {
          setReceiptToPreview({
            id: res.data.id,
            receipt_no: res.data.receipt_no,
            amount: res.data.amount,
            months_count: res.data.months_count || paymentForm.months_count || 1,
            payment_date: paymentForm.payment_date,
            month_ref: res.data.month_ref || paymentForm.month_ref,
            payment_status: 'PAID',
            student_name: payingStudent.student_name,
            reg_no: payingStudent.reg_no,
            group_name: group.name,
            notes: paymentForm.notes
          });
          setReceiptModalOpen(true);
        }
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setPayingSubmitting(false);
    }
  };

  const handleStopStudent = async (student) => {
    const agreed = await confirm({
      title: t('group_details.stop_student_confirm_title', 'إيقاف دراسة الطالب'),
      subtitle: t('group_details.stop_student_confirm_subtitle', { name: student.student_name }, `هل أنت متأكد من رغبتك في إيقاف الطالب "${student.student_name}" عن هذا الفوج؟`),
      confirmText: t('group_details.confirm_stop_btn', 'نعم، إيقاف الطالب'),
      cancelText: t('common.cancel', 'إلغاء'),
      variant: 'danger',
      icon: UserX
    });
    if (!agreed) return;

    try {
      const res = await api.put(`/groups/${group.id}/enrollments/${student.enrollment_id}/stop`);
      if (res.success) {
        showNotification(res.message || t('group_details.stop_success', 'تم إيقاف الطالب بنجاح'), 'success');
        await fetchGroupDetails(selectedFeeMonth);

        // Check if student has paid or partially paid for this session/month
        const grossPaid = parseFloat(student.payment_info?.gross_paid_amount ?? student.payment_info?.paid_amount ?? 0);
        const refunded = parseFloat(student.payment_info?.refunded_amount ?? 0);
        const remainingRefundable = Math.max(0, grossPaid - refunded);

        if (remainingRefundable > 0) {
          const wantRefund = await confirm({
            title: t('group_details.refund_prompt_title', 'استرداد المستحقات المالية'),
            subtitle: t('group_details.refund_prompt_subtitle', { name: student.student_name, amount: `${remainingRefundable.toLocaleString()} ${currency}` }, `الطالب سدد مبلغ (${remainingRefundable.toLocaleString()} ${currency}). هل تريد استرداد وتسوية المبلغ للطالب الآن؟`),
            confirmText: t('group_details.open_refund_modal_btn', 'نعم، فتح نافذة الاسترداد'),
            cancelText: t('group_details.skip_refund_btn', 'تخطي الآن'),
            variant: 'warning',
            icon: RotateCcw
          });

          if (wantRefund) {
            setStudentForRefund({
              ...student,
              payment_info: {
                ...student.payment_info,
                gross_paid_amount: grossPaid,
                refunded_amount: refunded
              }
            });
            setRefundModalOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('stop student error:', err);
      showNotification(err.response?.data?.message || err.message || t('group_details.stop_error', 'حدث خطأ أثناء إيقاف الطالب'), 'error');
    }
  };

  const handleResumeStudent = async (student) => {
    const agreed = await confirm({
      title: t('group_details.resume_student_confirm_title', 'استئناف دراسة الطالب'),
      subtitle: t('group_details.resume_student_confirm_subtitle', { name: student.student_name }, `هل تريد استئناف دراسة الطالب "${student.student_name}" في هذا الفوج وإعادته إلى قائمة الطلبة النشطين؟`),
      confirmText: t('group_details.confirm_resume_btn', 'استئناف الدراسة'),
      cancelText: t('common.cancel', 'إلغاء'),
      variant: 'success',
      icon: Play
    });
    if (!agreed) return;

    try {
      const res = await api.put(`/groups/${group.id}/enrollments/${student.enrollment_id}/resume`);
      if (res.success) {
        showNotification(res.message || t('group_details.resume_success', 'تم استئناف دراسة الطالب بنجاح'), 'success');
        await fetchGroupDetails(selectedFeeMonth);
      }
    } catch (err) {
      console.error('resume student error:', err);
      showNotification(err.response?.data?.message || err.message || t('group_details.resume_error', 'حدث خطأ أثناء استئناف دراسة الطالب'), 'error');
    }
  };

  const handleRefundSuccess = (refundData, msg) => {
    showNotification(msg || t('refund.success_notification', 'تم تسجيل استرداد المبلغ بنجاح'), 'success');
    fetchGroupDetails(selectedFeeMonth);
    setReceiptToPreview({
      id: refundData.id,
      receipt_no: refundData.receipt_no,
      amount: refundData.amount,
      payment_date: refundData.refund_date || refundData.payment_date,
      refund_date: refundData.refund_date,
      month_ref: refundData.month_ref,
      payment_status: 'REFUNDED',
      student_name: refundData.student_name || studentForRefund?.student_name,
      reg_no: refundData.reg_no || studentForRefund?.reg_no,
      group_name: refundData.group_name || group?.name,
      academic_year_label: group?.academic_year_label,
      notes: refundData.notes
    });
    setReceiptModalOpen(true);
  };

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
            setAttendanceList(res.data || []);
            setAttendanceMeta({
              hasRecord: !!res.hasRecord,
              recordedDates: res.recordedDates || [],
              scheduledDays: res.scheduledDays || [],
              isScheduledDay: !!res.isScheduledDay,
              schedule: res.schedule || group.schedule || ''
            });
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchAttendance();
      fetchTeacherAttendance();
    }
  }, [activeTab, attendanceDate, group?.id, group?.schedule, fetchTeacherAttendance]);

  // Load recorded sessions history for this group
  const fetchSessionsList = useCallback(async () => {
    if (!group?.id) return;
    try {
      setLoadingSessions(true);
      const res = await api.get(`/attendance/group/${group.id}/sessions`);
      if (res.success) {
        const fetched = res.data || [];
        setSessionsList(fetched);
        if (fetched.length === 0) {
          setAttendanceSubView('LIST');
        }
      }
    } catch (err) {
      console.error('Failed to fetch sessions list:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [group?.id]);

  useEffect(() => {
    if (activeTab === 'ATTENDANCE' && group?.id) {
      fetchSessionsList();
    }
  }, [activeTab, group?.id, fetchSessionsList]);

  // Open specific session details in scoring sheet view
  const handleOpenSessionDetails = (date) => {
    setAttendanceDate(date);
    setAttendanceSubView('SHEET');
  };

  // Open edit session date modal
  const handleOpenEditDate = (date) => {
    setEditingSessionDate(date);
    setNewTargetDate(date);
    setEditDateModalOpen(true);
  };

  // Save updated session date
  const handleSaveUpdatedDate = async (e) => {
    e.preventDefault();
    if (!newTargetDate || newTargetDate === editingSessionDate) {
      setEditDateModalOpen(false);
      return;
    }
    try {
      setUpdatingDate(true);
      const res = await api.put(`/attendance/group/${group.id}/session-date`, {
        oldDate: editingSessionDate,
        newDate: newTargetDate
      });
      if (res.success) {
        showNotification(res.message || t('group_details.session_date_updated_success'), 'success');
        setEditDateModalOpen(false);
        if (attendanceDate === editingSessionDate) {
          setAttendanceDate(newTargetDate);
        }
        await fetchSessionsList();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setUpdatingDate(false);
    }
  };

  // Cancel / Delete a session and its attendance records
  const handleDeleteSession = (date) => {
    confirm({
      title: t('group_details.cancel_session_confirm_title'),
      message: t('group_details.cancel_session_confirm_msg', { date: DateTimeFormatter.formatDate(date) }),
      confirmText: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.delete(`/attendance/group/${group.id}/session`, {
            data: { date }
          });
          if (res.success) {
            showNotification(res.message || t('group_details.session_cancelled_success'), 'success');
            await fetchSessionsList();
            if (attendanceDate === date) {
              setAttendanceSubView('LIST');
            }
          }
        } catch (err) {
          showNotification(err.message || t('common.error'), 'error');
        }
      }
    });
  };

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

  // Change Weekly Schedule for Group
  const handleChangeSchedule = async (e) => {
    e.preventDefault();
    if (group.track_type === 'TUTORING' && scheduleConflict) {
      showNotification(t('tracks.schedule_overlap_error_toast'), 'warning');
      return;
    }

    try {
      setChangingSchedule(true);
      const res = await api.put(`/groups/${group.id}`, {
        schedule: newSchedule || null,
        sessions: newSessions
      });
      if (res.success) {
        showNotification(t('group_details.schedule_updated_success'), 'success');
        setChangeScheduleModalOpen(false);
        setScheduleConflict(false);
        fetchGroupDetails();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setChangingSchedule(false);
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
        setAttendanceMeta(prev => ({
          ...prev,
          hasRecord: true,
          recordedDates: prev.recordedDates.includes(attendanceDate)
            ? prev.recordedDates
            : [attendanceDate, ...prev.recordedDates].sort().reverse()
        }));
        fetchSessionsList();
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
      <div className={(printRosterModalOpen || printAttendanceModalOpen) ? 'no-print space-y-6' : 'space-y-6'}>
      
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

              {/* Group Gender Badge (when policy is SEPARATED) */}
              {settings?.group_gender_policy === 'SEPARATED' && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${
                  group.gender === 'FEMALE'
                    ? 'bg-pink-500/10 text-pink-600 border-pink-500/25'
                    : 'bg-blue-500/10 text-blue-600 border-blue-500/25'
                }`}>
                  <span>{group.gender === 'FEMALE' ? '♀' : '♂'}</span>
                  <span>{group.gender === 'FEMALE' ? t('common.female') : t('common.male')}</span>
                </span>
              )}

              {group.is_free ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                  {t('group_details.fully_free_badge')}
                </span>
              ) : (
                <div className="inline-flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface text-text-main border border-border">
                    {t('group_details.monthly_fee_badge', { fee: parseFloat(group.monthly_fee).toLocaleString() })}
                  </span>
                  {group.month_calculation_type === 'PER_SESSION' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/25 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{group.package_quota ? t('tracks.badge_per_session', { count: group.package_quota }) : t('tracks.calc_per_session')}</span>
                    </span>
                  )}
                  {group.month_calculation_type === 'PER_HOUR' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/25 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{group.package_quota ? t('tracks.badge_per_hour', { count: group.package_quota }) : t('tracks.calc_per_hour')}</span>
                    </span>
                  )}
                </div>
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
            {group.subject_name && group.track_type !== 'PRESCHOOL' && (
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
              onClick={() => setEditGroupModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover text-text-main border border-border text-xs font-bold transition-all shadow-xs"
              title={t('group_details.edit_group_btn')}
            >
              <Edit3 className="w-4 h-4 text-primary" />
              <span>{t('group_details.edit_group_btn')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintRosterModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover text-text-main border border-border text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={t('group_details.print_roster_btn')}
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>{t('group_details.print_roster_btn')}</span>
            </button>

            {group?.track_type === 'PRESCHOOL' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForBadge(null);
                  setPrintBadgesModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title={t('preschool.print_badges_btn', 'طباعة شارات البراعم')}
              >
                <Baby className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{t('preschool.print_badges_btn', 'طباعة شارات البراعم')}</span>
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
          <div className="flex items-center justify-between gap-2 p-2.5 bg-surface/60 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{t('group_details.weekly_schedule')} <strong className="text-text-main">{group.schedule || t('group_details.unspecified')}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewSchedule(group.schedule || '');
                setNewSessions([]);
                setChangeScheduleModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-all shrink-0"
              title={t('group_details.change_schedule')}
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('group_details.change_schedule')}</span>
            </button>
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
          <span>{t('group_details.tab_attendance_daily', 'رصد الحضور والغياب اليومي')}</span>
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
            {isHalaqa
              ? t('group_details.tab_eval_quran', 'رصد الحفظ والمراجعة')
              : isPreschool
                ? t('group_details.tab_eval_preschool', 'رصد المهارات والسلوك')
                : t('group_details.tab_eval_tutoring', 'رصد درجات الاختبارات')}
          </span>
        </button>
      </div>

      {/* Tab 1: Roster */}
      {activeTab === 'ROSTER' && (
        <div className="bg-surface-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/80 flex items-center justify-between gap-3 bg-surface/40 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-text-main">
                  {t('group_details.tab_roster_count', { count: visibleStudents?.length || 0 })}
                </span>
              </div>

              {/* Checkbox to toggle showing transferred students */}
              <label className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-main cursor-pointer select-none px-2.5 py-1 rounded-xl bg-surface border border-border/70 hover:border-primary/40 transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  checked={showTransferred}
                  onChange={(e) => setShowTransferred(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span>{t('group_details.show_transferred_checkbox', 'إظهار الطلبة المحولين')}</span>
              </label>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {!group.is_free && (
                <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-text-muted whitespace-nowrap">
                    {t('group_details.roster_month_label')}
                  </span>
                  <input
                    type="month"
                    value={selectedFeeMonth}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setSelectedFeeMonth(newMonth);
                      fetchGroupDetails(newMonth);
                    }}
                    className="bg-transparent text-xs font-bold text-text-main focus:outline-none cursor-pointer"
                  />
                </div>
              )}
              <ExportExcelButton
                filename={`group_${group?.name || 'roster'}_students`}
                sheetName="Roster"
                columns={[
                  { header: t('group_details.table_reg_no', 'رقم التسجيل'), key: 'reg_no', width: 14 },
                  { header: t('group_details.table_student_name', 'اسم الطالب'), key: 'student_name', width: 24 },
                  { header: t('group_details.table_academic_level', 'المستوى الدراسي'), key: 'academic_level', width: 18 },
                  { 
                    header: t('group_details.table_enrollment_status', 'الحالة'), 
                    key: 'enrollment_status', 
                    width: 15,
                    formatter: (val) => val === 'ACTIVE' ? (t('common.status_active') || 'نشط') : val === 'TRANSFERRED' ? (t('common.status_transferred') || 'محول') : (t('common.status_dropped') || 'منسحب')
                  },
                  { 
                    header: t('group_details.table_payment_status', 'الدفع'), 
                    key: 'payment_info', 
                    width: 15,
                    formatter: (val) => val?.status || 'UNPAID'
                  },
                  { header: t('group_details.table_guardian', 'الولي'), key: 'guardian_name', width: 20 },
                  { header: t('group_details.guardian_phone', 'هاتف الولي'), key: 'guardian_phone', width: 16 }
                ]}
                data={visibleStudents || []}
                disabled={!visibleStudents || visibleStudents.length === 0}
              />
              <button
                type="button"
                onClick={() => setPrintRosterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-text-main border border-border text-xs font-bold transition-all shadow-xs cursor-pointer"
                title={t('group_details.print_roster_btn')}
              >
                <Printer className="w-3.5 h-3.5 text-primary" />
                <span>{t('group_details.print_roster_btn')}</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-surface text-text-muted text-xs font-bold border-b border-border">
                <tr>
                  <th className="p-4 text-start">{t('group_details.table_reg_no')}</th>
                  <th className="p-4 text-start">{t('group_details.table_student_name')}</th>
                  <th className="p-4 text-start">{t('group_details.table_academic_level')}</th>
                  <th className="p-4 text-start">{t('group_details.table_enrollment_status')}</th>
                  <th className="p-4 text-start">
                    {group.is_free ? t('group_details.table_fee_status') : t('group_details.table_payment_status')}
                  </th>
                  <th className="p-4 text-start">{t('group_details.table_guardian')}</th>
                  <th className="p-4 text-center">{t('group_details.table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleStudents?.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-text-muted">
                      {t('group_details.no_students_in_group')}
                    </td>
                  </tr>
                ) : (
                  visibleStudents?.map((student) => {
                    const isActive = student.enrollment_status === 'ACTIVE';
                    const isTransferred = student.enrollment_status === 'TRANSFERRED';
                    const isDropped = student.enrollment_status === 'DROPPED';
                    const isFullyExempt = student.discount_type === 'FULL_EXEMPTION' || student.payment_info?.status === 'EXEMPTED';
                    const isRefunded = student.payment_info?.status === 'REFUNDED';
                    const isPaidFull = student.payment_info?.status === 'PAID_FULL';
                    const isPaidPartial = student.payment_info?.status === 'PAID_PARTIAL';
                    const isUnpaid = !group.is_free && !isFullyExempt && !isRefunded && !isPaidFull && !isPaidPartial;

                    const grossPaid = parseFloat(student.payment_info?.gross_paid_amount ?? student.payment_info?.paid_amount ?? 0);
                    const refundedAmount = parseFloat(student.payment_info?.refunded_amount ?? 0);
                    const refundableBalance = Math.max(0, grossPaid - refundedAmount);

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
                            {isActive 
                              ? t('group_details.active_and_continuous') 
                              : isTransferred 
                              ? t('group_details.transferred_to_other') 
                              : t('group_details.stopped_status', 'موقف / منسحب')}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          {group.is_free ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-xs shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              <span>0 {currency}</span>
                            </span>
                          ) : isFullyExempt ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg text-xs font-mono shadow-xs">
                                <Award className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                                <span>0 {currency}</span>
                              </span>
                              {student.payment_info?.receipt_numbers && (
                                <div className="text-[11px] font-mono text-text-muted ps-1" title={t('group_details.receipt_numbers_tooltip', { receipts: student.payment_info.receipt_numbers })}>
                                  ({student.payment_info.receipt_numbers})
                                </div>
                              )}
                            </div>
                          ) : isRefunded ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 text-xs shadow-xs">
                                <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                <span>{t('finance.status_refunded', 'مسترد')}</span>
                              </span>
                              {student.payment_info?.refund_receipt_numbers && (
                                <div className="font-mono text-text-muted text-[10px] truncate max-w-[120px] ps-1" title={student.payment_info.refund_receipt_numbers}>
                                  ({student.payment_info.refund_receipt_numbers})
                                </div>
                              )}
                            </div>
                          ) : isPaidFull ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-xs shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <span>{student.payment_info?.paid_amount?.toLocaleString()} {currency}</span>
                              </span>
                              {student.payment_info?.receipt_numbers && (
                                <div className="font-mono text-text-muted text-[10px] truncate max-w-[120px] ps-1" title={student.payment_info.receipt_numbers}>
                                  ({student.payment_info.receipt_numbers})
                                </div>
                              )}
                              {refundedAmount > 0 && (
                                <div className="font-mono text-[10px] text-rose-500 ps-1">
                                  ({t('group_details.refunded_part_label', 'مسترد')}: {refundedAmount.toLocaleString()} {currency})
                                </div>
                              )}
                            </div>
                          ) : isPaidPartial ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 text-xs shadow-xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <span>{student.payment_info?.paid_amount?.toLocaleString()} / {student.payment_info?.expected_amount?.toLocaleString()} {currency}</span>
                              </span>
                              <div className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 ps-1">
                                -{student.payment_info?.remaining_amount?.toLocaleString()} {currency}
                              </div>
                              {refundedAmount > 0 && (
                                <div className="font-mono text-[10px] text-rose-500 ps-1">
                                  ({t('group_details.refunded_part_label', 'مسترد')}: {refundedAmount.toLocaleString()} {currency})
                                </div>
                              )}
                            </div>
                          ) : (
                            /* UNPAID: Show expected money value in red */
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 text-xs shadow-xs">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                <span>{student.payment_info?.expected_amount?.toLocaleString()} {currency}</span>
                              </span>
                              {(student.discount_type === 'PERCENTAGE' || student.discount_type === 'FIXED_AMOUNT') && (
                                <div className="text-[10px] text-text-muted font-normal ps-1">
                                  {student.discount_type === 'PERCENTAGE' 
                                    ? `(-${student.discount_value}%)` 
                                    : `(-${student.discount_value} ${currency})`}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-xs text-text-muted">
                          <div>{student.guardian_name || '-'}</div>
                          <div className="font-mono text-text-main mt-0.5">{student.guardian_phone}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {/* Direct Pay Action Button for Paid Groups */}
                            {!group.is_free && isActive && !isFullyExempt && (
                              <button
                                type="button"
                                onClick={() => handleOpenDirectPay(student)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                  isUnpaid || isPaidPartial
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse-subtle'
                                    : 'bg-surface hover:bg-surface-hover text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                }`}
                                title={t('group_details.pay_now_btn_title')}
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>{t('group_details.pay_now_btn')}</span>
                                {student.payment_info?.remaining_amount > 0 && (
                                  <span className="font-mono text-[10px] px-1 py-0.2 bg-black/20 rounded">
                                    {student.payment_info.remaining_amount.toLocaleString()}
                                  </span>
                                )}
                              </button>
                            )}

                            <Link
                              to={`/students/${student.student_id}`}
                              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-xs font-bold border border-border transition-all"
                            >
                              {t('group_details.history_dossier_btn')}
                            </Link>

                            {group?.track_type === 'PRESCHOOL' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForBadge(student);
                                  setPrintBadgesModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-500/20 transition-all cursor-pointer"
                                title={t('preschool.print_single_badge', 'طباعة الشارة')}
                              >
                                <Baby className="w-3.5 h-3.5" />
                                <span>{t('preschool.badge_short', 'الشارة')}</span>
                              </button>
                            )}

                            {/* Transfer Student Button */}
                            {isActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForTransfer(student);
                                  setSelectedEnrollmentForTransfer({
                                    id: student.enrollment_id,
                                    student_id: student.student_id,
                                    group_id: group?.id || id,
                                    group_name: group?.name || '',
                                    academic_year_id: group?.academic_year_id,
                                    enrolled_at: student.enrolled_at,
                                    discount_type: student.discount_type,
                                    discount_value: student.discount_value
                                  });
                                  setTransferModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/20 transition-all cursor-pointer"
                                title={t('group_details.transfer_btn')}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>{t('group_details.transfer_btn')}</span>
                              </button>
                            )}

                            {/* Stop Student Action Button (Active) */}
                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleStopStudent(student)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all cursor-pointer"
                                title={t('group_details.stop_student_btn_title', 'إيقاف الطالب عن الفوج')}
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>{t('group_details.stop_student_btn', 'إيقاف')}</span>
                              </button>
                            )}

                            {/* Resume Student Action Button (Dropped / Stopped) */}
                            {isDropped && (
                              <button
                                type="button"
                                onClick={() => handleResumeStudent(student)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all cursor-pointer"
                                title={t('group_details.resume_student_btn_title', 'استئناف دراسة الطالب في الفوج')}
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>{t('group_details.resume_student_btn', 'استئناف')}</span>
                              </button>
                            )}

                            {/* Refund Action Button (If student has paid refundable balance) */}
                            {refundableBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentForRefund(student);
                                  setRefundModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all cursor-pointer"
                                title={t('group_details.issue_refund_btn_title', 'استرداد مالي')}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t('group_details.refund_btn', 'استرداد')}</span>
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

      {/* Tab 2: Attendance Marking & Sessions History */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-surface-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
          {/* Header & Subview Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-main">{t('group_details.attendance_title')}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {t('group_details.sessions_count_badge', { count: sessionsList.length })}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {attendanceSubView === 'LIST'
                    ? t('group_details.sessions_history_subtitle')
                    : t('group_details.attendance_date_desc', { date: DateTimeFormatter.formatDate(attendanceDate) })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Subview Toggle Buttons: LIST vs SHEET */}
              <div className="flex items-center bg-surface border border-border p-1 rounded-2xl text-xs font-bold shadow-xs">
                <button
                  type="button"
                  onClick={() => setAttendanceSubView('LIST')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    attendanceSubView === 'LIST'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>{t('group_details.switch_to_sessions_list')}</span>
                  {sessionsList.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      attendanceSubView === 'LIST' ? 'bg-white/20 text-white' : 'bg-surface-card text-text-muted'
                    }`}>
                      {sessionsList.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={sessionsList.length === 0}
                  onClick={() => {
                    if (sessionsList.length === 0) {
                      showNotification(t('group_details.no_sessions_to_score_hint'), 'warning');
                      return;
                    }
                    setAttendanceSubView('SHEET');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    sessionsList.length === 0
                      ? 'text-text-muted/40 cursor-not-allowed opacity-50'
                      : attendanceSubView === 'SHEET'
                      ? 'bg-primary text-white shadow-xs cursor-pointer'
                      : 'text-text-muted hover:text-text-main cursor-pointer'
                  }`}
                  title={sessionsList.length === 0 ? t('group_details.no_sessions_to_score_hint') : t('group_details.switch_to_active_sheet')}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>{t('group_details.switch_to_active_sheet')}</span>
                </button>
              </div>

              {/* + New Session Button */}
              <button
                type="button"
                onClick={() => {
                  setNewSessionDate(attendanceDate || DateTimeFormatter.toInputDate());
                  setCreateSessionModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                title={t('group_details.new_session_btn')}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('group_details.new_session_btn')}</span>
              </button>

              {/* Print Monthly / Cycle Register (A4) */}
              <button
                type="button"
                onClick={() => {
                  setPrintAttendanceMode('MONTHLY');
                  setPrintAttendanceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card hover:bg-surface border border-border text-xs font-bold text-text-main shadow-xs transition-all cursor-pointer"
                title={
                  group.month_calculation_type === 'PER_SESSION' || group.month_calculation_type === 'PER_HOUR'
                    ? t('group_details.print_cycle_sheet_title', { quota: group.package_quota || '' })
                    : t('group_details.print_monthly_attendance_btn')
                }
              >
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  {group.month_calculation_type === 'PER_SESSION' || group.month_calculation_type === 'PER_HOUR'
                    ? t('group_details.print_cycle_attendance_btn')
                    : t('group_details.print_monthly_attendance_btn')}
                </span>
              </button>
            </div>
          </div>

          {(attendanceSubView === 'LIST' || sessionsList.length === 0) ? (
            /* Subview 1: Sessions History List */
            <div className="space-y-6 animate-fadeIn">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-surface rounded-2xl border border-border/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-text-muted block">{t('group_details.sessions_history_title')}</span>
                    <strong className="text-2xl font-black text-text-main mt-1 block font-mono">{sessionsList.length}</strong>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-muted">{t('group_details.average_attendance_rate')}</span>
                    <span className="text-xs font-black text-emerald-600 font-mono">{averageAttendanceRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-card rounded-full overflow-hidden border border-border/60">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, averageAttendanceRate))}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border/80 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-text-muted block">{t('group_details.scheduled_days_label')}</span>
                    <strong className="text-xs font-bold text-text-main mt-1 block truncate">
                      {group.schedule || attendanceMeta.schedule || t('group_details.unspecified')}
                    </strong>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border/80 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-text-muted block">{t('group_details.last_session_held')}</span>
                    <strong className="text-xs font-bold text-text-main mt-1 block truncate">
                      {sessionsList.length > 0 ? DateTimeFormatter.formatDate(sessionsList[0].date) : '-'}
                    </strong>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="overflow-hidden border border-border rounded-2xl bg-surface">
                {loadingSessions ? (
                  <div className="p-12 text-center text-text-muted text-sm font-bold flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </div>
                ) : sessionsList.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-inner">
                      <CalendarDays className="w-7 h-7" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="font-bold text-base text-text-main">{t('group_details.no_recorded_sessions_yet')}</h4>
                      <p className="text-xs text-text-muted mt-1">{t('group_details.empty_sessions_history')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSessionDate(DateTimeFormatter.toInputDate());
                        setCreateSessionModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{t('group_details.new_session_btn')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse text-xs">
                      <thead>
                        <tr className="bg-surface-card border-b border-border text-text-muted font-bold">
                          <th className="p-3 text-center w-16">#</th>
                          <th className="p-3 text-start">{t('common.date')}</th>
                          <th className="p-3 text-start">{t('group_details.supervising_teacher')}</th>
                          <th className="p-3 text-start">{t('group_details.students_attendance_header')}</th>
                          <th className="p-3 text-center w-28">{t('common.status')}</th>
                          <th className="p-3 text-end">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sessionsList.map((session) => (
                          <tr key={session.date} className="hover:bg-surface-card/60 transition-colors">
                            {/* Session Number */}
                            <td className="p-3 text-center font-bold">
                              <span className="inline-block px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-mono text-xs border border-primary/20">
                                {t('group_details.session_number_label', { number: session.session_number })}
                              </span>
                            </td>

                            {/* Date & Day of Week */}
                            <td className="p-3">
                              <div className="space-y-1">
                                <div className="font-bold text-text-main font-mono text-xs">
                                  {DateTimeFormatter.formatDate(session.date)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    session.is_scheduled_day
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                  }`}>
                                    {session.is_scheduled_day
                                      ? t('group_details.is_scheduled_day_badge')
                                      : t('group_details.is_not_scheduled_day_badge')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Teacher Info */}
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="font-bold text-text-main text-xs block">
                                  {session.teacher?.name || '-'}
                                </span>
                                {session.teacher?.substitute_name && (
                                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200">
                                    {t('group_details.print_substitute_notice')}: {session.teacher.substitute_name}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Attendance counts & bar */}
                            <td className="p-3">
                              <div className="space-y-1.5 max-w-xs">
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                  <span className="px-2 py-0.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    {session.present_count} {t('group_details.status_present')}
                                  </span>
                                  {session.absent_count > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                      {session.absent_count} {t('group_details.status_absent')}
                                    </span>
                                  )}
                                  {session.late_count > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                      {session.late_count} {t('group_details.status_late')}
                                    </span>
                                  )}
                                  {session.excused_count > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                      {session.excused_count} {t('group_details.status_excused')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-surface-card rounded-full overflow-hidden border border-border/60">
                                    <div 
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${Math.min(100, Math.max(0, session.attendance_rate))}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold font-mono text-text-muted">{session.attendance_rate}%</span>
                                </div>
                              </div>
                            </td>

                            {/* Status badge */}
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{t('group_details.session_status_saved')}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-end">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSessionDetails(session.date)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  title={t('group_details.view_session_details')}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">{t('group_details.view_session_details')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditDate(session.date)}
                                  className="p-1.5 rounded-xl border border-border bg-surface hover:bg-surface-card text-text-muted hover:text-text-main transition-colors cursor-pointer"
                                  title={t('group_details.edit_session_date')}
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceDate(session.date);
                                    setPrintAttendanceMode('DAILY');
                                    setPrintAttendanceModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-xl border border-border bg-surface hover:bg-surface-card text-text-muted hover:text-text-main transition-colors cursor-pointer"
                                  title={t('group_details.print_daily_attendance_btn')}
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSession(session.date)}
                                  className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                                  title={t('group_details.cancel_session_btn')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Subview 2: Scoring Sheet */
            <div className="space-y-6 animate-fadeIn">
              {/* Back to Sessions list bar & Sheet toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-2xl border border-border text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAttendanceSubView('LIST')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface border border-border text-text-main font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    <span>{t('group_details.back_to_sessions_list')}</span>
                  </button>

                  {activeSessionInfo && (
                    <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold border border-primary/20">
                      {t('group_details.session_number_label', { number: activeSessionInfo.session_number })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Recorded Sessions Quick Navigator */}
                  {attendanceMeta.recordedDates.length > 0 && (
                    <div className="flex items-center bg-surface-card border border-border p-0.5 rounded-xl text-xs font-bold shadow-xs">
                      <button
                        type="button"
                        disabled={attendanceMeta.recordedDates.indexOf(attendanceDate) === -1 || attendanceMeta.recordedDates.indexOf(attendanceDate) >= attendanceMeta.recordedDates.length - 1}
                        onClick={() => {
                          const idx = attendanceMeta.recordedDates.indexOf(attendanceDate);
                          if (idx !== -1 && idx < attendanceMeta.recordedDates.length - 1) {
                            setAttendanceDate(attendanceMeta.recordedDates[idx + 1]);
                          } else if (idx === -1 && attendanceMeta.recordedDates.length > 0) {
                            setAttendanceDate(attendanceMeta.recordedDates[0]);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-text-muted"
                        title={t('group_details.print_btn_prev_cycle')}
                      >
                        {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      </button>

                      <select
                        value={attendanceMeta.recordedDates.includes(attendanceDate) ? attendanceDate : ''}
                        onChange={(e) => {
                          if (e.target.value) setAttendanceDate(e.target.value);
                        }}
                        className="text-xs font-bold text-text-main bg-transparent focus:outline-none cursor-pointer max-w-[160px] sm:max-w-none px-1"
                      >
                        <option value="" disabled>
                          {attendanceMeta.recordedDates.includes(attendanceDate) 
                            ? `${t('group_details.select_recorded_session')} (${attendanceMeta.recordedDates.length})` 
                            : t('group_details.select_recorded_session')}
                        </option>
                        {attendanceMeta.recordedDates.map((d, sIdx) => (
                          <option key={d} value={d}>
                            {DateTimeFormatter.formatDate(d)} - {t('group_details.session_number_label', { number: attendanceMeta.recordedDates.length - sIdx })}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={attendanceMeta.recordedDates.indexOf(attendanceDate) <= 0}
                        onClick={() => {
                          const idx = attendanceMeta.recordedDates.indexOf(attendanceDate);
                          if (idx > 0) {
                            setAttendanceDate(attendanceMeta.recordedDates[idx - 1]);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-text-muted"
                        title={t('group_details.print_btn_next_cycle')}
                      >
                        {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  {/* Date Input */}
                  <DateInput
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="p-2 rounded-xl bg-surface-card border border-border text-xs font-bold text-text-main focus:outline-none cursor-pointer"
                  />

                  {/* Edit Date button (if recorded) */}
                  {attendanceMeta.hasRecord && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditDate(attendanceDate)}
                      className="p-2 rounded-xl bg-surface-card hover:bg-surface border border-border text-xs font-bold text-text-muted hover:text-text-main transition-colors cursor-pointer"
                      title={t('group_details.edit_session_date')}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  )}

                  {/* Cancel / Delete session (if recorded) */}
                  {attendanceMeta.hasRecord && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(attendanceDate)}
                      className="p-2 rounded-xl bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 transition-colors cursor-pointer"
                      title={t('group_details.cancel_session_btn')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Print Daily Sheet (A4) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrintAttendanceMode('DAILY');
                      setPrintAttendanceModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card hover:bg-surface border border-border text-xs font-bold text-text-main shadow-xs transition-all cursor-pointer"
                    title={t('group_details.print_daily_attendance_btn')}
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('group_details.print_daily_attendance_btn')}</span>
                  </button>

                  {/* Save Attendance Button */}
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingAttendance ? t('group_details.saving') : t('group_details.save_attendance')}</span>
                  </button>
                </div>
              </div>

          {/* Top Session Awareness Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-2xl border border-border text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-text-muted">
                {t('group_details.scheduled_days_label')}
              </span>
              <span className="font-bold text-text-main">
                {group.schedule || attendanceMeta.schedule || t('group_details.unspecified')}
              </span>

              {attendanceMeta.scheduledDays.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  attendanceMeta.isScheduledDay 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
                    : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                }`}>
                  {attendanceMeta.isScheduledDay ? t('group_details.is_scheduled_day_badge') : t('group_details.is_not_scheduled_day_badge')}
                </span>
              )}
            </div>

            {/* Session Recorded Status Indicator */}
            <div className="flex items-center gap-2">
              {attendanceMeta.hasRecord ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('group_details.session_status_saved')}</span>
                  <span className="text-[10px] opacity-80">({totalPresentCount} {t('group_details.status_present')} / {totalAbsentCount} {t('group_details.status_absent')})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('group_details.session_status_not_recorded')}</span>
                </span>
              )}
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
                <DateInput
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
          sourceGroupId={group?.id || id}
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
              {/* Gender restriction notice (when policy is SEPARATED) */}
              {settings?.group_gender_policy === 'SEPARATED' && group.gender && group.gender !== 'ALL' && (
                <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                  group.gender === 'MALE'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25'
                    : 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25'
                }`}>
                  <span className="text-base">{group.gender === 'MALE' ? '♂' : '♀'}</span>
                  <span>
                    {group.gender === 'MALE' 
                      ? t('group_details.group_gender_notice_male')
                      : t('group_details.group_gender_notice_female')}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('group_details.select_student_label')} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={availableStudentsForEnroll.map(s => ({
                    value: String(s.id),
                    label: s.full_name,
                    sublabel: s.academic_level ? `${s.academic_level}${s.guardian_phone ? ` • ${s.guardian_phone}` : ''}` : s.guardian_phone || '',
                    badge: s.reg_no,
                    avatarUrl: s.photo_url || null,
                    avatarText: s.full_name ? s.full_name.charAt(0).toUpperCase() : '?',
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
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-xs font-bold text-text-main">
                      {t('group_details.supervising_teacher')}
                    </label>
                    <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                      ({filteredGroupTeachers.length})
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
                  options={filteredGroupTeachers.map(t => ({
                    value: String(t.id),
                    label: t.full_name,
                    sublabel: t.specialty,
                    badge: t.phone || '-',
                    avatarUrl: t.photo_url || null,
                    avatarText: t.full_name ? t.full_name.charAt(0).toUpperCase() : '?',
                    searchExtra: `${t.full_name} ${t.specialty || ''} ${t.phone || ''}`
                  }))}
                  value={newPrimaryTeacherId}
                  onChange={(val) => setNewPrimaryTeacherId(val)}
                  placeholder={
                    group?.track_type === 'HALAQA'
                      ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_quran') })
                      : group?.track_type === 'PRESCHOOL'
                      ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_preschool') })
                      : group?.track_type === 'TUTORING'
                      ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_tutoring') })
                      : t('group_details.select_student_placeholder')
                  }
                  searchPlaceholder={t('teachers.search_placeholder')}
                  icon={GraduationCap}
                />
                {filteredGroupTeachers.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    {t('tracks.no_teachers_for_track_hint')}
                  </p>
                )}
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
                    sublabel: c.code ? `${t('classrooms_timetable.classroom_code', 'رمز')}: ${c.code}` : '',
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

      {/* Change Schedule Modal */}
      {changeScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5" dir={dir}>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-text-main">
                  {t('group_details.edit_schedule_modal_title')} ({group.name})
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setChangeScheduleModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeSchedule} className="space-y-4">
              <GroupScheduleBuilder
                trackType={group.track_type}
                value={newSchedule}
                onChange={(scheduleText, sessionsList, meta) => {
                  setNewSchedule(scheduleText);
                  setNewSessions(sessionsList);
                  setScheduleConflict(Boolean(meta?.hasConflict));
                }}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setChangeScheduleModalOpen(false)}
                  disabled={changingSchedule}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changingSchedule}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-2 transition-all"
                >
                  {changingSchedule ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{t('common.save')}</span>
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
                  <DateInput
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('group_details.end_date')} *</label>
                  <DateInput
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

      {/* Full Edit Group Modal */}
      <GroupEditModal
        isOpen={editGroupModalOpen}
        onClose={() => setEditGroupModalOpen(false)}
        group={group}
        teachers={allTeachers}
        classrooms={allClassrooms}
        onSuccess={() => {
          fetchGroupDetails();
        }}
      />
      </div>

      {/* Printable Group Students Roster Modal (A4) */}
      <GroupRosterPrintModal
        isOpen={printRosterModalOpen}
        onClose={() => setPrintRosterModalOpen(false)}
        group={group}
        includeTransferredDefault={showTransferred}
      />

      {/* Printable Group Attendance Modal (A4 Daily & Monthly) */}
      <GroupAttendancePrintModal
        isOpen={printAttendanceModalOpen}
        onClose={() => setPrintAttendanceModalOpen(false)}
        group={group}
        defaultMode={printAttendanceMode}
        initialDate={attendanceDate}
        initialMonth={attendanceDate?.slice(0, 7) || new Date().toISOString().slice(0, 7)}
        dailyAttendanceList={attendanceList}
        dailyTeacherAttendance={teacherAttendance}
      />

      {/* Printable Preschool Student Badges Modal (A4 / Individual) */}
      <PreschoolBadgesPrintModal
        isOpen={printBadgesModalOpen}
        onClose={() => {
          setPrintBadgesModalOpen(false);
          setSelectedStudentForBadge(null);
        }}
        group={group}
        singleStudent={selectedStudentForBadge}
      />

      {/* Create / Record New Session Modal */}
      {createSessionModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setCreateSessionModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('group_details.create_session_modal_title')}</h3>
                  <p className="text-xs text-text-muted">{group?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateSessionModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors cursor-pointer"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timetable Schedule Info */}
            <div className="p-3 bg-surface rounded-2xl border border-border/80 space-y-1 text-xs">
              <div className="flex items-center justify-between text-text-muted">
                <span className="font-bold">{t('group_details.scheduled_days_label')}</span>
                <span className="font-bold text-text-main">{group?.schedule || attendanceMeta.schedule || t('group_details.unspecified')}</span>
              </div>
              {group?.teacher_name && (
                <div className="flex items-center justify-between text-text-muted">
                  <span className="font-bold">{t('group_details.supervising_teacher')}:</span>
                  <span className="font-bold text-text-main">{group.teacher_name}</span>
                </div>
              )}
            </div>

            {/* Date Picker & Context Notice */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-text-main">
                {t('group_details.create_session_date_hint')}
              </label>

              <div className="flex items-center gap-2">
                <DateInput
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl bg-surface border border-border text-sm font-bold text-text-main focus:outline-none focus:border-primary cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setNewSessionDate(DateTimeFormatter.toInputDate())}
                  className="px-3 py-2.5 rounded-xl bg-surface-card hover:bg-surface border border-border text-xs font-bold text-text-main transition-colors cursor-pointer"
                >
                  {t('common.today', 'اليوم')}
                </button>
              </div>

              {/* Status and Timetable Match Notice */}
              {(() => {
                const isAlreadyRecorded = attendanceMeta.recordedDates.includes(newSessionDate);
                const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                const dateObj = new Date(`${newSessionDate}T00:00:00`);
                const selectedDayName = dayNames[dateObj.getDay()];
                const isScheduled = attendanceMeta.scheduledDays.includes(selectedDayName);

                if (isAlreadyRecorded) {
                  return (
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                      <span>{t('group_details.session_already_recorded_notice')}</span>
                    </div>
                  );
                }

                if (isScheduled) {
                  return (
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{t('group_details.official_scheduled_session_notice')}</span>
                    </div>
                  );
                }

                return (
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{t('group_details.compensatory_session_notice')}</span>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCreateSessionModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendanceDate(newSessionDate);
                  setCreateSessionModalOpen(false);
                  setAttendanceSubView('SHEET');
                  setActiveTab('ATTENDANCE');
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('group_details.create_session_btn_confirm')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Date Modal */}
      {editDateModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => !updatingDate && setEditDateModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('group_details.edit_session_date_title')}</h3>
                  <p className="text-xs text-text-muted">{group?.name}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={updatingDate}
                onClick={() => setEditDateModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors cursor-pointer"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Date Info */}
            <div className="p-3 bg-surface rounded-2xl border border-border/80 space-y-1 text-xs">
              <div className="flex items-center justify-between text-text-muted">
                <span>{t('group_details.attendance_date_desc', { date: '' }).replace('{date}', '').trim() || t('group_details.attendance_title')}:</span>
                <span className="font-bold text-text-main font-mono">{editingSessionDate ? DateTimeFormatter.formatDate(editingSessionDate) : ''}</span>
              </div>
            </div>

            {/* New Date Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-main">
                {t('group_details.new_session_date_label')} <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <DateInput
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl bg-surface border border-border text-sm font-bold text-text-main focus:outline-none focus:border-primary cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setNewTargetDate(DateTimeFormatter.toInputDate())}
                  className="px-3 py-2.5 rounded-xl bg-surface-card hover:bg-surface border border-border text-xs font-bold text-text-main transition-colors cursor-pointer"
                >
                  {t('common.today', 'اليوم')}
                </button>
              </div>

              {/* Conflict warning preview */}
              {attendanceMeta.recordedDates.includes(newTargetDate) && newTargetDate !== editingSessionDate && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{t('group_details.session_date_conflict_error')}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                disabled={updatingDate}
                onClick={() => setEditDateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={updatingDate || !newTargetDate || (attendanceMeta.recordedDates.includes(newTargetDate) && newTargetDate !== editingSessionDate)}
                onClick={handleSaveUpdatedDate}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingDate ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{updatingDate ? t('common.loading') : t('group_details.confirm_update_date_btn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Payment Modal */}
      {directPayModalOpen && payingStudent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => !payingSubmitting && setDirectPayModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">
                    {t('group_details.direct_pay_modal_title')}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {t('group_details.direct_pay_modal_desc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={payingSubmitting}
                onClick={() => setDirectPayModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student & Fee Summary Card */}
            <div className="p-4 rounded-2xl bg-surface/80 border border-border/80 space-y-3">
              <div className="flex items-center gap-3">
                {payingStudent.photo_url ? (
                  <img
                    src={payingStudent.photo_url}
                    alt={payingStudent.student_name}
                    className="w-11 h-11 rounded-2xl object-cover border border-border shadow-xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 border border-primary/20">
                    {payingStudent.student_name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-text-main truncate">
                    {payingStudent.student_name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                    <span className="font-mono font-bold text-primary">{payingStudent.reg_no}</span>
                    <span>•</span>
                    <span className="truncate">{group.name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                <div className="p-2 rounded-xl bg-surface-card border border-border/60">
                  <div className="text-[10px] font-bold text-text-muted">
                    {t('group_details.direct_pay_expected_fee')}
                  </div>
                  <div className="text-xs font-bold text-text-main font-mono mt-0.5">
                    {payingStudent.payment_info?.expected_amount?.toLocaleString()} {currency}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-surface-card border border-border/60">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {t('group_details.direct_pay_already_paid')}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {payingStudent.payment_info?.paid_amount?.toLocaleString() || 0} {currency}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-surface-card border border-border/60">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    {t('group_details.direct_pay_remaining_due')}
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {payingStudent.payment_info?.remaining_amount?.toLocaleString() || 0} {currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmitDirectPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('group_details.direct_pay_month_label', 'شهر البداية المرجعي')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="month"
                    required
                    value={paymentForm.month_ref}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, month_ref: e.target.value }))}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('group_details.direct_pay_date_label', 'تاريخ الدفع')} <span className="text-rose-500">*</span>
                  </label>
                  <DateInput
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Multi-month Selection */}
              <div className="p-3 bg-surface rounded-2xl border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{t('finance.months_count_label', 'عدد الأشهر المراد دفعها')}</span>
                  </label>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {paymentForm.months_count > 1 
                      ? t('finance.months_count_option', { count: paymentForm.months_count }, `${paymentForm.months_count} أشهر`) 
                      : t('finance.single_month_label', 'شهر واحد (افتراضي)')}
                  </span>
                </div>

                {/* Preset Pills */}
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 6, 9, 12].map(cnt => {
                    const isSelected = (parseInt(paymentForm.months_count, 10) || 1) === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleDirectPayMonthsCountChange(cnt)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-surface-card hover:bg-surface-hover text-text-muted border-border hover:border-border-hover'
                        }`}
                      >
                        {cnt === 1 ? (isRtl ? '1 (افتراضي)' : '1 (def)') : cnt}
                      </button>
                    );
                  })}
                </div>

                {/* Stepper Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={paymentForm.months_count || 1}
                    onChange={(e) => handleDirectPayMonthsCountChange(e.target.value)}
                    className="w-24 p-2 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main font-mono text-center focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs font-medium text-text-muted">
                    {paymentForm.months_count > 1 ? t('finance.months_unit', 'أشهر متتالية') : t('finance.month_unit', 'شهر واحد')}
                  </span>
                </div>

                {/* Covered Months Preview */}
                {directPayCoveredMonths.length > 0 && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-[11px] text-text-muted mb-1.5 flex items-center justify-between">
                      <span className="font-medium">{t('finance.covered_period_label', 'الفترة المغطاة:')}</span>
                      <span className="font-mono font-bold text-primary">
                        {directPayCoveredMonths[0]} → {directPayCoveredMonths[directPayCoveredMonths.length - 1]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {directPayCoveredMonths.map((m, idx) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20"
                        >
                          <span className="opacity-60">#{idx + 1}</span>
                          <span>{m}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-main">
                    {t('group_details.direct_pay_amount_label', 'المبلغ الإجمالي للدفع')} <span className="text-rose-500">*</span>
                  </label>
                  {paymentForm.months_count > 1 && (
                    <span className="text-[11px] font-mono text-text-muted">
                      ({paymentForm.single_month_fee || (payingStudent?.payment_info?.expected_amount || parseFloat(group?.monthly_fee || 0))} × {paymentForm.months_count})
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-base font-bold font-mono text-text-main focus:outline-none focus:border-primary"
                    placeholder="1500"
                  />
                  <div className="absolute inset-y-0 end-0 pe-4 flex items-center pointer-events-none text-xs font-bold text-text-muted">
                    {currency}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  {t('group_details.direct_pay_notes_label')}
                </label>
                <input
                  type="text"
                  placeholder={t('group_details.direct_pay_notes_placeholder')}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={payingSubmitting}
                  onClick={() => setDirectPayModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={payingSubmitting || !paymentForm.amount}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {payingSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('group_details.direct_pay_submitting')}</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{t('group_details.direct_pay_submit_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal for newly recorded payment */}
      {receiptModalOpen && receiptToPreview && (
        <ReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setReceiptToPreview(null);
          }}
          payment={receiptToPreview}
        />
      )}

      {/* Preschool Badges Print Modal */}
      {printBadgesModalOpen && (
        <PreschoolBadgesPrintModal
          isOpen={printBadgesModalOpen}
          onClose={() => {
            setPrintBadgesModalOpen(false);
            setSelectedStudentForBadge(null);
          }}
          group={group}
          singleStudent={selectedStudentForBadge}
        />
      )}

      {/* Student Refund Modal */}
      {refundModalOpen && studentForRefund && (
        <RefundModal
          isOpen={refundModalOpen}
          onClose={() => {
            setRefundModalOpen(false);
            setStudentForRefund(null);
          }}
          student={studentForRefund}
          group={group}
          monthRef={selectedFeeMonth}
          onSuccess={handleRefundSuccess}
        />
      )}

    </div>
  );
}
