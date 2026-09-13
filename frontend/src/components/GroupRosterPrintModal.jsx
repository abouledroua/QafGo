import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Users, Calendar, MapPin, Clock, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import QafGoLogo from './QafGoLogo';

export default function GroupRosterPrintModal({ isOpen, onClose, group, includeTransferredDefault = false }) {
  const { settings } = useSettings();
  const { t, isRtl, dir } = useLanguage();

  const [includeTransferred, setIncludeTransferred] = useState(includeTransferredDefault);
  const [activeOnly, setActiveOnly] = useState(false);
  const [printDate, setPrintDate] = useState('');

  // Sync with prop whenever modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-print-modal');
      setIncludeTransferred(includeTransferredDefault);
      const now = new Date();
      setPrintDate(DateTimeFormatter.formatDateTime(now, { withSeconds: true }));
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [isOpen, includeTransferredDefault]);

  if (!isOpen || !group) return null;

  const rawStudents = group.students || [];
  const filteredStudents = rawStudents.filter(s => {
    if (!includeTransferred && s.enrollment_status === 'TRANSFERRED') return false;
    if (activeOnly && s.enrollment_status !== 'ACTIVE') return false;
    return true;
  });

  const handlePrint = () => {
    // Update timestamp right before printing
    setPrintDate(DateTimeFormatter.formatDateTime(new Date(), { withSeconds: true }));
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const getTrackBadge = () => {
    if (group.track_type === 'QURAN') return t('group_details.track_quran');
    if (group.track_type === 'PRESCHOOL') return t('group_details.track_preschool');
    if (group.track_type === 'TUTORING') return t('group_details.track_tutoring');
    return group.track_name || '';
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto print-portal-container print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block"
      dir={dir}
    >
      {/* Modal Container */}
      <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto print:my-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full transition-all">
        
        {/* Modal Toolbar (Hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                {t('group_details.print_modal_title')}
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                {group.name} • {filteredStudents.length} {t('common.all')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Transferred checkbox toggle */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={includeTransferred}
                onChange={(e) => setIncludeTransferred(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/20 accent-blue-600 cursor-pointer"
              />
              <span>{t('group_details.show_transferred_checkbox', 'إظهار الطلبة المحولين')}</span>
            </label>

            {/* Filter Toggle: All vs Active Only */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveOnly(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !activeOnly ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('group_details.print_filter_all')} ({filteredStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveOnly(true)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeOnly ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('group_details.print_filter_active')} ({rawStudents.filter(s => s.enrollment_status === 'ACTIVE').length})
              </button>
            </div>

            {/* Print Action Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('group_details.print_roster_btn')}</span>
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
        {/* OFFICIAL PRINTABLE A4 SHEET CONTENT                                       */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 md:p-10 space-y-5 bg-white text-slate-900 print:p-2 print:space-y-4">

          {/* 1. Official Institutional Banner (Algerian Republic & Ministry) */}
          {settings?.receipt_header_text && (
            <div className="text-center text-[11px] font-bold text-slate-600 pb-2 border-b border-slate-200 leading-normal">
              {settings.receipt_header_text}
            </div>
          )}

          {/* 2. School Identification Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.school_name || 'Logo'}
                  className="w-16 h-16 object-contain rounded-xl p-1 border border-slate-200 bg-slate-50 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 shrink-0">
                  <QafGoLogo showText={false} />
                </div>
              )}
              <div>
                <h2 className="text-lg font-black text-slate-950 leading-tight">
                  {settings?.school_name || t('receipt.default_school_name', 'مدرسة النور القرآنية والتربوية')}
                </h2>
                {settings?.legal_registration_no && (
                  <p className="text-[11px] font-bold text-blue-700 mt-0.5 font-mono">
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

            {/* Printing Date & Time Badge (Top Header) */}
            <div className="text-end shrink-0">
              <div className="inline-block px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700">
                <span className="text-slate-500 block text-[9px] uppercase">{t('group_details.print_date_label')}</span>
                <span className="font-mono text-slate-900 text-xs font-black" dir="ltr">{printDate}</span>
              </div>
            </div>
          </div>

          {/* 3. Document Title Box */}
          <div className="text-center py-2.5 px-4 bg-slate-100 rounded-2xl border border-slate-300">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-white">
                {getTrackBadge()}
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {t('group_details.print_sheet_title')}: <span className="text-blue-700">{group.name}</span>
              </h1>
            </div>
          </div>

          {/* 4. Group Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-300 rounded-xl p-3 bg-slate-50/70">
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
              <span className="text-slate-500 block text-[10px] font-bold">{t('group_details.weekly_schedule')}</span>
              <span className="font-bold text-slate-900 truncate block">{group.schedule || t('group_details.unspecified')}</span>
            </div>
          </div>

          {/* 5. Roster Table (A4 optimized) */}
          <div className="overflow-hidden border border-slate-300 rounded-xl">
            <table className="w-full text-start border-collapse text-[11px]">
              <thead className="bg-slate-200/90 text-slate-900 border-b border-slate-300 font-extrabold">
                <tr>
                  <th className="p-2 border-e border-slate-300 text-center w-8">
                    {t('group_details.print_col_index')}
                  </th>
                  <th className="p-2 border-e border-slate-300 text-start w-24">
                    {t('group_details.print_col_reg_no')}
                  </th>
                  <th className="p-2 border-e border-slate-300 text-start">
                    {t('group_details.print_col_name')}
                  </th>
                  <th className="p-2 border-e border-slate-300 text-start w-28">
                    {t('group_details.print_col_level')}
                  </th>
                  <th className="p-2 border-e border-slate-300 text-start w-24">
                    {t('group_details.print_col_dob')}
                  </th>
                  <th className="p-2 border-e border-slate-300 text-start">
                    {t('group_details.print_col_guardian')}
                  </th>
                  <th className="p-2 border-e border-slate-300 text-center w-24">
                    {t('group_details.print_col_status')}
                  </th>
                  <th className="p-2 text-start w-28">
                    {t('group_details.print_col_notes')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500 font-bold">
                      {t('group_details.no_students_in_group')}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const isActive = student.enrollment_status === 'ACTIVE';
                    const isExempt = student.discount_type === 'FULL_EXEMPTION';

                    return (
                      <tr 
                        key={student.enrollment_id || idx} 
                        className={`print-avoid-break ${idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}`}
                      >
                        {/* Index */}
                        <td className="p-2 border-e border-slate-300 text-center font-bold text-slate-600">
                          {idx + 1}
                        </td>

                        {/* Reg No */}
                        <td className="p-2 border-e border-slate-300 font-mono font-bold text-blue-900" dir="ltr">
                          {student.reg_no}
                        </td>

                        {/* Full Name */}
                        <td className="p-2 border-e border-slate-300 font-black text-slate-900">
                          {student.student_name}
                        </td>

                        {/* Academic Level */}
                        <td className="p-2 border-e border-slate-300 text-slate-700">
                          {student.academic_level || '-'}
                        </td>

                        {/* Date of Birth */}
                        <td className="p-2 border-e border-slate-300 font-mono text-slate-700" dir="ltr">
                          {student.dob ? DateTimeFormatter.formatDate(student.dob) : '-'}
                        </td>

                        {/* Guardian & Phone */}
                        <td className="p-2 border-e border-slate-300 text-slate-800">
                          <div className="font-bold">{student.guardian_name || '-'}</div>
                          {student.guardian_phone && (
                            <div className="font-mono text-[10px] text-slate-600" dir="ltr">
                              {student.guardian_phone}
                            </div>
                          )}
                        </td>

                        {/* Status / Fees */}
                        <td className="p-2 border-e border-slate-300 text-center">
                          {!isActive ? (
                            <span className="text-rose-700 font-bold text-[10px]">
                              {student.enrollment_status === 'TRANSFERRED' ? t('group_details.transferred_to_other') : t('group_details.withdrawn')}
                            </span>
                          ) : isExempt ? (
                            <span className="text-emerald-700 font-bold text-[10px]">
                              {t('group_details.full_exemption_badge')}
                            </span>
                          ) : (
                            <span className="text-slate-700 font-semibold text-[10px]">
                              {t('group_details.active_and_continuous')}
                            </span>
                          )}
                        </td>

                        {/* Notes / Signature Box */}
                        <td className="p-2 text-slate-400">
                          <div className="h-4 border-b border-dashed border-slate-300" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Summary Statistics Line */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-2 py-1 bg-slate-100/70 rounded-lg border border-slate-200">
            <span>
              {t('group_details.print_total_students_summary')} <strong className="text-slate-950 font-black">{filteredStudents.length}</strong>
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              QAF-GRP-{group.id}-A4
            </span>
          </div>

          {/* 7. Official Endorsement Signatures & Stamps (Avoid page break) */}
          <div className="print-avoid-break pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
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

          {/* 8. Footer Notice & Generation Timestamp */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-500 gap-1">
            <span>{t('group_details.print_official_doc_footer')}</span>
            <span className="font-mono font-semibold" dir="ltr">
              {t('group_details.print_date_label')} {printDate}
            </span>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
