import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, CheckCircle2, Award, Building2, RotateCcw } from 'lucide-react';
import QafGoLogo from './QafGoLogo';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function ReceiptModal({ isOpen, onClose, payment }) {
  const { settings, receiptPaperSize, setReceiptPaperSize } = useSettings();
  const { t, isRtl, dir, lang } = useLanguage();

  const isA5 = receiptPaperSize === 'A5';

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-print-modal');
      document.body.classList.add(isA5 ? 'print-paper-a5' : 'print-paper-a4');
    } else {
      document.body.classList.remove('has-print-modal', 'print-paper-a4', 'print-paper-a5');
    }
    return () => {
      document.body.classList.remove('has-print-modal', 'print-paper-a4', 'print-paper-a5');
    };
  }, [isOpen, isA5]);

  if (!isOpen || !payment) return null;

  const isExempt = payment.payment_status === 'EXEMPTED';
  const isRefund = payment.payment_status === 'REFUNDED' || payment.receipt_no?.startsWith('REF');
  const currency = settings?.currency_symbol || (isRtl ? 'د.ج' : 'DZD');

  const monthInLetters = DateTimeFormatter.formatMonthInLetters(
    payment.month_ref,
    lang,
    payment.months_count || 1
  );

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn print-portal-container print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block" dir={dir}>
      {/* Dynamic @page rule for browser print engine */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${isA5 ? 'A5 portrait' : 'A4 portrait'} !important;
            margin: ${isA5 ? '4mm' : '8mm'} !important;
          }
        }
      `}} />

      <div className={`w-full ${isA5 ? 'max-w-xl' : 'max-w-2xl'} bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden transition-all print-receipt-card print:m-0 print:w-full print:border-none print:shadow-none print:rounded-none`}>
        
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              {isRefund ? t('finance.refund_receipt_preview_title', 'معاينة وصل الاسترداد') : t('finance.receipt_preview_title')}
            </span>
            {/* Paper format selector badge */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold font-mono">
              <button
                type="button"
                title="A4 (210 × 297 mm)"
                onClick={() => setReceiptPaperSize && setReceiptPaperSize('A4')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  !isA5 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                title="A5 (148 × 210 mm)"
                onClick={() => setReceiptPaperSize && setReceiptPaperSize('A5')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  isA5 ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A5
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-md transition-colors ${
                isRefund ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{isRefund ? t('finance.print_refund_btn', 'طباعة وصل الاسترداد') : t('finance.print_receipt_btn')} ({isA5 ? 'A5' : 'A4'})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Voucher Content */}
        <div className={`p-6 sm:p-8 ${isA5 ? 'print:p-3 print:space-y-3 space-y-4 receipt-a5-body' : 'print:p-6 print:space-y-5 space-y-6'}`}>
          
          {/* Institutional Header Banner */}
          {settings?.receipt_header_text && (
            <div className={`text-center font-bold text-slate-500 border-b border-slate-100 ${isA5 ? 'text-[11px] print:text-[10px] pb-1' : 'text-xs pb-2'}`}>
              {settings.receipt_header_text}
            </div>
          )}

          {/* School Details Header */}
          <div className={`flex items-center justify-between border-b-2 border-slate-200 ${isA5 ? 'pb-3 print:pb-1.5' : 'pb-5'}`}>
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.school_name}
                  className={`${isA5 ? 'w-12 h-12 print:w-10 print:h-10' : 'w-16 h-16'} object-contain rounded-xl p-1 border border-slate-200 bg-slate-50 shadow-sm`}
                />
              ) : (
                <QafGoLogo className={isA5 ? 'w-10 h-10' : 'w-14 h-14'} showText={false} />
              )}
              <div>
                <h3 className={`${isA5 ? 'text-base print:text-sm' : 'text-lg'} font-black text-slate-900 leading-tight`}>
                  {settings?.school_name || t('receipt.default_school_name', 'مدرسة النور القرآنية والتربوية')}
                </h3>
                {settings?.legal_registration_no && (
                  <p className="text-[10px] sm:text-[11px] font-bold text-blue-600">
                    {settings.legal_registration_no}
                  </p>
                )}
                <div className="text-[10px] sm:text-[11px] text-slate-500 space-x-2 space-x-reverse mt-0.5">
                  {settings?.city && <span>{settings.city}</span>}
                  {settings?.phone_primary && <span>• {settings.phone_primary}</span>}
                </div>
              </div>
            </div>

            <div className="text-start">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                isRefund
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : isExempt 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                {isRefund 
                  ? t('finance.receipt_title_refund', 'وصل استرداد مالي') 
                  : isExempt 
                  ? t('finance.receipt_title_exempt') 
                  : t('finance.receipt_title_paid')}
              </span>
              <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-600 mt-1">
                {t('finance.receipt_no_label')} {payment.receipt_no}
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className={`text-center rounded-2xl border ${
            isA5 ? 'py-1.5 print:py-1' : 'py-2.5'
          } ${
            isRefund 
              ? 'bg-rose-50/50 border-rose-100' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <h2 className={`${isA5 ? 'text-lg print:text-base' : 'text-xl'} font-black ${isRefund ? 'text-rose-900' : 'text-slate-800'}`}>
              {isRefund 
                ? t('finance.receipt_title_refund', 'وصل استرداد مالي معتمد') 
                : isExempt 
                ? t('finance.receipt_title_exempt') 
                : t('finance.receipt_title_paid')}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {payment.academic_year_label ? `${payment.academic_year_label} | ` : ''}
              {payment.months_count > 1 || String(payment.month_ref).includes('→')
                ? `${t('finance.covered_period_label', 'الفترة المغطاة')}: ${monthInLetters} (${payment.month_ref})`
                : `${t('finance.receipt_month_label', 'شهر الاشتراك')}: ${monthInLetters} (${payment.month_ref})`}
            </p>
          </div>

          {/* Details Table */}
          <div className={`${isA5 ? 'space-y-1.5 print:space-y-1 text-xs' : 'space-y-2.5 text-sm'}`}>
            <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
              <span className="text-slate-500">{t('finance.receipt_student_label')}</span>
              <span className="font-bold text-slate-900">{payment.student_name}</span>
            </div>
            <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
              <span className="text-slate-500">{t('finance.receipt_reg_label')}</span>
              <span className="font-mono font-bold text-blue-600">{payment.reg_no}</span>
            </div>
            <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
              <span className="text-slate-500">{t('finance.receipt_group_label')}</span>
              <span className="font-bold text-slate-900">{payment.group_name}</span>
            </div>
            <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
              <span className="text-slate-500 font-medium">
                {payment.months_count > 1 || String(payment.month_ref).includes('→')
                  ? t('finance.covered_period_in_letters', 'الفترة المغطاة (كتابة):')
                  : t('finance.receipt_month_in_letters', 'شهر الاشتراك (كتابة):')}
              </span>
              <div className="text-end">
                <span className="font-bold text-slate-900 block">
                  {monthInLetters}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {payment.month_ref}
                </span>
              </div>
            </div>
            {(payment.months_count > 1 || String(payment.month_ref).includes('→')) && (
              <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
                <span className="text-slate-500">{t('finance.months_count_label', 'مدة الاشتراك')}:</span>
                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-mono">
                  {payment.months_count 
                    ? t('finance.months_count_option', { count: payment.months_count }, `${payment.months_count} أشهر`) 
                    : payment.month_ref}
                </span>
              </div>
            )}
            <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
              <span className="text-slate-500">
                {isRefund ? t('finance.refund_date_label', 'تاريخ الاسترداد') : t('finance.receipt_date_label')}
              </span>
              <span className="font-mono font-medium text-slate-700">
                {DateTimeFormatter.formatDate(payment.refund_date || payment.payment_date)}
              </span>
            </div>
            <div className={`flex justify-between border-b border-slate-100 ${isA5 ? 'py-1.5 print:py-0.5' : 'py-2'}`}>
              <span className="text-slate-500">{t('finance.payment_notes')}:</span>
              <span className="font-medium text-slate-700">{payment.notes || '-'}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className={`rounded-2xl flex items-center justify-between border ${
            isA5 ? 'p-2.5 print:p-2' : 'p-4'
          } ${
            isRefund
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : isExempt 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2">
              {isRefund ? (
                <RotateCcw className={isA5 ? 'w-5 h-5 text-rose-600' : 'w-6 h-6 text-rose-600'} />
              ) : isExempt ? (
                <Award className={isA5 ? 'w-5 h-5 text-emerald-600' : 'w-6 h-6 text-emerald-600'} />
              ) : (
                <CheckCircle2 className={isA5 ? 'w-5 h-5 text-blue-600' : 'w-6 h-6 text-blue-600'} />
              )}
              <span className={`font-bold ${isA5 ? 'text-sm' : 'text-base'}`}>
                {isRefund 
                  ? t('finance.receipt_refund_amount_label', 'المبلغ المسترد') 
                  : isExempt 
                  ? t('finance.receipt_status_exempt') 
                  : t('finance.receipt_amount_label')}
              </span>
            </div>
            <div className={`${isA5 ? 'text-xl print:text-lg' : 'text-2xl'} font-black font-mono`}>
              {isRefund 
                ? `-${parseFloat(payment.amount).toFixed(2)} ${currency}` 
                : isExempt 
                ? `0.00 ${currency}` 
                : `${parseFloat(payment.amount).toFixed(2)} ${currency}`}
            </div>
          </div>

          {/* Footer Notes & Stamps */}
          <div className={`border-t border-slate-200 flex justify-between items-end text-xs text-slate-500 gap-4 ${
            isA5 ? 'pt-3 print:pt-1.5' : 'pt-6'
          }`}>
            <div className="max-w-xs space-y-1">
              <p className={`${isA5 ? 'text-[10px] print:text-[9px] leading-tight' : 'text-[11px] leading-relaxed'}`}>
                {settings?.receipt_footer_notes || t('finance.receipt_thanks')}
              </p>
              <p className="font-mono text-[9px] sm:text-[10px] text-slate-400">
                QAF-SEC-{payment.id}-OK
              </p>
            </div>
            
            {/* Administrative Stamp & Signature */}
            <div className="text-center relative flex flex-col items-center">
              <span className={`block font-bold text-slate-700 ${isA5 ? 'mb-1 text-[11px]' : 'mb-2'}`}>
                {t('finance.receipt_cashier_sig')}
              </span>
              <div className={`relative ${isA5 ? 'w-28 h-14 print:w-24 print:h-11' : 'w-36 h-20'} flex items-center justify-center`}>
                {settings?.stamp_signature_url ? (
                  <img
                    src={settings.stamp_signature_url}
                    alt={t('finance.receipt_cashier_sig')}
                    className="max-h-full max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <span className="inline-block w-24 border-b border-dashed border-slate-400 mt-6"></span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
