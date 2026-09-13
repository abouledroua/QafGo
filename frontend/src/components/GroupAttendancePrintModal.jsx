import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  X, 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock3, 
  CalendarRange, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  UserX,
  Layers,
  Filter
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import DateInput from './DateInput';
import QafGoLogo from './QafGoLogo';
import api from '../services/api';

/**
 * GroupAttendancePrintModal
 * 
 * High-fidelity, official A4 printable attendance modal supporting:
 * 1. DAILY ATTENDANCE (A4 Portrait):
 *    - Real session awareness: displays actual recorded attendance for saved sessions.
 *    - Allows selecting directly from Recorded Sessions list or any date.
 *    - If date has no recorded session, provides an official Blank Scoring Sheet option ([ ])
 *      with clear warning and quick jump to the latest recorded session.
 * 2. PERIODIC / MONTHLY / CYCLE REGISTER (A4 Landscape):
 *    - Fully respects group.month_calculation_type ('CALENDAR_MONTH' | 'PER_SESSION' | 'PER_HOUR')
 *    - For 'PER_SESSION' and 'PER_HOUR', defaults to exact logical CYCLES (e.g. Cycle 1: Sessions 1-8)
 *    - Supports switching cycles with Cycle Selector and Next/Prev buttons
 *    - Also supports Calendar Month mode (e.g. 2026-09) and Custom Date Range
 */
