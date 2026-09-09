import React, { useState, useEffect, useCallback } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { 
  Wallet, 
  Receipt, 
  Award, 
  AlertCircle, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  Filter, 
  X,
  CreditCard
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function FinancePage() {
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { showNotification } = useNotification();
  const { t, isRtl, dir } = useLanguage();

  const [activeTab, setActiveTab] = useState('PAYMENTS'); // 'PAYMENTS' | 'UNPAID'
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [unpaidStudents, setUnpaidStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month reference filter (e.g. 2025-10)
  const [selectedMonth, setSelectedMonth] = useState('2025-10');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'PAID' | 'EXEMPTED' | ''

  // New Payment / Voucher Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    group_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    month_ref: '2025-10',
    payment_status: 'PAID',
    notes: ''
  });

  // Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState(null);

  const fetchFinanceData = useCallback(async () => {
    if (!selectedYearId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // 1. Overview stats
      const overRes = await api.get(`/finance/overview?academic_year_id=${selectedYearId}`);
      if (overRes.success) setOverview(overRes.data);

      // 2. Payments ledger
      let pUrl = `/finance/payments?academic_year_id=${selectedYearId}`;
      if (statusFilter) pUrl += `&status=${statusFilter}`;
      if (searchTerm) pUrl += `&search=${encodeURIComponent(searchTerm)}`;
      const pRes = await api.get(pUrl);
      if (pRes.success) setPayments(pRes.data);

      // 3. Unpaid dues
      const unRes = await api.get(`/finance/unpaid?academic_year_id=${selectedYearId}&month_ref=${selectedMonth}`);
      if (unRes.success) setUnpaidStudents(unRes.data);

    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, statusFilter, searchTerm, selectedMonth, showNotification, t]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  // Load students for payment modal
  useEffect(() => {
    if (modalOpen && selectedYearId) {
      api.get(`/students?academic_year_id=${selectedYearId}`).then(res => {
        if (res.success && res.data.length > 0) {
          setStudentsList(res.data);
          handleSelectStudentInModal(res.data[0]);
        }
      }).catch(console.error);
    }
  }, [modalOpen, selectedYearId]);

  const handleSelectStudentInModal = (student) => {
    setPaymentForm(prev => ({
      ...prev,
      student_id: student.id,
      group_id: student.enrollments?.[0]?.group_id || '',
      amount: student.enrollments?.[0]?.monthly_fee || 1500
    }));
    setStudentEnrollments(student.enrollments || []);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/payments', {
        ...paymentForm,
        academic_year_id: selectedYearId,
        student_id: parseInt(paymentForm.student_id, 10),
        group_id: parseInt(paymentForm.group_id, 10)
      });

      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setModalOpen(false);
        fetchFinanceData();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    }
  };

  const handleQuickPayUnpaid = (unpaidItem, isExemption = false) => {
    setPaymentForm({
      student_id: unpaidItem.student_id,
      group_id: unpaidItem.group_id,
      amount: isExemption ? 0 : unpaidItem.expected_amount,
      payment_date: new Date().toISOString().split('T')[0],
      month_ref: unpaidItem.month_ref,
      payment_status: isExemption ? 'EXEMPTED' : 'PAID',
      notes: isExemption ? t('finance.type_exemption') : t('finance.type_regular')
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-text-main">
            {t('finance.title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('finance.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>{t('finance.record_payment_btn')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-surface-card border border-border rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted">{t('finance.kpi_revenue')}</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-text-main font-cairo">
            {parseFloat(overview?.financial?.total_revenue || 0).toLocaleString()} <span className="text-xs font-bold text-text-muted">دج</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {t('finance.kpi_receipts')}: {overview?.financial?.total_paid_receipts || 0}
          </p>
        </div>

        <div className="p-5 bg-surface-card border border-border rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted">{t('finance.kpi_exemptions')}</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-cairo">
            {overview?.financial?.total_exemption_vouchers || 0}
          </div>
        </div>

        <div className="p-5 bg-surface-card border border-border rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted">{t('tracks.free_badge')}</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 font-cairo">
            {overview?.enrollments?.students_in_free_groups || 0}
          </div>
        </div>

        <div className="p-5 bg-surface-card border border-border rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted">{t('finance.kpi_unpaid_count')} ({selectedMonth})</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-cairo">
            {unpaidStudents.length}
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'PAYMENTS'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{t('finance.tab_payments')} ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('UNPAID')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'UNPAID'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>{t('finance.tab_unpaid')} ({unpaidStudents.length})</span>
        </button>
      </div>

      {/* Tab 1: Payments & Vouchers Ledger */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-surface-card border border-border rounded-2xl">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1">
                <Search className={`w-4 h-4 text-text-muted absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                <input
                  type="text"
                  placeholder={t('finance.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
              >
                <option value="">{t('finance.filter_all_statuses')}</option>
                <option value="PAID">{t('finance.filter_paid_only')}</option>
                <option value="EXEMPTED">{t('finance.filter_exempted_only')}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-surface text-text-muted text-xs font-bold border-b border-border">
                  <tr>
                    <th className="p-4 text-start">{t('finance.table_receipt_no')}</th>
                    <th className="p-4 text-start">{t('finance.table_student')}</th>
                    <th className="p-4 text-start">{t('finance.table_month')}</th>
                    <th className="p-4 text-start">{t('finance.table_group')}</th>
                    <th className="p-4 text-start">{t('finance.table_amount')}</th>
                    <th className="p-4 text-start">{t('finance.table_status')}</th>
                    <th className="p-4 text-start">{t('finance.table_date')}</th>
                    <th className="p-4 text-center">{t('finance.table_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-text-muted">
                        {t('student_profile.no_payments')}
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const isExempt = p.payment_status === 'EXEMPTED';
                      return (
                        <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-primary">{p.receipt_no}</td>
                          <td className="p-4 font-bold text-text-main">{p.student_name}</td>
                          <td className="p-4 font-mono">{p.month_ref}</td>
                          <td className="p-4 text-text-muted">{p.group_name}</td>
                          <td className="p-4 font-mono font-bold text-sm">
                            {isExempt ? '0.00 دج' : `${parseFloat(p.amount).toLocaleString()} دج`}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded text-[11px] font-bold ${
                              isExempt 
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' 
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                            }`}>
                              {isExempt ? t('finance.receipt_title_exempt') : t('finance.receipt_title_paid')}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-text-muted">{DateTimeFormatter.formatDate(p.payment_date)}</td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPaymentForReceipt(p);
                                setReceiptModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-text-main border border-border transition-colors"
                              title={t('finance.receipt_preview_title')}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Unpaid Dues Detector */}
      {activeTab === 'UNPAID' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {t('finance.tab_unpaid')}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted whitespace-nowrap">{t('finance.filter_month')}</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main font-mono"
              />
            </div>
          </div>

          <div className="bg-surface-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-surface text-text-muted text-xs font-bold border-b border-border">
                  <tr>
                    <th className="p-4 text-start">{t('students.reg_no')}</th>
                    <th className="p-4 text-start">{t('finance.unpaid_table_student')}</th>
                    <th className="p-4 text-start">{t('finance.unpaid_table_group')}</th>
                    <th className="p-4 text-start">{t('finance.unpaid_table_fee')}</th>
                    <th className="p-4 text-start">{t('students.fees_status')}</th>
                    <th className="p-4 text-start">{t('finance.unpaid_table_due')}</th>
                    <th className="p-4 text-start">{t('finance.unpaid_table_guardian')}</th>
                    <th className="p-4 text-center">{t('finance.unpaid_table_action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {unpaidStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-emerald-600 font-bold">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                        0 {t('finance.tab_unpaid')} ({selectedMonth})
                      </td>
                    </tr>
                  ) : (
                    unpaidStudents.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface/50">
                        <td className="p-4 font-mono font-bold text-primary">{item.reg_no}</td>
                        <td className="p-4 font-bold text-text-main">{item.student_name}</td>
                        <td className="p-4 text-text-muted">{item.group_name}</td>
                        <td className="p-4 font-mono">{item.original_fee} دج</td>
                        <td className="p-4">
                          {item.discount_type === 'PERCENTAGE' && <span className="text-primary font-bold">%{item.discount_value}</span>}
                          {item.discount_type === 'FIXED_AMOUNT' && <span className="text-primary font-bold">{item.discount_value} دج</span>}
                          {item.discount_type === 'NONE' && <span className="text-text-muted">-</span>}
                        </td>
                        <td className="p-4 font-mono font-bold text-rose-600 text-sm">
                          {item.expected_amount} دج
                        </td>
                        <td className="p-4 text-text-muted">
                          <div>{item.guardian_name || '-'}</div>
                          <div className="font-mono mt-0.5">{item.guardian_phone}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickPayUnpaid(item, false)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                            >
                              {t('finance.settle_now_btn')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPayUnpaid(item, true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                            >
                              {t('finance.type_exemption')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* New Payment / Voucher Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xl font-bold text-text-main">
                {paymentForm.payment_status === 'EXEMPTED' ? t('finance.receipt_title_exempt') : t('finance.modal_payment_title')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('finance.payment_type')}</label>
                  <select
                    value={paymentForm.payment_status}
                    onChange={(e) => {
                      const st = e.target.value;
                      setPaymentForm({
                        ...paymentForm,
                        payment_status: st,
                        amount: st === 'EXEMPTED' ? 0 : paymentForm.amount
                      });
                    }}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main"
                  >
                    <option value="PAID">{t('finance.type_regular')}</option>
                    <option value="EXEMPTED">{t('finance.type_exemption')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('finance.month_ref')}</label>
                  <input
                    type="month"
                    value={paymentForm.month_ref}
                    onChange={(e) => setPaymentForm({ ...paymentForm, month_ref: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('finance.select_student')}</label>
                <select
                  value={paymentForm.student_id}
                  onChange={(e) => {
                    const st = studentsList.find(s => s.id == e.target.value);
                    if (st) handleSelectStudentInModal(st);
                  }}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main"
                  required
                >
                  {studentsList.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.reg_no})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('finance.select_group')}</label>
                  <select
                    value={paymentForm.group_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, group_id: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main"
                    required
                  >
                    {studentEnrollments.map(en => (
                      <option key={en.group_id} value={en.group_id}>{en.group_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('finance.payment_amount')}
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    disabled={paymentForm.payment_status === 'EXEMPTED'}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-mono font-bold text-text-main disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('finance.payment_notes')}</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md"
                >
                  {t('finance.save_payment_btn')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptModalOpen && (
        <ReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          payment={selectedPaymentForReceipt}
        />
      )}

    </div>
  );
}
