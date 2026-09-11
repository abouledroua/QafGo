import React from 'react';
import { X, Printer, CheckCircle2, Award, Building2 } from 'lucide-react';
import QafGoLogo from './QafGoLogo';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function ReceiptModal({ isOpen, onClose, payment }) {
  const { settings } = useSettings();
  const { t, isRtl, dir } = useLanguage();

  if (!isOpen || !payment) return null;

  const isExempt = payment.payment_status === 'EXEMPTED';
  const currency = settings?.currency_symbol || (isRtl ? 'د.ج' : 'DZD');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir={dir}>
      <div className="w-full max-w-2xl bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden transition-all print:m-0 print:w-full print:border-none print:shadow-none">
        
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-bold text-slate-500">
            {t('finance.receipt_preview_title')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{t('finance.print_receipt_btn')}</span>
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
        <div className="p-8 space-y-6">
          
          {/* Institutional Header Banner */}
          {settings?.receipt_header_text && (
            <div className="text-center text-xs font-bold text-slate-500 pb-2 border-b border-slate-100">
              {settings.receipt_header_text}
            </div>
          )}

          {/* School Details Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-5">
            <div className="flex items-center gap-3.5">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.school_name}
                  className="w-16 h-16 object-contain rounded-xl p-1 border border-slate-200 bg-slate-50 shadow-sm"
                />
              ) : (
                <QafGoLogo className="w-14 h-14" showText={false} />
              )}
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {settings?.school_name || t('receipt.default_school_name', 'مدرسة النور القرآنية والتربوية')}
                </h3>
                {settings?.legal_registration_no && (
                  <p className="text-[11px] font-bold text-blue-600">
                    {settings.legal_registration_no}
                  </p>
                )}
                <div className="text-[11px] text-slate-500 space-x-2 space-x-reverse mt-0.5">
                  {settings?.city && <span>{settings.city}</span>}
                  {settings?.phone_primary && <span>• {settings.phone_primary}</span>}
                </div>
              </div>
            </div>

            <div className="text-start">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                isExempt 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                {isExempt ? t('finance.receipt_title_exempt') : t('finance.receipt_title_paid')}
              </span>
              <div className="text-xs font-mono font-bold text-slate-600 mt-1">
                {t('finance.receipt_no_label')} {payment.receipt_no}
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className="text-center py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <h2 className="text-xl font-black text-slate-800">
              {isExempt ? t('finance.receipt_title_exempt') : t('finance.receipt_title_paid')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {payment.academic_year_label} | {t('finance.receipt_month_label')} {payment.month_ref}
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">{t('finance.receipt_student_label')}</span>
              <span className="font-bold text-slate-900">{payment.student_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">{t('finance.receipt_reg_label')}</span>
              <span className="font-mono font-bold text-blue-600">{payment.reg_no}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">{t('finance.receipt_group_label')}</span>
              <span className="font-bold text-slate-900">{payment.group_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">{t('finance.receipt_date_label')}</span>
              <span className="font-mono font-medium text-slate-700">{DateTimeFormatter.formatDate(payment.payment_date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">{t('finance.payment_notes')}:</span>
              <span className="font-medium text-slate-700">{payment.notes || '-'}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className={`p-4 rounded-2xl flex items-center justify-between border ${
            isExempt 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2">
              {isExempt ? <Award className="w-6 h-6 text-emerald-600" /> : <CheckCircle2 className="w-6 h-6 text-blue-600" />}
              <span className="font-bold text-base">
                {isExempt ? t('finance.receipt_status_exempt') : t('finance.receipt_amount_label')}
              </span>
            </div>
            <div className="text-2xl font-black font-mono">
              {isExempt ? `0.00 ${currency}` : `${parseFloat(payment.amount).toFixed(2)} ${currency}`}
            </div>
          </div>

          {/* Footer Notes & Stamps */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500 gap-4">
            <div className="max-w-xs space-y-1">
              <p className="text-[11px] leading-relaxed">
                {settings?.receipt_footer_notes || t('finance.receipt_thanks')}
              </p>
              <p className="font-mono text-[10px] text-slate-400">
                QAF-SEC-{payment.id}-OK
              </p>
            </div>
            
            {/* Administrative Stamp & Signature */}
            <div className="text-center relative flex flex-col items-center">
              <span className="block mb-2 font-bold text-slate-700">{t('finance.receipt_cashier_sig')}</span>
              <div className="relative w-36 h-20 flex items-center justify-center">
                {settings?.stamp_signature_url ? (
                  <img
                    src={settings.stamp_signature_url}
                    alt={t('finance.receipt_cashier_sig')}
                    className="max-h-full max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <span className="inline-block w-28 border-b border-dashed border-slate-400 mt-8"></span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
