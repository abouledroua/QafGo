import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  X, 
  Users, 
  User, 
  Baby, 
  Phone, 
  Calendar, 
  Award, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Search,
  Filter,
  CheckSquare,
  Square,
  Scissors
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import QafGoLogo from './QafGoLogo';

export default function PreschoolBadgesPrintModal({ 
  isOpen, 
  onClose, 
  group, 
  singleStudent = null 
}) {
  const { settings } = useSettings();
  const { t, isRtl, dir } = useLanguage();

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [badgeTheme, setBadgeTheme] = useState('PLAYFUL'); // 'PLAYFUL' | 'CLASSIC' | 'ELEGANT'
  const [printDate, setPrintDate] = useState('');

  const rawStudents = useMemo(() => {
    return group?.students || [];
  }, [group]);

  // Initial selection setup
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-print-modal');
      const now = new Date();
      setPrintDate(DateTimeFormatter.formatDateTime(now, { withSeconds: true }));

      if (singleStudent) {
        setSelectedStudentIds([singleStudent.student_id || singleStudent.id]);
      } else {
        // Select all active students by default
        const activeIds = rawStudents
          .filter(s => s.enrollment_status === 'ACTIVE')
          .map(s => s.student_id || s.id);
        setSelectedStudentIds(activeIds.length > 0 ? activeIds : rawStudents.map(s => s.student_id || s.id));
      }
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [isOpen, singleStudent, rawStudents]);

  if (!isOpen || !group) return null;

  // Filtered students for preview / print
  const displayableStudents = rawStudents.filter(s => {
    const sId = s.student_id || s.id;
    if (activeOnly && s.enrollment_status !== 'ACTIVE') return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (s.student_name || s.full_name || '').toLowerCase().includes(q);
      const matchReg = (s.reg_no || '').toLowerCase().includes(q);
      if (!matchName && !matchReg) return false;
    }
    return true;
  });

  const studentsToPrint = rawStudents.filter(s => {
    const sId = s.student_id || s.id;
    return selectedStudentIds.includes(sId);
  });

  const handleSelectAll = () => {
    const visibleIds = displayableStudents.map(s => s.student_id || s.id);
    setSelectedStudentIds(visibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    setPrintDate(DateTimeFormatter.formatDateTime(new Date(), { withSeconds: true }));
    setTimeout(() => {
      window.print();
    }, 60);
  };

  // Helper to calculate student age if dob is available
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto print-portal-container print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block"
      dir={dir}
    >
      {/* Modal Wrapper */}
      <div className="w-full max-w-5xl bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto print:my-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full transition-all">
        
        {/* Controls Toolbar (Hidden in Print Mode) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 bg-slate-50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-purple-600/10 text-purple-600 border border-purple-600/20">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <span>{t('preschool.print_badges_modal_title', 'طباعة شارات أطفال التحضيري')}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
                    {group.name}
                  </span>
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {t('preschool.badges_count_summary', 'تم تحديد {selected} من أصل {total} شارة للطباعة', {
                    selected: studentsToPrint.length,
                    total: rawStudents.length
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={studentsToPrint.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{t('preschool.print_now_btn', 'طباعة الشارات الآن')} ({studentsToPrint.length})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title={t('common.close', 'إغلاق')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtering & Layout Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs font-bold">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
              <div className="relative">
                <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2`} />
                <input
                  type="text"
                  placeholder={t('preschool.search_student_badge', 'بحث بالاسم أو الرقم...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`py-1.5 ${isRtl ? 'pr-8 pl-3' : 'pl-8 pr-3'} rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-purple-500`}
                />
              </div>

              {/* Active only toggle */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <span>{t('preschool.active_only_checkbox', 'الطلبة المستمرون فقط')}</span>
              </label>

              {/* Select All / Deselect All */}
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors"
              >
                {t('preschool.select_all_btn', 'تحديد الكل')}
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors"
              >
                {t('preschool.deselect_all_btn', 'إلغاء التحديد')}
              </button>
            </div>

            {/* Badge Style Theme Selector */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBadgeTheme('PLAYFUL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  badgeTheme === 'PLAYFUL' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('preschool.theme_playful', 'مبهج وبراعم')}
              </button>
              <button
                type="button"
                onClick={() => setBadgeTheme('CLASSIC')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  badgeTheme === 'CLASSIC' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('preschool.theme_classic', 'رسمي كلاسيكي')}
              </button>
              <button
                type="button"
                onClick={() => setBadgeTheme('ELEGANT')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  badgeTheme === 'ELEGANT' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('preschool.theme_elegant', 'أنيق هادئ')}
              </button>
            </div>
          </div>
        </div>

        {/* Printable Badges Canvas */}
        <div className="p-4 sm:p-6 md:p-8 bg-slate-100/50 print:bg-white print:p-0">
          
          {/* Quick Notice for Users */}
          <div className="no-print mb-4 p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs text-purple-900 font-bold">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-purple-600" />
              <span>{t('preschool.badge_print_notice', 'تم تنظيم الشارات بنمط بطاقات قياسية (2 عمود × 4 صفوف = 8 شارات في ورقة A4) مع خطوط قص واضحة للتقطيع والتغليف الحراري.')}</span>
            </div>
            <span className="font-mono text-[11px] text-purple-700">A4 • 85mm × 54mm</span>
          </div>

          {studentsToPrint.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-bold text-sm bg-white rounded-2xl border border-dashed border-slate-300">
              {t('preschool.no_students_selected', 'الرجاء تحديد طالب واحد على الأقل لطباعة الشارة')}
            </div>
          ) : (
            /* Badges Grid: 2 columns on A4 page */
            <div className="badges-print-grid grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-3 print:grid-cols-2">
              {studentsToPrint.map((student, index) => {
                const sId = student.student_id || student.id;
                const studentName = student.student_name || student.full_name;
                const age = calculateAge(student.dob);

                // Theme color variables
                const isPlayful = badgeTheme === 'PLAYFUL';
                const isClassic = badgeTheme === 'CLASSIC';
                const isElegant = badgeTheme === 'ELEGANT';

                const headerBg = isPlayful 
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500' 
                  : isClassic 
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-800' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700';

                const accentColor = isPlayful ? 'text-purple-700' : isClassic ? 'text-blue-700' : 'text-emerald-700';
                const badgeBorder = isPlayful ? 'border-purple-200' : isClassic ? 'border-blue-200' : 'border-emerald-200';

                return (
                  <div
                    key={sId}
                    className="badge-card-container relative group break-inside-avoid print:break-inside-avoid"
                  >
                    {/* Checkbox selector (no-print) */}
                    <button
                      type="button"
                      onClick={() => handleToggleStudent(sId)}
                      className="no-print absolute top-2 end-2 z-10 p-1.5 rounded-lg bg-white/90 hover:bg-white text-purple-600 shadow-sm border border-slate-200 transition-all cursor-pointer"
                      title={t('preschool.toggle_select_badge', 'تحديد / إلغاء تحديد هذه الشارة')}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* Cut Guides (dashed outer border with scissors icon) */}
                    <div className="relative p-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white shadow-sm print:shadow-none">
                      
                      {/* Actual Badge Card Box */}
                      <div className={`badge-card rounded-xl overflow-hidden border ${badgeBorder} bg-white flex flex-col justify-between h-[230px] print:h-[220px]`}>
                        
                        {/* 1. Header Banner */}
                        <div className={`${headerBg} text-white p-2.5 px-3 flex items-center justify-between shadow-xs`}>
                          <div className="flex items-center gap-2">
                            {settings?.logo_url ? (
                              <img 
                                src={settings.logo_url} 
                                alt={settings.school_name || 'Logo'} 
                                className="w-7 h-7 rounded-full bg-white/20 p-0.5 object-contain"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                                <Baby className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div className="leading-tight">
                              <h4 className="text-xs font-black tracking-wide truncate max-w-[180px]">
                                {settings?.school_name || t('preschool.default_school_name', 'المؤسسة التعليمية')}
                              </h4>
                              <p className="text-[9px] font-bold text-white/80">
                                {t('preschool.badge_header_subtitle', 'قسم التعليم المبكر والتحضيري')}
                              </p>
                            </div>
                          </div>

                          <div className="text-end">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[9px] font-black tracking-wider">
                              {group.academic_year_label || settings?.active_year_label || '2026-2027'}
                            </span>
                          </div>
                        </div>

                        {/* 2. Badge Main Info Body */}
                        <div className="p-3 flex items-center gap-3 flex-1">
                          
                          {/* Student Photo / Avatar Box */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-18 h-22 rounded-xl overflow-hidden border-2 ${badgeBorder} bg-slate-100 flex items-center justify-center shadow-inner relative`}>
                              {student.photo_url ? (
                                <img
                                  src={student.photo_url}
                                  alt={studentName}
                                  className="w-full h-full object-cover object-top"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                                  <Baby className={`w-9 h-9 ${accentColor} opacity-70 mb-0.5`} />
                                  <span className="text-[8px] font-bold text-slate-400">{t('students.photo', 'صورة')}</span>
                                </div>
                              )}
                            </div>
                            <span className="mt-1 font-mono text-[9px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                              {student.reg_no}
                            </span>
                          </div>

                          {/* Details Column */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Student Name */}
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block">
                                {t('preschool.student_name_label', 'اسم التلميذ(ة):')}
                              </span>
                              <h3 className="text-sm font-black text-slate-900 leading-tight truncate">
                                {studentName}
                              </h3>
                            </div>

                            {/* Group & Age */}
                            <div className="grid grid-cols-2 gap-1 text-[10px] pt-0.5">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block">
                                  {t('preschool.group_label', 'الفوج:')}
                                </span>
                                <span className={`font-black ${accentColor} truncate block`}>
                                  {group.name}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block">
                                  {t('preschool.dob_age_label', 'السن / الميلاد:')}
                                </span>
                                <span className="font-bold text-slate-700 block text-[10px]">
                                  {age ? `${age} ${t('preschool.years_old', 'سنوات')}` : (student.dob ? DateTimeFormatter.formatDate(student.dob) : '-')}
                                </span>
                              </div>
                            </div>

                            {/* Guardian & Emergency Contact */}
                            <div className="pt-1 border-t border-slate-200">
                              <span className="text-[8.5px] font-bold text-slate-400 block">
                                {t('preschool.emergency_contact_label', 'ولي الأمر للطوارئ:')}
                              </span>
                              <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-800">
                                <span className="truncate max-w-[110px]">
                                  {student.guardian_name || t('preschool.guardian_placeholder', 'ولي الأمر')}
                                </span>
                                <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[10px] shrink-0" dir="ltr">
                                  {student.guardian_phone || settings?.phone || '-'}
                                </span>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* 3. Badge Footer Strip */}
                        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">{t('preschool.teacher_label', 'المربية:')}</span>
                            <span className="text-slate-700 font-bold truncate max-w-[120px]">
                              {group.teacher_name || settings?.school_name || '.....................'}
                            </span>
                          </div>

                          {/* Simulated mini barcode */}
                          <div className="flex items-center gap-0.5 opacity-65 h-3.5" title={student.reg_no}>
                            <span className="w-0.5 h-3 bg-slate-900" />
                            <span className="w-1 h-3 bg-slate-900" />
                            <span className="w-0.5 h-3 bg-slate-900" />
                            <span className="w-1.5 h-3 bg-slate-900" />
                            <span className="w-0.5 h-3 bg-slate-900" />
                            <span className="w-1 h-3 bg-slate-900" />
                            <span className="w-0.5 h-3 bg-slate-900" />
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Official Stamp & Generation Timestamp in Print Mode */}
          <div className="hidden print:flex items-center justify-between text-[9px] text-slate-400 pt-3 mt-4 border-t border-slate-200">
            <span>{t('preschool.official_badge_watermark', 'بطاقة تعريف مدرسية معتمدة • قسم التعليم المبكر والتحضيري')}</span>
            <span className="font-mono" dir="ltr">{printDate}</span>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
