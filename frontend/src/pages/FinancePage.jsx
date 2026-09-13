import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  CreditCard,
  ShoppingBag,
  Clock
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import SaleReceiptModal from '../components/SaleReceiptModal';
import { DateTimeFormatter, getConsecutiveMonths } from '../utils/dateTimeFormatter';

export default function FinancePage() {
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { showNotification } = useNotification();
  const { t, isRtl, dir } = useLanguage();

  const [activeTab, setActiveTab] = useState('PAYMENTS'); // 'PAYMENTS' | 'PRODUCT_SALES' | 'UNPAID'
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [unpaidStudents, setUnpaidStudents] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [productSalesSearch, setProductSalesSearch] = useState('');
  const [productSalesStatusFilter, setProductSalesStatusFilter] = useState('');
  const [productSalesProductFilter, setProductSalesProductFilter] = useState('');
  const [productSalesPeriodFilter, setProductSalesPeriodFilter] = useState('today');
  const [productSalesSpecificDate, setProductSalesSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [productSalesStartDate, setProductSalesStartDate] = useState('');
  const [productSalesEndDate, setProductSalesEndDate] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null);
  const [saleReceiptModalOpen, setSaleReceiptModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Month reference filter defaults to current month (e.g. YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'PAID' | 'EXEMPTED' | ''

  // New Payment / Voucher Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    group_id: '',
    months_count: 1,
    single_month_fee: 1500,
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    month_ref: currentMonthStr,
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

      // 4. Product sales ledger
      let psUrl = `/products/sales?academic_year_id=${selectedYearId}`;
      if (productSalesStatusFilter) psUrl += `&status=${productSalesStatusFilter}`;
      if (productSalesProductFilter) psUrl += `&product_id=${productSalesProductFilter}`;
      if (productSalesSearch) psUrl += `&search=${encodeURIComponent(productSalesSearch)}`;

      // Date & period filtering
      if (productSalesPeriodFilter === 'custom_date' && productSalesSpecificDate) {
        psUrl += `&date=${productSalesSpecificDate}`;
      } else if (productSalesPeriodFilter === 'custom_range') {
        if (productSalesStartDate) psUrl += `&start_date=${productSalesStartDate}`;
        if (productSalesEndDate) psUrl += `&end_date=${productSalesEndDate}`;
      } else if (productSalesPeriodFilter && productSalesPeriodFilter !== 'all') {
        psUrl += `&period=${productSalesPeriodFilter}`;
      }

      const psRes = await api.get(psUrl);
      if (psRes.success) setProductSales(psRes.data || []);

    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, statusFilter, searchTerm, selectedMonth, productSalesStatusFilter, productSalesProductFilter, productSalesPeriodFilter, productSalesSpecificDate, productSalesStartDate, productSalesEndDate, productSalesSearch, showNotification, t]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  // Load available products for filter
  useEffect(() => {
    api.get('/products').then(res => {
      if (res.success && res.data) setAvailableProducts(res.data);
    }).catch(console.error);
  }, []);

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

  const financeCoveredMonths = useMemo(() => {
    return getConsecutiveMonths(paymentForm.month_ref, paymentForm.months_count || 1);
  }, [paymentForm.month_ref, paymentForm.months_count]);

  const handleMonthsCountChange = (val) => {
    const safeCount = Math.max(1, parseInt(val, 10) || 1);
    const baseFee = paymentForm.single_month_fee > 0 
      ? paymentForm.single_month_fee 
      : (parseFloat(paymentForm.amount) / (paymentForm.months_count || 1) || 1500);

    setPaymentForm(prev => ({
      ...prev,
      months_count: safeCount,
      amount: prev.payment_status === 'EXEMPTED' ? 0 : Math.round(baseFee * safeCount * 100) / 100
    }));
  };

  const handleSelectStudentInModal = (student) => {
    const enr = student.enrollments?.[0];
    const singleFee = parseFloat(enr?.monthly_fee || 1500);
    const count = paymentForm.months_count || 1;
    setPaymentForm(prev => ({
      ...prev,
      student_id: student.id,
      group_id: enr?.group_id || '',
      single_month_fee: singleFee,
      amount: prev.payment_status === 'EXEMPTED' ? 0 : Math.round(singleFee * count * 100) / 100
    }));
    setStudentEnrollments(student.enrollments || []);
  };

  const handleSelectGroupInModal = (groupId) => {
    const enr = studentEnrollments.find(e => e.group_id == groupId);
    const singleFee = parseFloat(enr?.monthly_fee || paymentForm.single_month_fee || 1500);
    const count = paymentForm.months_count || 1;
    setPaymentForm(prev => ({
      ...prev,
      group_id: groupId,
      single_month_fee: singleFee,
      amount: prev.payment_status === 'EXEMPTED' ? 0 : Math.round(singleFee * count * 100) / 100
    }));
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/payments', {
        ...paymentForm,
        academic_year_id: selectedYearId,
        student_id: parseInt(paymentForm.student_id, 10),
        group_id: parseInt(paymentForm.group_id, 10),
        months_count: parseInt(paymentForm.months_count, 10) || 1
      });

      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setModalOpen(false);
        fetchFinanceData();

        if (res.data?.receipt_no) {
          const selectedStudent = studentsList.find(s => s.id == paymentForm.student_id);
          const selectedGroup = studentEnrollments.find(e => e.group_id == paymentForm.group_id);
          setSelectedPaymentForReceipt({
            id: res.data.id,
            receipt_no: res.data.receipt_no,
            amount: res.data.amount,
            months_count: res.data.months_count || paymentForm.months_count || 1,
            payment_date: paymentForm.payment_date,
            month_ref: res.data.month_ref || paymentForm.month_ref,
            payment_status: paymentForm.payment_status,
            student_name: selectedStudent?.full_name || '',
            reg_no: selectedStudent?.reg_no || '',
            group_name: selectedGroup?.group_name || '',
            academic_year_label: selectedYearObj?.label || '',
            notes: paymentForm.notes
          });
          setReceiptModalOpen(true);
        }
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    }
  };

  const handleQuickPayUnpaid = (unpaidItem, isExemption = false) => {
    const singleFee = parseFloat(unpaidItem.expected_amount || 0);
    setPaymentForm({
      student_id: unpaidItem.student_id,
      group_id: unpaidItem.group_id,
      months_count: 1, // Default 1 month
      single_month_fee: singleFee,
      amount: isExemption ? 0 : singleFee,
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

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <Link
            to="/products"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface-card hover:bg-surface text-text-main border border-border text-sm font-bold shadow-sm transition-all"
          >
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span>{t('sidebar.products', 'المتجر والمبيعات')}</span>
            {parseFloat(overview?.products?.total_products_debt || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold border border-rose-500/20">
                {parseFloat(overview.products.total_products_debt).toLocaleString()} {t('common.currency')}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>{t('finance.record_payment_btn')}</span>
          </button>
        </div>
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
            {parseFloat(overview?.financial?.total_revenue || 0).toLocaleString()} <span className="text-xs font-bold text-text-muted">{t('common.currency')}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/60 flex-wrap text-[11px] font-bold">
            <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
              {t('finance.tuition_revenue_badge', 'اشتراكات')}: {parseFloat(overview?.financial?.tuition_revenue ?? (overview?.financial?.total_revenue || 0)).toLocaleString()} {t('common.currency')}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {t('finance.products_revenue_badge', 'منتجات')}: {parseFloat(overview?.financial?.products_revenue ?? (overview?.products?.total_products_revenue || 0)).toLocaleString()} {t('common.currency')}
            </span>
          </div>
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
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
          onClick={() => setActiveTab('PRODUCT_SALES')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'PRODUCT_SALES'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t('finance.tab_product_sales', 'مبيعات المنتجات والديون')} ({productSales.length})</span>
          {parseFloat(overview?.products?.total_products_debt || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-black border border-rose-500/20">
              {parseFloat(overview.products.total_products_debt).toLocaleString()} {t('common.currency')}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('UNPAID')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
                            {isExempt ? `0.00 ${t('common.currency')}` : `${parseFloat(p.amount).toLocaleString()} ${t('common.currency')}`}
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

      {/* Tab: Product Sales & Debts Ledger */}
      {activeTab === 'PRODUCT_SALES' && (
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-surface-card border border-border rounded-2xl">
            <div className="flex items-center gap-3 flex-1 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1">
                <Search className={`w-4 h-4 text-text-muted absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                <input
                  type="text"
                  placeholder={t('finance.search_products_placeholder', 'ابحث برقم الوصل، اسم الطالب، أو المنتج...')}
                  value={productSalesSearch}
                  onChange={(e) => setProductSalesSearch(e.target.value)}
                  className={`w-full ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none`}
                />
              </div>

              <select
                value={productSalesStatusFilter}
                onChange={(e) => setProductSalesStatusFilter(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
              >
                <option value="">{t('finance.filter_all_statuses', 'جميع الحالات')}</option>
                <option value="PAID">{t('products.status_paid', 'مسدد بالكامل')}</option>
                <option value="PARTIAL">{t('products.status_partial', 'دفع جزئي (دين)')}</option>
                <option value="UNPAID">{t('products.status_unpaid', 'غير مسدد (دين كامل)')}</option>
              </select>

              <select
                value={productSalesProductFilter}
                onChange={(e) => setProductSalesProductFilter(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
              >
                <option value="">{t('products.filter_all_products', 'جميع المنتجات')}</option>
                {availableProducts.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.designation}
                  </option>
                ))}
              </select>

              {/* Period Filter Dropdown (Default: Today) */}
              <select
                value={productSalesPeriodFilter}
                onChange={(e) => setProductSalesPeriodFilter(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
              >
                <option value="today">📅 {t('products.period_today', 'اليوم (الافتراضي)')}</option>
                <option value="yesterday">{t('products.period_yesterday', 'أمس')}</option>
                <option value="this_week">{t('products.period_this_week', 'هذا الأسبوع')}</option>
                <option value="this_month">{t('products.period_this_month', 'هذا الشهر')}</option>
                <option value="custom_date">{t('products.period_custom_date', 'تاريخ محدد...')}</option>
                <option value="custom_range">{t('products.period_custom_range', 'فترة مخصصة...')}</option>
                <option value="all">{t('products.period_all', 'جميع الأوقات')}</option>
              </select>

              {/* Custom Date Input */}
              {productSalesPeriodFilter === 'custom_date' && (
                <input
                  type="date"
                  value={productSalesSpecificDate}
                  onChange={(e) => setProductSalesSpecificDate(e.target.value)}
                  className="p-2 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-text-main"
                />
              )}

              {/* Custom Range Inputs */}
              {productSalesPeriodFilter === 'custom_range' && (
                <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 text-xs">
                  <span className="text-text-muted text-[10px] font-bold px-1">{t('common.from', 'من')}:</span>
                  <input
                    type="date"
                    value={productSalesStartDate}
                    onChange={(e) => setProductSalesStartDate(e.target.value)}
                    className="bg-transparent font-mono text-xs font-bold text-text-main"
                  />
                  <span className="text-text-muted text-[10px] font-bold px-1">{t('common.to', 'إلى')}:</span>
                  <input
                    type="date"
                    value={productSalesEndDate}
                    onChange={(e) => setProductSalesEndDate(e.target.value)}
                    className="bg-transparent font-mono text-xs font-bold text-text-main"
                  />
                </div>
              )}
            </div>

            <Link
              to="/products"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-bold transition-all self-end md:self-auto"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('products.go_to_inventory', 'إدارة المخزون والمبيعات')}</span>
            </Link>
          </div>

          {/* Table */}
          <div className="bg-surface-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-surface text-text-muted text-xs font-bold border-b border-border">
                  <tr>
                    <th className="p-4 text-start">{t('finance.table_receipt_no', 'رقم الوصل')}</th>
                    <th className="p-4 text-start">{t('finance.table_student', 'الطالب')}</th>
                    <th className="p-4 text-start">{t('products.col_designation', 'المنتج')}</th>
                    <th className="p-4 text-start">{t('products.sale_quantity', 'الكمية')}</th>
                    <th className="p-4 text-start">{t('products.col_total', 'المبلغ الكلي')}</th>
                    <th className="p-4 text-start">{t('products.paid_amount_label', 'المدفوع')}</th>
                    <th className="p-4 text-start">{t('products.remaining_debt_label', 'الدين المتبقي')}</th>
                    <th className="p-4 text-start">{t('finance.table_status', 'الحالة')}</th>
                    <th className="p-4 text-start">{t('finance.table_date', 'التاريخ')}</th>
                    <th className="p-4 text-center">{t('common.actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {productSales.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-text-muted">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                          <div className="p-3 bg-surface rounded-full text-text-muted border border-border">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <p className="font-bold text-xs text-text-main">
                            {productSalesPeriodFilter === 'today'
                              ? t('products.no_sales_today', 'لا توجد مبيعات مسجلة لهذا اليوم.')
                              : t('finance.no_product_sales_found', 'لم يتم العثور على أي عمليات بيع منتجات لهذه الفترة.')}
                          </p>
                          {productSalesPeriodFilter === 'today' && (
                            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setProductSalesPeriodFilter('this_month')}
                                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-bold transition-all cursor-pointer"
                              >
                                {t('products.show_this_month', 'عرض مبيعات هذا الشهر')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductSalesPeriodFilter('all')}
                                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all cursor-pointer"
                              >
                                {t('products.show_all_sales', 'عرض كل المبيعات')}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    productSales.map((sale) => {
                      const hasDebt = parseFloat(sale.remaining_debt || 0) > 0;
                      return (
                        <tr key={sale.id} className="hover:bg-surface/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-xs text-primary">
                            {sale.receipt_no}
                          </td>
                          <td className="p-4 font-bold text-text-main">
                            <Link 
                              to={`/students/${sale.student_id}`}
                              className="hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              <span>{sale.student_name}</span>
                              <span className="text-[10px] font-mono text-text-muted">({sale.student_reg_no})</span>
                            </Link>
                          </td>
                          <td className="p-4 font-bold text-text-main">
                            {sale.product_name}
                          </td>
                          <td className="p-4 font-bold text-text-main">
                            {sale.quantity}
                          </td>
                          <td className="p-4 font-mono font-bold text-text-main">
                            {parseFloat(sale.total_amount || 0).toLocaleString()} {t('common.currency')}
                          </td>
                          <td className="p-4 font-mono font-bold text-emerald-600">
                            {parseFloat(sale.paid_amount || 0).toLocaleString()} {t('common.currency')}
                          </td>
                          <td className="p-4 font-mono font-bold">
                            {hasDebt ? (
                              <span className="text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20 text-xs">
                                {parseFloat(sale.remaining_debt).toLocaleString()} {t('common.currency')}
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-xs font-bold">0 {t('common.currency')}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {sale.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('products.status_paid', 'مسدد')}</span>
                              </span>
                            ) : sale.status === 'PARTIAL' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{t('products.status_partial', 'دفع جزئي')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                <X className="w-3.5 h-3.5" />
                                <span>{t('products.status_unpaid', 'غير مسدد')}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-medium text-text-muted font-mono">
                            {DateTimeFormatter.formatDate(sale.sale_date)}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSaleForReceipt(sale);
                                  setSaleReceiptModalOpen(true);
                                }}
                                className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-text-muted hover:text-primary transition-all cursor-pointer"
                                title={t('finance.receipt_preview_title', 'معاينة وطباعة الوصل')}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
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

      {/* Tab 3: Unpaid Dues Detector */}
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
                        <td className="p-4 font-mono">{item.original_fee} {t('common.currency')}</td>
                        <td className="p-4">
                          {item.discount_type === 'PERCENTAGE' && <span className="text-primary font-bold">{isRtl ? `%${item.discount_value}` : `${item.discount_value}%`}</span>}
                          {item.discount_type === 'FIXED_AMOUNT' && <span className="text-primary font-bold">{item.discount_value} {t('common.currency')}</span>}
                          {item.discount_type === 'NONE' && <span className="text-text-muted">-</span>}
                        </td>
                        <td className="p-4 font-mono font-bold text-rose-600 text-sm">
                          {item.expected_amount} {t('common.currency')}
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
                  <label className="block text-xs font-bold text-text-main mb-1">{t('finance.month_ref', 'شهر البداية')}</label>
                  <input
                    type="month"
                    value={paymentForm.month_ref}
                    onChange={(e) => setPaymentForm({ ...paymentForm, month_ref: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main font-mono"
                    required
                  />
                </div>
              </div>

              {/* Multi-month Selection */}
              <div className="p-3 bg-surface rounded-2xl border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{t('finance.months_count_label', 'عدد الأشهر المراد دفعها')}</span>
                  </label>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {paymentForm.months_count > 1 
                      ? t('finance.months_count_option', { count: paymentForm.months_count }, `${paymentForm.months_count} أشهر`) 
                      : t('finance.single_month_label', 'شهر واحد (افتراضي)')}
                  </span>
                </div>

                {/* Preset Pills */}
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 6, 9, 12].map(cnt => {
                    const isSelected = (parseInt(paymentForm.months_count, 10) || 1) === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleMonthsCountChange(cnt)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-surface-card hover:bg-surface-hover text-text-muted border-border hover:border-border-hover'
                        }`}
                      >
                        {cnt === 1 ? (isRtl ? '1 (افتراضي)' : '1 (def)') : cnt}
                      </button>
                    );
                  })}
                </div>

                {/* Stepper Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={paymentForm.months_count || 1}
                    onChange={(e) => handleMonthsCountChange(e.target.value)}
                    className="w-24 p-2 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main font-mono text-center focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs font-medium text-text-muted">
                    {paymentForm.months_count > 1 ? t('finance.months_unit', 'أشهر متتالية') : t('finance.month_unit', 'شهر واحد')}
                  </span>
                </div>

                {/* Covered Months Preview */}
                {financeCoveredMonths.length > 0 && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-[11px] text-text-muted mb-1.5 flex items-center justify-between">
                      <span className="font-medium">{t('finance.covered_period_label', 'الفترة المغطاة:')}</span>
                      <span className="font-mono font-bold text-primary">
                        {financeCoveredMonths[0]} → {financeCoveredMonths[financeCoveredMonths.length - 1]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {financeCoveredMonths.map((m, idx) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20"
                        >
                          <span className="opacity-60">#{idx + 1}</span>
                          <span>{m}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                    onChange={(e) => handleSelectGroupInModal(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main"
                    required
                  >
                    {studentEnrollments.map(en => (
                      <option key={en.group_id} value={en.group_id}>{en.group_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-text-main">
                      {t('finance.payment_amount')}
                    </label>
                    {paymentForm.months_count > 1 && paymentForm.payment_status !== 'EXEMPTED' && (
                      <span className="text-[10px] font-mono text-text-muted">
                        ({paymentForm.single_month_fee} × {paymentForm.months_count})
                      </span>
                    )}
                  </div>
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

      {/* Printable Product Sale Receipt Modal */}
      {saleReceiptModalOpen && selectedSaleForReceipt && (
        <SaleReceiptModal
          isOpen={saleReceiptModalOpen}
          onClose={() => setSaleReceiptModalOpen(false)}
          sale={selectedSaleForReceipt}
        />
      )}

    </div>
  );
}
