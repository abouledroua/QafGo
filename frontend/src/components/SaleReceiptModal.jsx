import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ShoppingBag, CheckCircle2, AlertCircle } from 'lucide-react';
import QafGoLogo from './QafGoLogo';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function SaleReceiptModal({ isOpen, onClose, sale, paymentInstallment, studentName, studentRegNo }) {
  const { settings, receiptPaperSize, setReceiptPaperSize } = useSettings();
  const { t, isRtl, dir } = useLanguage();

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

  if (!isOpen || !sale) return null;

  const currency = settings?.currency_symbol || (isRtl ? 'د.ج' : 'DZD');
  const isFullyPaid = parseFloat(sale.remaining_debt || 0) === 0;
  const isInstallment = !!paymentInstallment;

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber = isInstallment ? paymentInstallment.receipt_no : sale.receipt_no;
  const receiptDate = isInstallment ? paymentInstallment.payment_date : sale.sale_date;
  const displayStudentName = sale.student_name || sale.full_name || studentName || '—';
  const displayRegNo = sale.student_reg_no || sale.reg_no || studentRegNo || '—';

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
              {t('products.receipt_preview_title', 'معاينة وصل المبيعات الرسمي')}
            </span>
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
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{t('finance.print_receipt_btn', 'طباعة الوصل')} ({isA5 ? 'A5' : 'A4'})</span>
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
        <div className={`p-6 sm:p-8 ${isA5 ? 'print:p-3 print:space-y-3 space-y-4 receipt-a5-body' : 'print:p-6 print:space-y-5 space-y-5'}`}>
          
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
                  <p className="text-[11px] font-bold text-primary">
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
                isFullyPaid 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isFullyPaid ? t('products.status_paid', 'خالص بالكامل') : t('products.status_debt', 'مبيعات مع دين')}
              </span>
              <div className="text-xs font-mono font-bold text-slate-600 mt-1">
                {t('products.receipt_no_label', 'رقم الوصل:')} {receiptNumber}
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className="text-center py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span>
                {isInstallment 
                  ? t('products.receipt_debt_pay_title', 'وصل سداد دين مشتريات') 
                  : t('products.receipt_sale_title', 'وصل تسليم ومبيعات أدوات مدرسية')}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {DateTimeFormatter.formatDate(receiptDate)}
            </p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">{t('products.student_name', 'اسم الطالب:')}</span>
              <span className="font-bold text-slate-900 text-sm">{displayStudentName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{t('products.reg_no', 'رقم التسجيل:')}</span>
              <span className="font-mono font-bold text-primary text-sm">{displayRegNo}</span>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5 text-start">{t('products.table_designation', 'المنتج / البيان')}</th>
                  <th className="p-2.5 text-center">{t('products.table_quantity', 'الكمية')}</th>
                  <th className="p-2.5 text-center">{t('products.table_unit_price', 'سعر الوحدة')}</th>
                  <th className="p-2.5 text-end">{t('products.table_total', 'المبلغ الإجمالي')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">{sale.product_name}</td>
                  <td className="p-2.5 text-center font-mono font-bold">{sale.quantity}</td>
                  <td className="p-2.5 text-center font-mono">{parseFloat(sale.unit_price).toFixed(2)} {currency}</td>
                  <td className="p-2.5 text-end font-mono font-black text-slate-900">
                    {parseFloat(sale.total_amount).toFixed(2)} {currency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Settlement Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 font-medium">{t('products.total_amount', 'المبلغ الإجمالي للمشتريات')}:</span>
              <span className="font-mono font-bold text-slate-900">{parseFloat(sale.total_amount).toFixed(2)} {currency}</span>
            </div>
            
            {isInstallment && (
              <div className="flex justify-between items-center py-1 bg-emerald-50 px-2 rounded-lg text-emerald-800">
                <span className="font-bold">{t('products.installment_amount', 'مبلغ الدفعة الحالية المسددة')}:</span>
                <span className="font-mono font-black text-sm">+{parseFloat(paymentInstallment.amount).toFixed(2)} {currency}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 font-medium">{t('products.paid_amount', 'إجمالي المبلغ المدفوع')}:</span>
              <span className="font-mono font-bold text-emerald-700">{parseFloat(sale.paid_amount).toFixed(2)} {currency}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800 text-sm">{t('products.remaining_debt', 'الدين المتبقي المستحق')}:</span>
              <span className={`font-mono font-black text-base ${parseFloat(sale.remaining_debt || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {parseFloat(sale.remaining_debt || 0).toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {sale.notes && (
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700">{t('common.notes', 'ملاحظات')}: </span>
              {sale.notes}
            </div>
          )}

          {/* Signatures & Stamp Footer */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
            <div className="text-center w-36">
              <span className="text-slate-400 block mb-8">{t('products.guardian_signature', 'توقيع الولي / الطالب')}</span>
              <div className="border-b border-slate-300 w-full" />
            </div>

            <div className="text-center w-44">
              <span className="text-slate-400 block mb-2">{t('products.administration_stamp', 'ختم وتوقيع الإدارة')}</span>
              {settings?.stamp_url ? (
                <img src={settings.stamp_url} alt="Stamp" className="w-20 h-20 object-contain mx-auto opacity-80" />
              ) : (
                <div className="h-16 flex items-center justify-center text-[10px] text-slate-300 italic border border-dashed border-slate-200 rounded-lg">
                  {t('products.official_stamp', 'الختم الرسمي')}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
