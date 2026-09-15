import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ArrowDownCircle, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import QafGoLogo from './QafGoLogo';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function CashReceiptModal({ isOpen, onClose, transaction }) {
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

  if (!isOpen || !transaction) return null;

  const isAlimentation = transaction.type === 'ALIMENTATION';
  const currency = settings?.currency_symbol || (isRtl ? 'د.ج' : 'DZD');

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = DateTimeFormatter.formatDate(transaction.transaction_date);
  const formattedTime = transaction.transaction_time ? String(transaction.transaction_time).substring(0, 5) : '';

  const getCategoryLabel = (cat) => {
    const map = {
      'SUPPLIES': t('caisse.cat_supplies', 'أدوات ولوازم'),
      'UTILITIES': t('caisse.cat_utilities', 'فواتير (ماء، كهرباء، إنترنت)'),
      'MAINTENANCE': t('caisse.cat_maintenance', 'صيانة وإصلاحات'),
      'SALARY': t('caisse.cat_salary', 'رواتب ومكافآت'),
      'RENT': t('caisse.cat_rent', 'إيجار المقر'),
      'CAPITAL': t('caisse.cat_capital', 'رأس مال / تمويل خارجي'),
      'OWNER_WITHDRAWAL': t('caisse.cat_owner_withdrawal', 'مسحوبات شخصية'),
      'OTHER': t('caisse.cat_other', 'أخرى / عام')
    };
    return map[cat] || cat || t('caisse.cat_other', 'أخرى');
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
              {t('caisse.receipt_preview_title', 'معاينة وصل حركة الصندوق الرسمي')}
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
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('finance.print_receipt_btn', 'طباعة الوصل')} ({isA5 ? 'A5' : 'A4'})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Voucher Content */}
        <div className={`p-6 sm:p-8 ${isA5 ? 'print:p-3 print:space-y-3 space-y-4 receipt-a5-body' : 'print:p-6 print:space-y-5 space-y-6'}`}>
          
          {/* Institutional Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden">
                {settings?.school_logo ? (
                  <img
                    src={settings.school_logo.startsWith('http') ? settings.school_logo : `/api/${settings.school_logo.replace(/^\/+/, '')}`}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QafGoLogo className="w-10 h-10 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {settings?.school_name || t('app.name', 'قاف غو التعليمية')}
                </h2>
                <p className="text-[11px] font-bold text-slate-500">
                  {settings?.school_subtitle || t('app.tagline', 'إدارة المسارات والأنشطة')}
                </p>
                {settings?.school_phone && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    {settings.school_phone} {settings?.school_address ? `• ${settings.school_address}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Voucher Number and Date */}
            <div className="text-end">
              <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                isAlimentation
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                {isAlimentation ? (
                  <>
                    <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('caisse.voucher_inflow', 'وصل إيداع / تغذية')}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{t('caisse.voucher_outflow', 'وصل سحب / مصروف')}</span>
                  </>
                )}
              </span>
              <div className="text-xs font-mono font-bold text-slate-700 mt-1.5">
                {transaction.receipt_no}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                {formattedDate} {formattedTime ? `| ${formattedTime}` : ''}
              </div>
            </div>
          </div>

          {/* Central Title */}
          <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-200/80">
            <h3 className="text-base font-black text-slate-900">
              {isAlimentation
                ? t('caisse.receipt_in_title', 'وصل تغذية وإيداع في الصندوق (Bon d’Alimentation Caisse)')
                : t('caisse.receipt_out_title', 'وصل سحب ومصروف من الصندوق (Bon de Retrait Caisse)')}
            </h3>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                {t('caisse.category_label', 'فئة الحركة / البيان')}:
              </span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 inline-block">
                {getCategoryLabel(transaction.category)}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                {isAlimentation ? t('caisse.source_label', 'المودع / المصدر') : t('caisse.beneficiary_label', 'المستفيد / الجهة')}:
              </span>
              <span className="font-bold text-slate-800">
                {transaction.beneficiary_or_source || '—'}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                {t('caisse.payment_method_label', 'طريقة الدفع')}:
              </span>
              <span className="font-bold text-slate-800">
                {transaction.payment_method === 'CASH' || !transaction.payment_method ? t('common.cash', 'نقداً (كاش)') : transaction.payment_method}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                {t('caisse.performed_by_label', 'أمين الصندوق / المنفذ')}:
              </span>
              <span className="font-bold text-slate-700">
                {transaction.user_name || '—'}
              </span>
            </div>

            <div className="col-span-2">
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                {t('common.notes', 'ملاحظات / تفاصيل إضافية')}:
              </span>
              <span className="text-slate-700 italic font-medium">
                {transaction.notes || '—'}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isAlimentation
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-rose-50/60 border-rose-300'
          }`}>
            <div>
              <span className="text-xs font-bold text-slate-600 block">
                {isAlimentation ? t('caisse.amount_in_label', 'المبلغ المودع في الصندوق:') : t('caisse.amount_out_label', 'المبلغ المسحوب من الصندوق:')}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {isAlimentation ? t('caisse.cash_inflow_notice', 'تم إدخال هذا المبلغ في الخزينة النقدية') : t('caisse.cash_outflow_notice', 'تم خصم هذا المبلغ من الخزينة النقدية')}
              </span>
            </div>

            <div className="text-end">
              <div className={`text-2xl sm:text-3xl font-black font-cairo ${
                isAlimentation ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isAlimentation ? '+' : '-'}{parseFloat(transaction.amount || 0).toLocaleString()} <span className="text-sm font-bold">{currency}</span>
              </div>
            </div>
          </div>

          {/* Signature & Seal Block */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
            <div className="text-center p-3 border border-dashed border-slate-300 rounded-xl min-h-[90px] flex flex-col justify-between">
              <span className="font-bold text-slate-600 block">
                {t('caisse.sign_cashier', 'توقيع أمين الصندوق / المحاسب')}
              </span>
              <span className="text-[10px] text-slate-400">
                {transaction.user_name ? `(${transaction.user_name})` : ''}
              </span>
            </div>

            <div className="text-center p-3 border border-dashed border-slate-300 rounded-xl min-h-[90px] flex flex-col justify-between">
              <span className="font-bold text-slate-600 block">
                {isAlimentation ? t('caisse.sign_depositor', 'توقيع المودع / المسلّم') : t('caisse.sign_recipient', 'توقيع المستلم / المستفيد')}
              </span>
              <span className="text-[10px] text-slate-400">
                {transaction.beneficiary_or_source ? `(${transaction.beneficiary_or_source})` : ''}
              </span>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="pt-2 text-center text-[10px] text-slate-400">
            {t('common.printed_via', 'طبع عبر منصة قاف غو (QafGo)')} • {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