export default function GroupAttendancePrintModal({
  isOpen,
  onClose,
  group,
  defaultMode = 'DAILY', // 'DAILY' | 'MONTHLY'
  initialDate,
  initialMonth,
  dailyAttendanceList = [],
  dailyTeacherAttendance = null
}) {
  const { settings } = useSettings();
  const { t, isRtl, dir } = useLanguage();

  // Calculation method flags
  const isPerSession = group?.month_calculation_type === 'PER_SESSION';
  const isPerHour = group?.month_calculation_type === 'PER_HOUR';
  const isQuotaBased = isPerSession || isPerHour;
  const quota = group?.package_quota;

  const [mode, setMode] = useState(defaultMode); // 'DAILY' | 'MONTHLY'
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || new Date().toISOString().slice(0, 7));
  const [printTimestamp, setPrintTimestamp] = useState('');

  // Range filtering options for Monthly/Cycle mode: 'CYCLE' | 'CALENDAR_MONTH' | 'CUSTOM_RANGE'
  const [filterType, setFilterType] = useState(isQuotaBased ? 'CYCLE' : 'CALENDAR_MONTH');
  const [selectedCycleNumber, setSelectedCycleNumber] = useState(null);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Daily mode data & session awareness
  const [dailyData, setDailyData] = useState([]);
  const [dailyTeacher, setDailyTeacher] = useState(null);
  const [dailyHasRecord, setDailyHasRecord] = useState(false);
  const [dailyRecordedDates, setDailyRecordedDates] = useState([]);
  const [dailyScheduledDays, setDailyScheduledDays] = useState([]);
  const [dailyIsScheduledDay, setDailyIsScheduledDay] = useState(false);
  const [blankSheetMode, setBlankSheetMode] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Monthly / Periodic mode data
  const [monthlyData, setMonthlyData] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Synchronize mode and dates when opened
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      if (initialDate) setSelectedDate(initialDate);
      if (initialMonth) setSelectedMonth(initialMonth);
      setFilterType(isQuotaBased ? 'CYCLE' : 'CALENDAR_MONTH');
      setSelectedCycleNumber(null);
      setPrintTimestamp(DateTimeFormatter.formatDateTime(new Date(), { withSeconds: true }));
    }
  }, [isOpen, defaultMode, initialDate, initialMonth, isQuotaBased]);

  // Manage print landscape and has-print-modal classes on body
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-print-modal');
      if (mode === 'MONTHLY') {
        document.body.classList.add('print-landscape-mode');
      } else {
        document.body.classList.remove('print-landscape-mode');
      }
    } else {
      document.body.classList.remove('has-print-modal');
      document.body.classList.remove('print-landscape-mode');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
      document.body.classList.remove('print-landscape-mode');
    };
  }, [isOpen, mode]);

  // Fetch daily data & session status when selectedDate changes or modal opens
  useEffect(() => {
    if (!isOpen || mode !== 'DAILY' || !group?.id) return;

    const fetchDaily = async () => {
      try {
        setLoadingDaily(true);
        const [studentRes, teacherRes] = await Promise.all([
          api.get(`/attendance/group/${group.id}?date=${selectedDate}`),
          api.get(`/attendance/teacher/group/${group.id}?date=${selectedDate}`)
        ]);

        if (studentRes.success) {
          setDailyData(studentRes.data || []);
          setDailyHasRecord(!!studentRes.hasRecord);
          setDailyRecordedDates(studentRes.recordedDates || []);
          setDailyScheduledDays(studentRes.scheduledDays || []);
          setDailyIsScheduledDay(!!studentRes.isScheduledDay);

          // If no attendance record exists for this date, default to blank sheet mode
          if (!studentRes.hasRecord) {
            setBlankSheetMode(true);
          } else {
            setBlankSheetMode(false);
          }
        }
        if (teacherRes.success) {
          setDailyTeacher(teacherRes.data || null);
        }
      } catch (err) {
        console.error('fetchDailyAttendance error:', err);
      } finally {
        setLoadingDaily(false);
      }
    };

    fetchDaily();
  }, [isOpen, mode, group?.id, selectedDate]);

  // Fetch monthly / cycle / custom date range data
  useEffect(() => {
    if (!isOpen || mode !== 'MONTHLY' || !group?.id) return;

    const fetchMonthlyOrRange = async () => {
      try {
        setLoadingMonthly(true);
        let url = `/attendance/group/${group.id}/monthly`;
        if (filterType === 'CYCLE') {
          if (selectedCycleNumber !== null && selectedCycleNumber !== undefined) {
            url += `?cycle_number=${selectedCycleNumber}`;
          }
        } else if (filterType === 'CUSTOM_RANGE') {
          url += `?date_from=${customStartDate}&date_to=${customEndDate}`;
        } else {
          url += `?month=${selectedMonth}`;
        }

        const res = await api.get(url);
        if (res.success) {
          setMonthlyData(res);
          if (filterType === 'CYCLE' && res.selectedCycle && !selectedCycleNumber) {
            setSelectedCycleNumber(res.selectedCycle.cycleNumber);
          }
        }
      } catch (err) {
        console.error('fetchMonthlyAttendance error:', err);
      } finally {
        setLoadingMonthly(false);
      }
    };

    fetchMonthlyOrRange();
  }, [isOpen, mode, group?.id, selectedMonth, filterType, selectedCycleNumber, customStartDate, customEndDate]);

  // Daily statistics (calculated only when an actual record exists and not in blank sheet mode)
  const dailyStats = useMemo(() => {
    const total = dailyData.length;
    if (!dailyHasRecord || blankSheetMode) {
      return { total, present: 0, absent: 0, late: 0, excused: 0, rate: 0, isBlank: true };
    }

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    dailyData.forEach(item => {
      const st = item.status || 'PRESENT';
      if (st === 'PRESENT') present++;
      else if (st === 'LATE') late++;
      else if (st === 'EXCUSED') excused++;
      else absent++;
    });

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, excused, rate, isBlank: false };
  }, [dailyData, dailyHasRecord, blankSheetMode]);

  // Monthly / Periodic statistics and session processing
  const monthlyProcessed = useMemo(() => {
    if (!monthlyData) return { dates: [], studentsMatrix: [], totals: { totalSessions: 0 } };

    const students = monthlyData.students || [];
    const attList = monthlyData.attendance || [];
    const recordedDates = monthlyData.recordedDates || [];

    // Map of enrollment_id + date -> status
    const attMap = new Map();
    attList.forEach(a => {
      attMap.set(`${a.enrollment_id}_${a.date}`, a.status);
    });

    const studentsMatrix = students.map((st, idx) => {
      let pCount = 0;
      let aCount = 0;
      let lCount = 0;
      let eCount = 0;

      const sessionsStatus = recordedDates.map(dateStr => {
        const stKey = `${st.enrollment_id}_${dateStr}`;
        const status = attMap.get(stKey) || null;
        if (status === 'PRESENT') pCount++;
        else if (status === 'LATE') lCount++;
        else if (status === 'EXCUSED') eCount++;
        else if (status === 'UNEXCUSED' || status === 'ABSENT') aCount++;
        return status;
      });

      const totalAssigned = pCount + aCount + lCount + eCount;
      const rate = totalAssigned > 0 ? Math.round(((pCount + lCount) / totalAssigned) * 100) : 0;

      return {
        ...st,
        index: idx + 1,
        sessionsStatus,
        pCount,
        aCount,
        lCount,
        eCount,
        rate
      };
    });

    return {
      dates: recordedDates,
      studentsMatrix,
      totalSessions: recordedDates.length
    };
  }, [monthlyData]);

  if (!isOpen || !group) return null;

  const handlePrint = () => {
    setPrintTimestamp(DateTimeFormatter.formatDateTime(new Date(), { withSeconds: true }));
    setTimeout(() => {
      window.print();
    }, 60);
  };

  const getTrackBadge = () => {
    if (group?.track_type === 'HALAQA' || group?.track_type === 'QURAN') return t('group_details.track_quran');
    if (group?.track_type === 'PRESCHOOL') return t('group_details.track_preschool');
    if (group?.track_type === 'TUTORING') return t('group_details.track_tutoring');
    return group?.track_name || group?.track_type || '';
  };

  const getCalculationTypeBadge = () => {
    if (isPerSession) {
      return t('group_details.print_calc_type_session', { quota: quota || 8 });
    }
    if (isPerHour) {
      return t('group_details.print_calc_type_hour', { quota: quota || 12 });
    }
    return t('group_details.print_calc_type_calendar');
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PRESENT':
        return {
          label: t('group_details.status_present', 'حاضر'),
          symbol: '✓',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'LATE':
        return {
          label: t('group_details.status_late', 'متأخر'),
          symbol: '⏰',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'EXCUSED':
        return {
          label: t('group_details.status_excused', 'معذور'),
          symbol: '📝',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      case 'UNEXCUSED':
      case 'ABSENT':
      default:
        return {
          label: t('group_details.status_absent', 'غائب'),
          symbol: '✕',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300'
        };
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print-portal-container print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block"
      dir={dir}
    >
      {/* Modal Container: portrait or landscape depending on mode */}
      <div 
        className={`w-full ${
          mode === 'MONTHLY' ? 'max-w-6xl print-landscape' : 'max-w-4xl'
        } bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto print:my-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full transition-all`}
      >
        
        {/* ========================================================================= */}
        {/* MODAL TOOLBAR (Hidden during printing)                                     */}
        {/* ========================================================================= */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50">
          
          {/* Title & Group Badge */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                {mode === 'DAILY' ? t('group_details.print_daily_modal_title') : t('group_details.print_monthly_modal_title')}
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mt-0.5">
                <span>{group.name}</span>
                <span>•</span>
                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  {getCalculationTypeBadge()}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('DAILY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'DAILY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('group_details.print_daily_sheet_title')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('MONTHLY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {isQuotaBased 
                  ? t('group_details.print_cycle_sheet_title', { quota: quota || '' })
                  : t('group_details.print_monthly_sheet_title')}
              </span>
            </button>
          </div>

          {/* Controls: Date / Month / Range Pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            {mode === 'DAILY' ? (
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Quick Recorded Sessions Selector */}
                {dailyRecordedDates.length > 0 && (
                  <div className="flex items-center bg-white border border-slate-300 p-0.5 rounded-xl text-xs shadow-xs">
                    <button
                      type="button"
                      disabled={dailyRecordedDates.indexOf(selectedDate) === -1 || dailyRecordedDates.indexOf(selectedDate) >= dailyRecordedDates.length - 1}
                      onClick={() => {
                        const idx = dailyRecordedDates.indexOf(selectedDate);
                        if (idx !== -1 && idx < dailyRecordedDates.length - 1) {
                          setSelectedDate(dailyRecordedDates[idx + 1]);
                        } else if (idx === -1 && dailyRecordedDates.length > 0) {
                          setSelectedDate(dailyRecordedDates[0]);
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title={t('group_details.print_btn_prev_cycle')}
                    >
                      {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>

                    <select
                      value={dailyRecordedDates.includes(selectedDate) ? selectedDate : ''}
                      onChange={(e) => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[170px] sm:max-w-none px-1"
                    >
                      <option value="" disabled>
                        {dailyRecordedDates.includes(selectedDate) 
                          ? `${t('group_details.select_recorded_session')} (${dailyRecordedDates.length})` 
                          : t('group_details.select_recorded_session')}
                      </option>
                      {dailyRecordedDates.map((d, sIdx) => (
                        <option key={d} value={d}>
                          {DateTimeFormatter.formatDate(d)} - {t('group_details.session_number_label', { number: dailyRecordedDates.length - sIdx })}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={dailyRecordedDates.indexOf(selectedDate) <= 0}
                      onClick={() => {
                        const idx = dailyRecordedDates.indexOf(selectedDate);
                        if (idx > 0) {
                          setSelectedDate(dailyRecordedDates[idx - 1]);
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title={t('group_details.print_btn_next_cycle')}
                    >
                      {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Calendar Date Picker */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1 rounded-xl">
                  <DateInput
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Session Recorded Status Indicator & Blank Sheet Toggle */}
                {dailyHasRecord ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('group_details.session_status_saved')}</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('group_details.session_status_not_recorded')}</span>
                    </span>

                    {dailyRecordedDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(dailyRecordedDates[0])}
                        className="px-2 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        {t('group_details.print_jump_to_latest')}
                      </button>
                    )}

                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none bg-white border border-slate-300 px-2.5 py-1 rounded-xl">
                      <input
                        type="checkbox"
                        checked={blankSheetMode}
                        onChange={(e) => setBlankSheetMode(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span>{t('group_details.print_blank_sheet_toggle')}</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Type Toggle */}
                <div className="flex items-center bg-white border border-slate-300 p-0.5 rounded-xl text-xs font-bold">
                  {isQuotaBased && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('CYCLE');
                        if (monthlyData?.selectedCycle?.cycleNumber) {
                          setSelectedCycleNumber(monthlyData.selectedCycle.cycleNumber);
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterType === 'CYCLE' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>{t('group_details.print_filter_cycle')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterType('CALENDAR_MONTH')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'CALENDAR_MONTH' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('group_details.print_filter_calendar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('CUSTOM_RANGE')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'CUSTOM_RANGE' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('group_details.print_filter_custom_range')}
                  </button>
                </div>

                {/* Sub-controls based on filterType */}
                {filterType === 'CYCLE' && isQuotaBased ? (
                  <div className="flex items-center gap-1 bg-white border border-purple-200 px-2 py-1 rounded-xl text-xs font-bold shadow-xs">
                    {/* Previous Cycle button */}
                    <button
                      type="button"
                      disabled={!monthlyData?.cycles || monthlyData.cycles.findIndex(c => c.cycleNumber === (selectedCycleNumber || monthlyData?.selectedCycle?.cycleNumber)) <= 0}
                      onClick={() => {
                        const currentNum = selectedCycleNumber || monthlyData?.selectedCycle?.cycleNumber;
                        const idx = monthlyData.cycles.findIndex(c => c.cycleNumber === currentNum);
                        if (idx > 0) setSelectedCycleNumber(monthlyData.cycles[idx - 1].cycleNumber);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title={t('group_details.print_btn_prev_cycle')}
                    >
                      {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>

                    <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <select
                      value={selectedCycleNumber || monthlyData?.selectedCycle?.cycleNumber || ''}
                      onChange={(e) => setSelectedCycleNumber(parseInt(e.target.value, 10))}
                      className="text-xs font-black text-purple-950 bg-transparent focus:outline-none cursor-pointer max-w-[200px] sm:max-w-none"
                    >
                      {(!monthlyData?.cycles || monthlyData.cycles.length === 0) ? (
                        <option value="">{t('group_details.print_no_cycles_yet')}</option>
                      ) : (
                        monthlyData.cycles.map(c => (
                          <option key={c.cycleNumber} value={c.cycleNumber}>
                            {t('group_details.print_cycle_number', { number: c.cycleNumber })}
                            {' - '}
                            {isPerHour
                              ? (c.isCompleted 
                                  ? t('group_details.print_cycle_hours_completed', { hours: c.totalHours, quota: c.quota })
                                  : t('group_details.print_cycle_hours_ongoing', { hours: c.totalHours, quota: c.quota }))
                              : (c.isCompleted 
                                  ? t('group_details.print_cycle_completed', { count: c.sessionsCount, quota: c.quota })
                                  : t('group_details.print_cycle_ongoing', { count: c.sessionsCount, quota: c.quota }))
                            }
                            {c.startDate ? ` (${c.startDate} ➔ ${c.endDate})` : ''}
                          </option>
                        ))
                      )}
                    </select>

                    {/* Next Cycle button */}
                    <button
                      type="button"
                      disabled={!monthlyData?.cycles || monthlyData.cycles.findIndex(c => c.cycleNumber === (selectedCycleNumber || monthlyData?.selectedCycle?.cycleNumber)) >= monthlyData.cycles.length - 1}
                      onClick={() => {
                        const currentNum = selectedCycleNumber || monthlyData?.selectedCycle?.cycleNumber;
                        const idx = monthlyData.cycles.findIndex(c => c.cycleNumber === currentNum);
                        if (idx >= 0 && idx < monthlyData.cycles.length - 1) {
                          setSelectedCycleNumber(monthlyData.cycles[idx + 1].cycleNumber);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title={t('group_details.print_btn_next_cycle')}
                    >
                      {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                ) : filterType === 'CALENDAR_MONTH' ? (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-xl">
                    <CalendarRange className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1 rounded-xl text-xs font-bold">
                    <span className="text-slate-400 text-[10px]">{t('group_details.print_from_date')}</span>
                    <DateInput
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                    <span className="text-slate-400 text-[10px]">{t('group_details.print_to_date')}</span>
                    <DateInput
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Print Trigger Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{mode === 'DAILY' ? t('group_details.print_daily_attendance_btn') : t('group_details.print_monthly_attendance_btn')}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL PRINTABLE A4 CONTENT (PORTRAIT OR LANDSCAPE)                     */}
        {/* ========================================================================= */}
        <div className={`p-6 sm:p-8 md:p-10 space-y-5 bg-white text-slate-900 print:p-2 print:space-y-4 ${mode === 'MONTHLY' ? 'print-landscape' : ''}`}>

          {/* 1. Official Institutional Banner */}
          {settings?.receipt_header_text && (
            <div className="text-center text-[11px] font-bold text-slate-600 pb-2 border-b border-slate-200 leading-normal">
              {settings.receipt_header_text}
            </div>
          )}

          {/* 2. School Identification Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.school_name || 'Logo'}
                  className="w-14 h-14 object-contain rounded-xl p-1 border border-slate-200 bg-slate-50 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 shrink-0">
                  <QafGoLogo showText={false} />
                </div>
              )}
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                  {settings?.school_name || t('receipt.default_school_name', 'مدرسة النور القرآنية والتربوية')}
                </h2>
                {settings?.legal_registration_no && (
                  <p className="text-[10px] font-bold text-blue-700 mt-0.5 font-mono">
                    {settings.legal_registration_no}
                  </p>
                )}
                <div className="text-[10px] text-slate-600 space-x-2 space-x-reverse mt-0.5">
                  {settings?.city && <span>{settings.city}</span>}
                  {settings?.phone_primary && <span>• {settings.phone_primary}</span>}
                  {settings?.address_line && <span>• {settings.address_line}</span>}
                </div>
              </div>
            </div>

            {/* Document Header Metadata */}
            <div className="text-end shrink-0">
              <div className="inline-block px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700">
                <span className="text-slate-500 block text-[9px] uppercase">{t('group_details.print_date_label')}</span>
                <span className="font-mono text-slate-900 text-xs font-black" dir="ltr">{printTimestamp}</span>
              </div>
            </div>
          </div>

          {/* 3. Document Title Box */}
          <div className="text-center py-2.5 px-4 bg-slate-100 rounded-2xl border border-slate-300">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-white">
                {getTrackBadge()}
              </span>

              {/* Title text adapting to Mode, Record status & Quota */}
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {mode === 'DAILY' ? (
                  blankSheetMode || !dailyHasRecord ? (
                    <span>{t('group_details.print_blank_sheet_title')}: </span>
                  ) : (
                    <span>{t('group_details.print_daily_sheet_title')}: </span>
                  )
                ) : filterType === 'CYCLE' && isQuotaBased ? (
                  <span>
                    {isPerSession
                      ? t('group_details.print_cycle_sheet_title', { quota: `${quota || 8} ${t('tracks.unit_rate_per_session', 'حصص')}` })
                      : t('group_details.print_cycle_sheet_title', { quota: `${quota || 12} ${t('tracks.badge_per_hour', 'ساعات')}` })}
                    {' - '}
                    <span className="text-purple-800">
                      {t('group_details.print_cycle_number', { number: monthlyData?.selectedCycle?.cycleNumber || selectedCycleNumber || 1 })}
                    </span>
                    {': '}
                  </span>
                ) : isQuotaBased ? (
                  <span>
                    {t('group_details.print_cycle_sheet_title', { quota: quota || '' })}:{' '}
                  </span>
                ) : (
                  <span>
                    {t('group_details.print_monthly_sheet_title')}:{' '}
                  </span>
                )}
                <span className="text-blue-700">{group.name}</span>
              </h1>

              {/* Scope Date / Month / Cycle Period badge */}
              {mode === 'DAILY' ? (
                <span className="text-xs font-black text-slate-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-lg font-mono" dir="ltr">
                  {DateTimeFormatter.formatDate(selectedDate)}
                </span>
              ) : filterType === 'CYCLE' && isQuotaBased ? (
                <span className="text-xs font-black text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg font-mono" dir="ltr">
                  {monthlyData?.selectedCycle?.startDate
                    ? `${DateTimeFormatter.formatDate(monthlyData.selectedCycle.startDate)} ➔ ${DateTimeFormatter.formatDate(monthlyData.selectedCycle.endDate)}`
                    : t('group_details.print_no_sessions_recorded')}
                </span>
              ) : filterType === 'CUSTOM_RANGE' ? (
                <span className="text-xs font-black text-slate-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-lg font-mono" dir="ltr">
                  {DateTimeFormatter.formatDate(customStartDate)} ➔ {DateTimeFormatter.formatDate(customEndDate)}
                </span>
              ) : (
                <span className="text-xs font-black text-slate-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-lg font-mono" dir="ltr">
                  {selectedMonth}
                </span>
              )}
            </div>
          </div>

          {/* 4. Group & Session Metadata Box (with explicit Calculation Method & Quota Progress) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs border border-slate-300 rounded-xl p-3 bg-slate-50/70">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">{t('student_profile.table_academic_year')}</span>
              <span className="font-bold text-slate-900">{group.academic_year_label || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">{t('group_details.supervising_teacher')}</span>
              <span className="font-bold text-slate-900">{group.teacher_name || t('group_details.unspecified')}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">{t('group_details.classroom')}</span>
              <span className="font-bold text-slate-900">{group.room || t('group_details.unspecified_room')}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">{t('group_details.print_calc_method_label')}</span>
              <span className="font-bold text-blue-900">{getCalculationTypeBadge()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">{t('group_details.weekly_schedule')}</span>
              <span className="font-bold text-slate-900 truncate block">{group.schedule || t('group_details.unspecified')}</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODE A: DAILY ATTENDANCE SHEET                                            */}
          {/* ========================================================================= */}
          {mode === 'DAILY' && (
            <div className="space-y-4">
              
              {/* Notice when viewing unrecorded date without blankSheetMode */}
              {!dailyHasRecord && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold">{t('group_details.print_no_record_warning')}</span>
                  </div>
                  {blankSheetMode && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-200/80 text-amber-900">
                      {t('group_details.print_blank_sheet_title')}
                    </span>
                  )}
                </div>
              )}

              {/* Teacher Session Attendance Endorsement Banner */}
              {group.teacher_id && dailyTeacher && (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{t('group_details.print_teacher_presence')}</span>
                    <strong className="text-slate-900">{dailyTeacher.teacher_name || group.teacher_name}</strong>
                    
                    {dailyHasRecord ? (
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        dailyTeacher.status === 'PRESENT' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : dailyTeacher.status === 'LATE'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : dailyTeacher.status === 'EXCUSED'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {dailyTeacher.status === 'PRESENT' && t('group_details.status_present')}
                        {dailyTeacher.status === 'LATE' && t('group_details.status_late')}
                        {dailyTeacher.status === 'EXCUSED' && t('group_details.status_excused')}
                        {dailyTeacher.status === 'ABSENT' && t('group_details.status_absent')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] border border-dashed border-slate-400 text-slate-500 bg-white">
                        [ &nbsp; ] {t('group_details.status_present')}
                      </span>
                    )}
                  </div>

                  {dailyTeacher.substitute_teacher_name && (
                    <div className="flex items-center gap-1.5 text-purple-800 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                      <span className="font-bold text-[11px]">{t('group_details.print_substitute_notice')}</span>
                      <strong className="font-bold text-xs">{dailyTeacher.substitute_teacher_name}</strong>
                    </div>
                  )}

                  {dailyTeacher.notes && (
                    <div className="text-[11px] text-slate-600 italic">
                      ({dailyTeacher.notes})
                    </div>
                  )}
                </div>
              )}

              {/* Students Daily Table */}
              <div className="overflow-hidden border border-slate-300 rounded-xl">
                <table className="w-full text-start border-collapse text-[11px]">
                  <thead className="bg-slate-200/90 text-slate-900 border-b border-slate-300 font-extrabold">
                    <tr>
                      <th className="p-2 border-e border-slate-300 text-center w-10">
                        {t('group_details.print_col_index')}
                      </th>
                      <th className="p-2 border-e border-slate-300 text-start w-28">
                        {t('group_details.print_col_reg_no')}
                      </th>
                      <th className="p-2 border-e border-slate-300 text-start">
                        {t('group_details.print_col_name')}
                      </th>
                      <th className="p-2 border-e border-slate-300 text-center w-36">
                        {t('group_details.print_col_status')}
                      </th>
                      <th className="p-2 text-start">
                        {t('group_details.print_col_notes')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dailyData.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 font-bold">
                          {loadingDaily ? t('common.loading') : t('group_details.no_students_attendance')}
                        </td>
                      </tr>
                    ) : (
                      dailyData.map((st, idx) => {
                        const statusObj = getStatusDisplay(st.status);
                        return (
                          <tr key={st.enrollment_id || idx} className={`print-avoid-break ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}>
                            <td className="p-2 border-e border-slate-300 text-center font-bold text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-e border-slate-300 font-mono font-bold text-blue-900" dir="ltr">
                              {st.reg_no}
                            </td>
                            <td className="p-2 border-e border-slate-300 font-black text-slate-900">
                              {st.student_name}
                            </td>
                            
                            {/* Status Cell: Real status badge IF recorded, or empty checkbox for blank sheet mode */}
                            <td className="p-2 border-e border-slate-300 text-center">
                              {dailyHasRecord && !blankSheetMode ? (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusObj.badgeClass}`}>
                                  <span>{statusObj.symbol}</span>
                                  <span>{statusObj.label}</span>
                                </span>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <span className="inline-block w-5 h-5 border-2 border-slate-400 rounded-md bg-white text-transparent">
                                    [ ]
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="p-2 text-slate-700">
                              {dailyHasRecord && !blankSheetMode && st.notes ? (
                                <span className="text-[10px] font-medium">{st.notes}</span>
                              ) : (
                                <div className="h-4 border-b border-dashed border-slate-300" />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Daily Statistics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-bold text-slate-800 bg-slate-100/90 rounded-xl p-2.5 border border-slate-300 text-center">
                <div>
                  <span className="text-slate-500 block text-[9px]">{t('group_details.print_total_students_summary')}</span>
                  <strong className="text-slate-950 font-mono text-sm">{dailyStats.total}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[9px]">{t('group_details.print_total_present')}</span>
                  <strong className="text-emerald-800 font-mono text-sm">
                    {dailyStats.isBlank ? '—' : dailyStats.present}
                  </strong>
                </div>
                <div>
                  <span className="text-rose-700 block text-[9px]">{t('group_details.print_total_absent')}</span>
                  <strong className="text-rose-800 font-mono text-sm">
                    {dailyStats.isBlank ? '—' : dailyStats.absent}
                  </strong>
                </div>
                <div>
                  <span className="text-amber-700 block text-[9px]">{t('group_details.print_total_late')}</span>
                  <strong className="text-amber-800 font-mono text-sm">
                    {dailyStats.isBlank ? '—' : dailyStats.late}
                  </strong>
                </div>
                <div>
                  <span className="text-blue-700 block text-[9px]">{t('group_details.print_total_excused')}</span>
                  <strong className="text-blue-800 font-mono text-sm">
                    {dailyStats.isBlank ? '—' : dailyStats.excused}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 block text-[9px]">{t('group_details.print_attendance_rate')}</span>
                  <strong className="text-blue-900 font-mono text-sm">
                    {dailyStats.isBlank ? '—' : `${dailyStats.rate}%`}
                  </strong>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE B: MONTHLY / PERIODIC / QUOTA ATTENDANCE REGISTER MATRIX             */}
          {/* ========================================================================= */}
          {mode === 'MONTHLY' && (
            <div className="space-y-4">
              
              {/* Legend & Quota Progress Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-[10px] font-bold text-slate-700">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-slate-500 font-extrabold">{t('group_details.print_cycle_period_label')}</span>
                  <span className="font-mono text-slate-900 font-black">
                    {filterType === 'CYCLE' && monthlyData?.selectedCycle?.startDate
                      ? `${DateTimeFormatter.formatDate(monthlyData.selectedCycle.startDate)} ➔ ${DateTimeFormatter.formatDate(monthlyData.selectedCycle.endDate)}`
                      : filterType === 'CUSTOM_RANGE' 
                      ? `${DateTimeFormatter.formatDate(customStartDate)} ➔ ${DateTimeFormatter.formatDate(customEndDate)}`
                      : selectedMonth}
                  </span>
                  <span>•</span>
                  <span>
                    {isPerSession ? (
                      <span className="font-bold text-purple-900">
                        {monthlyProcessed.totalSessions} / {quota || 8} {t('tracks.unit_rate_per_session', 'حصص')}
                        {monthlyData?.selectedCycle?.isCompleted 
                          ? ` (${t('common.active_status', 'مكتملة')})` 
                          : ` (${t('group_details.print_quota_progress', 'جارية')})`}
                      </span>
                    ) : isPerHour ? (
                      <span className="font-bold text-purple-900">
                        {monthlyData?.selectedCycle?.totalHours || 0} / {quota || 12} {t('tracks.badge_per_hour', 'ساعات')}
                        {monthlyData?.selectedCycle?.isCompleted 
                          ? ` (${t('common.active_status', 'مكتملة')})` 
                          : ` (${t('group_details.print_quota_progress', 'جارية')})`}
                      </span>
                    ) : (
                      <span>{monthlyProcessed.totalSessions} {t('timetable.session_details', 'حصص مسجلة')}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-emerald-800 font-black">{t('group_details.print_legend_present')}</span>
                  <span className="text-rose-800 font-black">{t('group_details.print_legend_absent')}</span>
                  <span className="text-amber-800 font-black">{t('group_details.print_legend_late')}</span>
                  <span className="text-blue-800 font-black">{t('group_details.print_legend_excused')}</span>
                </div>
              </div>

              {/* Monthly Matrix Table */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-start border-collapse text-[10px]">
                  <thead className="bg-slate-200/90 text-slate-900 border-b border-slate-300 font-black">
                    <tr>
                      <th className="p-1.5 border-e border-slate-300 text-center w-7">
                        #
                      </th>
                      <th className="p-1.5 border-e border-slate-300 text-start w-20">
                        {t('group_details.print_col_reg_no')}
                      </th>
                      <th className="p-1.5 border-e border-slate-300 text-start min-w-[140px]">
                        {t('group_details.print_col_name')}
                      </th>

                      {/* Dynamic Columns for each recorded session date */}
                      {monthlyProcessed.dates.length === 0 ? (
                        <th className="p-1.5 border-e border-slate-300 text-center">
                          {t('group_details.print_no_sessions_recorded')}
                        </th>
                      ) : (
                        monthlyProcessed.dates.map((dateStr, sIndex) => {
                          const parts = dateStr.split('-');
                          const dayNum = parts[2];
                          const monthNum = parts[1];
                          return (
                            <th key={dateStr} className="p-1 border-e border-slate-300 text-center w-7 font-mono font-black" title={dateStr}>
                              <span className="block text-[8px] text-purple-700 font-sans font-bold">
                                {isQuotaBased 
                                  ? `${t('group_details.print_session_col_prefix', 'ح')}${sIndex + 1}` 
                                  : `${monthNum}/`}
                              </span>
                              <span>{dayNum}</span>
                            </th>
                          );
                        })
                      )}

                      {/* Summary Columns */}
                      <th className="p-1.5 border-e border-slate-300 text-center w-8 bg-emerald-100/70 text-emerald-900" title={t('group_details.status_present')}>
                        {t('group_details.print_legend_present').charAt(0)}
                      </th>
                      <th className="p-1.5 border-e border-slate-300 text-center w-8 bg-rose-100/70 text-rose-900" title={t('group_details.status_absent')}>
                        {t('group_details.print_legend_absent').charAt(0)}
                      </th>
                      <th className="p-1.5 border-e border-slate-300 text-center w-8 bg-amber-100/70 text-amber-900" title={t('group_details.status_late')}>
                        {t('group_details.print_legend_late').charAt(0)}
                      </th>
                      <th className="p-1.5 border-e border-slate-300 text-center w-8 bg-blue-100/70 text-blue-900" title={t('group_details.status_excused')}>
                        {t('group_details.print_legend_excused').charAt(0)}
                      </th>
                      <th className="p-1.5 text-center w-10 bg-slate-300/80 font-black">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyProcessed.studentsMatrix.length === 0 ? (
                      <tr>
                        <td colSpan={5 + monthlyProcessed.dates.length} className="p-8 text-center text-slate-500 font-bold">
                          {loadingMonthly ? t('common.loading') : t('group_details.no_students_in_group')}
                        </td>
                      </tr>
                    ) : (
                      monthlyProcessed.studentsMatrix.map((st, idx) => (
                        <tr key={st.enrollment_id || idx} className={`print-avoid-break ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                          <td className="p-1 border-e border-slate-300 text-center font-bold text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="p-1 border-e border-slate-300 font-mono font-bold text-blue-900 truncate" dir="ltr">
                            {st.reg_no}
                          </td>
                          <td className="p-1 border-e border-slate-300 font-black text-slate-900 truncate">
                            {st.student_name}
                          </td>

                          {/* Session status cells */}
                          {st.sessionsStatus.map((status, sIdx) => {
                            let cellText = '·';
                            let cellClass = 'text-slate-300';
                            if (status === 'PRESENT') {
                              cellText = t('group_details.print_legend_present').charAt(0);
                              cellClass = 'text-emerald-700 font-black bg-emerald-50/60';
                            } else if (status === 'LATE') {
                              cellText = t('group_details.print_legend_late').charAt(0);
                              cellClass = 'text-amber-700 font-black bg-amber-50/60';
                            } else if (status === 'EXCUSED') {
                              cellText = t('group_details.print_legend_excused').charAt(0);
                              cellClass = 'text-blue-700 font-black bg-blue-50/60';
                            } else if (status === 'UNEXCUSED' || status === 'ABSENT') {
                              cellText = t('group_details.print_legend_absent').charAt(0);
                              cellClass = 'text-rose-700 font-black bg-rose-50/60';
                            }

                            return (
                              <td key={sIdx} className={`p-0.5 border-e border-slate-300 text-center font-mono ${cellClass}`}>
                                {cellText}
                              </td>
                            );
                          })}

                          {/* Totals */}
                          <td className="p-1 border-e border-slate-300 text-center font-mono font-bold text-emerald-800 bg-emerald-50/30">
                            {st.pCount}
                          </td>
                          <td className="p-1 border-e border-slate-300 text-center font-mono font-bold text-rose-800 bg-rose-50/30">
                            {st.aCount}
                          </td>
                          <td className="p-1 border-e border-slate-300 text-center font-mono font-bold text-amber-800 bg-amber-50/30">
                            {st.lCount}
                          </td>
                          <td className="p-1 border-e border-slate-300 text-center font-mono font-bold text-blue-800 bg-blue-50/30">
                            {st.eCount}
                          </td>
                          <td className="p-1 text-center font-mono font-black text-slate-900 bg-slate-100/50">
                            {st.rate}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* 5. Official Endorsement Signatures & Stamps */}
          <div className="print-avoid-break pt-4 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            {/* Supervising Teacher Box */}
            <div className="flex flex-col items-center">
              <span className="font-bold text-slate-800 mb-1">
                {t('group_details.print_teacher_signature')}
              </span>
              <span className="text-[11px] text-slate-500 mb-6">
                {group.teacher_name || '...........................................'}
              </span>
              <div className="w-36 border-b border-dashed border-slate-400 mt-4" />
            </div>

            {/* School Administration Stamp & Signature Box */}
            <div className="flex flex-col items-center">
              <span className="font-bold text-slate-800 mb-1">
                {t('group_details.print_admin_stamp')}
              </span>
              <span className="text-[11px] text-slate-500 mb-2">
                {settings?.school_name || '...........................................'}
              </span>
              <div className="relative w-36 h-16 flex items-center justify-center">
                {settings?.stamp_signature_url ? (
                  <img
                    src={settings.stamp_signature_url}
                    alt={t('group_details.print_admin_stamp')}
                    className="max-h-full max-w-full object-contain drop-shadow-xs"
                  />
                ) : (
                  <div className="w-28 h-12 border border-dashed border-slate-400 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                    {t('group_details.print_admin_stamp', '[ الختم الرسمي ]')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Footer Notice & Generation Timestamp */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-500 gap-1">
            <span>{t('group_details.print_official_doc_footer')}</span>
            <span className="font-mono font-semibold" dir="ltr">
              {t('group_details.print_date_label')} {printTimestamp}
            </span>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
