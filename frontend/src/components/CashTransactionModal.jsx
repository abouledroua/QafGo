import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  DollarSign, 
  Calendar, 
  Clock, 
  Tag, 
  User, 
  FileText, 
  CreditCard,
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import DateInput from './DateInput';
import TimeInput from './TimeInput';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import api from '../services/api';

export default function CashTransactionModal({
  isOpen,
  onClose,
  academicYearId,
  initialType = 'ALIMENTATION',
  onSuccess
}) {
  const { t, isRtl, dir, currency } = useLanguage();
  const { showNotification } = useNotification();

  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('SUPPLIES');
  const [customCategory, setCustomCategory] = useState('');
  const [beneficiaryOrSource, setBeneficiaryOrSource] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => DateTimeFormatter.toInputDate());
  const [transactionTime, setTransactionTime] = useState(() => DateTimeFormatter.toInputTime());
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setType(initialType || 'ALIMENTATION');
      setAmount('');
      setCategory(initialType === 'ALIMENTATION' ? 'CAPITAL' : 'SUPPLIES');
      setCustomCategory('');
      setBeneficiaryOrSource('');
      setTransactionDate(DateTimeFormatter.toInputDate());
      setTransactionTime(DateTimeFormatter.toInputTime());
      setPaymentMethod('CASH');
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialType]);

  // Adjust default category when type toggles
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'ALIMENTATION') {
      setCategory('CAPITAL');
    } else {
      setCategory('SUPPLIES');
    }
  };

  if (!isOpen) return null;

  const isAlimentation = type === 'ALIMENTATION';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('caisse.invalid_amount', 'يرجى إدخال مبلغ مالي صحيح أكبر من 0'));
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/finance/cash-transactions', {
        academic_year_id: academicYearId,
        type,
        amount: numAmount,
        category: category === 'CUSTOM' ? (customCategory || 'OTHER') : category,
        beneficiary_or_source: beneficiaryOrSource.trim() || null,
        transaction_date: transactionDate,
        transaction_time: transactionTime,
        payment_method: paymentMethod,
        notes: notes.trim() || null
      });

      if (res.success) {
        showNotification(res.message || t('common.success'), 'success');
        if (onSuccess) {
          onSuccess(res.data);
        }
        onClose();
      } else {
        setError(res.message || t('common.error'));
      }
    } catch (err) {
      console.error('Error recording cash transaction:', err);
      setError(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir={dir}>
      <div className="w-full max-w-xl bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`p-5 text-white flex items-center justify-between transition-colors ${
          isAlimentation
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : 'bg-gradient-to-r from-rose-600 to-red-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              {isAlimentation ? (
                <ArrowDownCircle className="w-6 h-6 text-white" />
              ) : (
                <ArrowUpCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight">
                {isAlimentation
                  ? t('caisse.modal_title_in', 'تغذية الصندوق / إيداع نقدية')
                  : t('caisse.modal_title_out', 'سحب من الصندوق / تسجيل مصروف')}
              </h2>
              <p className="text-xs text-white/80 font-medium">
                {t('caisse.modal_subtitle', 'إدارة حركة السيولة النقدية في الخزينة (La Caisse)')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-2 font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle Segmented Control */}
          <div className="p-1.5 bg-surface rounded-2xl border border-border grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleTypeChange('ALIMENTATION')}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isAlimentation
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>{t('caisse.type_inflow', 'تغذية / إيداع (Alimentation)')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('RETRAIT')}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isAlimentation
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>{t('caisse.type_outflow', 'سحب / مصروف (Retrait)')}</span>
            </button>
          </div>

          {/* Amount Field */}
          <div className="space-y-1.5">
            <label className="font-bold text-text-main flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className={`w-4 h-4 ${isAlimentation ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>{t('common.amount', 'المبلغ المالي')} <span className="text-rose-500">*</span></span>
              </span>
              <span className="text-text-muted font-normal text-[11px]">{currency}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl bg-surface border text-base font-black font-mono focus:outline-none transition-all ${
                  isAlimentation
                    ? 'border-border focus:border-emerald-500 text-emerald-600'
                    : 'border-border focus:border-rose-500 text-rose-600'
                }`}
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 font-bold text-text-muted text-xs">
                {currency}
              </span>
            </div>
          </div>

          {/* Date & Time Grid (Standardized JJ/MM/AAAA & HH:SS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-text-main flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{t('common.date', 'تاريخ الحركة')} <span className="text-rose-500">*</span></span>
              </label>
              <DateInput
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-main focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-text-main flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{t('common.time', 'وقت الحركة')}</span>
              </label>
              <TimeInput
                value={transactionTime}
                onChange={(e) => setTransactionTime(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-main focus:outline-none"
              />
            </div>
          </div>

          {/* Category & Beneficiary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-text-main flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-text-muted" />
                <span>{t('caisse.category_label', 'فئة الحركة / البيان')} <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none cursor-pointer"
              >
                {isAlimentation ? (
                  <>
                    <option value="CAPITAL">{t('caisse.cat_capital', 'رأس مال / تمويل خارجي')}</option>
                    <option value="TUITION_ADJUSTMENT">{t('caisse.cat_tuition_adj', 'تسوية اشتراكات نقدية')}</option>
                    <option value="DONATION">{t('caisse.cat_donation', 'تبرعات وإعانات')}</option>
                    <option value="OTHER">{t('caisse.cat_other', 'أخرى / عام')}</option>
                    <option value="CUSTOM">{t('caisse.cat_custom', '+ فئة مخصصة...')}</option>
                  </>
                ) : (
                  <>
                    <option value="SUPPLIES">{t('caisse.cat_supplies', 'أدوات ولوازم تعليمية ومكتبية')}</option>
                    <option value="UTILITIES">{t('caisse.cat_utilities', 'فواتير (ماء، كهرباء، إنترنت)')}</option>
                    <option value="MAINTENANCE">{t('caisse.cat_maintenance', 'صيانة وإصلاحات')}</option>
                    <option value="SALARY">{t('caisse.cat_salary', 'رواتب ومكافآت')}</option>
                    <option value="RENT">{t('caisse.cat_rent', 'إيجار المقر')}</option>
                    <option value="OWNER_WITHDRAWAL">{t('caisse.cat_owner_withdrawal', 'مسحوبات شخصية')}</option>
                    <option value="OTHER">{t('caisse.cat_other', 'أخرى / عام')}</option>
                    <option value="CUSTOM">{t('caisse.cat_custom', '+ فئة مخصصة...')}</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-text-main flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-text-muted" />
                <span>{isAlimentation ? t('caisse.source_label', 'المودع / المصدر') : t('caisse.beneficiary_label', 'المستفيد / الجهة')}</span>
              </label>
              <input
                type="text"
                value={beneficiaryOrSource}
                onChange={(e) => setBeneficiaryOrSource(e.target.value)}
                placeholder={isAlimentation ? t('caisse.source_placeholder', 'اسم المودع أو الجهة...') : t('caisse.beneficiary_placeholder', 'اسم المورد أو المستفيد...')}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Category input if chosen */}
          {category === 'CUSTOM' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="font-bold text-text-main">
                {t('caisse.custom_cat_label', 'اكتب اسم الفئة المخصصة')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t('caisse.custom_cat_placeholder', 'اسم الفئة...')}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-text-main flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-text-muted" />
              <span>{t('common.notes', 'ملاحظات وتفاصيل إضافية')}</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('caisse.notes_placeholder', 'بيان توضيحي أو سبب الحركة...')}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-main font-bold text-xs transition-colors cursor-pointer"
            >
              {t('common.cancel', 'إلغاء')}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                isAlimentation
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? t('common.saving', 'جارِ الحفظ...')
                  : isAlimentation
                    ? t('caisse.btn_confirm_in', 'تسجيل تغذية الصندوق')
                    : t('caisse.btn_confirm_out', 'تسجيل سحب الصندوق')}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
