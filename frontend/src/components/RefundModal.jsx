import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import DateInput from './DateInput';
import api from '../services/api';

export default function RefundModal({
  isOpen,
  onClose,
  student,
  group,
  monthRef,
  onSuccess
}) {
  const { t, currency, dir } = useLanguage();

  const [amount, setAmount] = useState('');
  const [refundDate, setRefundDate] = useState(() => DateTimeFormatter.toInputDate());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Determine refundable amount
  const grossPaid = parseFloat(student?.payment_info?.gross_paid_amount ?? student?.payment_info?.paid_amount ?? 0);
  const alreadyRefunded = parseFloat(student?.payment_info?.refunded_amount ?? 0);
  const maxRefundable = Math.max(0, grossPaid - alreadyRefunded);

  useEffect(() => {
    if (isOpen) {
      setAmount(maxRefundable > 0 ? maxRefundable.toString() : '0');
      setRefundDate(DateTimeFormatter.toInputDate());
      setNotes('');
      setError(null);
    }
  }, [isOpen, maxRefundable]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('refund.error_invalid_amount', 'يرجى إدخال مبلغ استرداد صحيح أكبر من الصفر'));
      return;
    }

    if (numAmount > maxRefundable) {
      setError(t('refund.error_exceeds_max', { max: maxRefundable }, `مبلغ الاسترداد لا يمكن أن يتجاوز المبلغ المدفوع (${maxRefundable} ${currency})`));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        academic_year_id: group?.academic_year_id,
        student_id: student.student_id,
        group_id: group?.id,
        enrollment_id: student.enrollment_id,
        amount: numAmount,
        refund_date: refundDate,
        month_ref: monthRef || student.payment_info?.month_ref || new Date().toISOString().slice(0, 7),
        notes: notes.trim() || t('refund.default_note', 'استرداد مالي لاشتراك الفوج إثر إيقاف/انسحاب الطالب')
      };

      const res = await api.post('/finance/refunds', payload);

      if (res.data.success) {
        onSuccess(res.data.data, res.data.message);
        onClose();
      }
    } catch (err) {
      console.error('Refund error:', err);
      setError(err.response?.data?.message || t('refund.error_generic', 'فشلت عملية تسجيل الاسترداد'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetQuickAmount = (ratio) => {
    const val = Math.round(maxRefundable * ratio * 100) / 100;
    setAmount(val.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir={dir}>
      <div className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold border border-rose-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-text-main">
                {t('refund.modal_title', 'استرداد مالي للطالب')}
              </h3>
              <p className="text-xs text-text-muted">
                {student.student_name} • {student.reg_no}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">{t('refund.group_label', 'الفوج')}:</span>
              <span className="font-bold text-text-main">{group?.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">{t('refund.month_label', 'شهر الاشتراك')}:</span>
              <span className="font-mono font-bold text-primary">
                {monthRef || student.payment_info?.month_ref}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">{t('refund.paid_amount_label', 'المبلغ المدفوع')}:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {grossPaid.toLocaleString()} {currency}
              </span>
            </div>
            {alreadyRefunded > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">{t('refund.already_refunded_label', 'مسترد سابقاً')}:</span>
                <span className="font-mono font-bold text-rose-500">
                  -{alreadyRefunded.toLocaleString()} {currency}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
              <span className="font-bold text-text-main">{t('refund.max_refundable_label', 'الحد الأقصى القابل للاسترداد')}:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                {maxRefundable.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Refund Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('refund.amount_input_label', 'مبلغ الاسترداد')} ({currency})</span>
              </label>
              {/* Quick Ratio Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickAmount(1)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-surface hover:bg-rose-500/10 hover:text-rose-600 border border-border text-text-muted transition-colors cursor-pointer"
                >
                  100% {t('refund.full', 'كامل')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickAmount(0.5)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-surface hover:bg-rose-500/10 hover:text-rose-600 border border-border text-text-muted transition-colors cursor-pointer"
                >
                  50% {t('refund.half', 'نصف')}
                </button>
              </div>
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              max={maxRefundable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border focus:border-rose-500 focus:outline-none text-text-main font-mono text-base font-bold transition-colors"
            />
          </div>

          {/* Refund Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{t('refund.date_label', 'تاريخ الاسترداد')}</span>
            </label>
            <DateInput
              value={refundDate}
              onChange={(e) => setRefundDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border focus:border-primary focus:outline-none text-text-main text-xs font-bold transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-text-muted" />
              <span>{t('refund.notes_label', 'ملاحظات / سبب الاسترداد')}</span>
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('refund.notes_placeholder', 'سبب الاسترداد (توقف عن الدراسة، ظرف طارئ...)')}
              className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:border-primary focus:outline-none text-text-main text-xs transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface rounded-xl border border-border transition-colors cursor-pointer"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={submitting || maxRefundable <= 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? t('common.saving', 'جاري التسجيل...') : t('refund.confirm_btn', 'تأكيد وصرف الاسترداد')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
