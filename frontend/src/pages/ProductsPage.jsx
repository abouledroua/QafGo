import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingBag, 
  Package, 
  Plus, 
  Search, 
  Printer, 
  Edit3, 
  Trash2, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter, 
  User, 
  ArrowDownCircle, 
  ArrowUpRight,
  TrendingUp,
  X,
  CreditCard,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useAcademicYear } from '../context/AcademicYearContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import SaleReceiptModal from '../components/SaleReceiptModal';

export default function ProductsPage() {
  const { showNotification } = useNotification();
  const { t, isRtl, dir } = useLanguage();
  const { selectedYearId } = useAcademicYear();

  const [activeTab, setActiveTab] = useState('INVENTORY'); // 'INVENTORY' | 'SALES'
  const [loading, setLoading] = useState(true);

  // Products state
  const [products, setProducts] = useState([]);
  const [productStats, setProductStats] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState(''); // '' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

  // Sales state
  const [sales, setSales] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesProductFilter, setSalesProductFilter] = useState(''); // '' | product_id
  const [salesDebtFilter, setSalesDebtFilter] = useState(''); // '' | 'DEBT_ONLY' | 'PAID_ONLY'
  const [salesPeriodFilter, setSalesPeriodFilter] = useState('today'); // 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom_date' | 'custom_range' | 'all'
  const [salesSpecificDate, setSalesSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');

  // Add / Edit Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    designation: '',
    qte: 0,
    prix_achat: 0,
    prix_vente: 0
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Delete Product Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Sell Product Modal State
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [sellStudentSearch, setSellStudentSearch] = useState('');
  const [sellFormData, setSellFormData] = useState({
    student_id: '',
    product_id: '',
    quantity: 1,
    unit_price: '',
    paid_amount: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [sellingProduct, setSellingProduct] = useState(false);

  // Pay Product Debt Modal State
  const [payDebtModalOpen, setPayDebtModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
  const [payDebtFormData, setPayDebtFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [payingDebt, setPayingDebt] = useState(false);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null);
  const [selectedPaymentInstallment, setSelectedPaymentInstallment] = useState(null);

  // Fetch products & inventory stats
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/products';
      const queryParams = [];
      if (productSearch) queryParams.push(`search=${encodeURIComponent(productSearch)}`);
      if (stockFilter) queryParams.push(`stock_status=${stockFilter}`);
      if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

      const res = await api.get(url);
      if (res.success) {
        setProducts(res.data);
        setProductStats(res.stats);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [productSearch, stockFilter, showNotification, t]);

  // Fetch sales & debts ledger
  const fetchSales = useCallback(async () => {
    try {
      let url = '/products/sales';
      const queryParams = [];
      if (salesSearch) queryParams.push(`search=${encodeURIComponent(salesSearch)}`);
      if (salesProductFilter) queryParams.push(`product_id=${salesProductFilter}`);
      if (salesDebtFilter === 'DEBT_ONLY') queryParams.push('has_debt=true');
      if (salesDebtFilter === 'PAID_ONLY') queryParams.push('status=PAID');
      if (selectedYearId) queryParams.push(`academic_year_id=${selectedYearId}`);

      // Date & period filtering
      if (salesPeriodFilter === 'custom_date' && salesSpecificDate) {
        queryParams.push(`date=${salesSpecificDate}`);
      } else if (salesPeriodFilter === 'custom_range') {
        if (salesStartDate) queryParams.push(`start_date=${salesStartDate}`);
        if (salesEndDate) queryParams.push(`end_date=${salesEndDate}`);
      } else if (salesPeriodFilter && salesPeriodFilter !== 'all') {
        queryParams.push(`period=${salesPeriodFilter}`);
      }

      if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

      const res = await api.get(url);
      if (res.success) {
        setSales(res.data);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    }
  }, [salesSearch, salesProductFilter, salesDebtFilter, salesPeriodFilter, salesSpecificDate, salesStartDate, salesEndDate, selectedYearId, showNotification, t]);

  // Initial load
  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, [fetchProducts, fetchSales]);

  // Load students for selling modal
  useEffect(() => {
    if (sellModalOpen) {
      api.get(`/students${selectedYearId ? `?academic_year_id=${selectedYearId}` : ''}`)
        .then(res => {
          if (res.success) {
            setStudentsList(res.data || []);
            if (res.data?.length > 0 && !sellFormData.student_id) {
              setSellFormData(prev => ({ ...prev, student_id: res.data[0].id }));
            }
          }
        })
        .catch(console.error);
    }
  }, [sellModalOpen, selectedYearId]);

  // Filtered student list for quick search in Sell Modal
  const filteredStudents = useMemo(() => {
    if (!sellStudentSearch.trim()) return studentsList;
    const q = sellStudentSearch.toLowerCase().trim();
    return studentsList.filter(s => 
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.reg_no && s.reg_no.toLowerCase().includes(q))
    );
  }, [studentsList, sellStudentSearch]);

  // Selected product object in sell modal
  const selectedProductInModal = useMemo(() => {
    return products.find(p => String(p.id) === String(sellFormData.product_id)) || null;
  }, [products, sellFormData.product_id]);

  // Product CRUD Handlers
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      designation: '',
      qte: 10,
      prix_achat: 0,
      prix_vente: 0
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (product) => {
    setEditingProduct(product);
    setProductFormData({
      designation: product.designation,
      qte: product.qte,
      prix_achat: product.prix_achat,
      prix_vente: product.prix_vente
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productFormData.designation.trim()) {
      showNotification(t('products.name_required', 'اسم المنتج مطلوب'), 'warning');
      return;
    }

    try {
      setSavingProduct(true);
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, productFormData);
        if (res.success) {
          showNotification(res.message || t('common.saved'), 'success');
          setProductModalOpen(false);
          fetchProducts();
        }
      } else {
        const res = await api.post('/products', productFormData);
        if (res.success) {
          showNotification(res.message || t('common.saved'), 'success');
          setProductModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleOpenDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setDeletingProduct(true);
      const res = await api.delete(`/products/${productToDelete.id}`);
      if (res.success) {
        showNotification(res.message || t('common.deleted'), 'success');
        setDeleteModalOpen(false);
        setProductToDelete(null);
        fetchProducts();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setDeletingProduct(false);
    }
  };

  // Sell Product Handlers
  const handleOpenSellModal = (presetProduct = null) => {
    const targetProduct = presetProduct || (products.length > 0 ? products[0] : null);
    setSellFormData({
      student_id: studentsList.length > 0 ? studentsList[0].id : '',
      product_id: targetProduct ? targetProduct.id : '',
      quantity: 1,
      unit_price: targetProduct ? targetProduct.prix_vente : '',
      paid_amount: targetProduct ? targetProduct.prix_vente : '', // defaults to full payment
      sale_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setSellStudentSearch('');
    setSellModalOpen(true);
  };

  const handleSelectProductInSellModal = (prodId) => {
    const p = products.find(prod => String(prod.id) === String(prodId));
    if (p) {
      const price = parseFloat(p.prix_vente || 0);
      const qty = parseInt(sellFormData.quantity || 1, 10);
      const total = qty * price;
      setSellFormData(prev => ({
        ...prev,
        product_id: p.id,
        unit_price: price,
        paid_amount: total
      }));
    }
  };

  const handleQuantityChangeInSellModal = (qtyVal) => {
    const qty = Math.max(1, parseInt(qtyVal || 1, 10));
    const price = parseFloat(sellFormData.unit_price || 0);
    const total = qty * price;
    setSellFormData(prev => ({
      ...prev,
      quantity: qty,
      paid_amount: total // default full pay
    }));
  };

  const handleUnitPriceChangeInSellModal = (priceVal) => {
    const price = parseFloat(priceVal || 0);
    const qty = parseInt(sellFormData.quantity || 1, 10);
    const total = qty * price;
    setSellFormData(prev => ({
      ...prev,
      unit_price: priceVal,
      paid_amount: total
    }));
  };

  const handleExecuteSale = async (e) => {
    e.preventDefault();
    if (!sellFormData.student_id || !sellFormData.product_id) {
      showNotification(t('products.select_student_and_product', 'يرجى تحديد الطالب والمنتج'), 'warning');
      return;
    }

    const availableStock = selectedProductInModal?.qte || 0;
    const requestedQty = parseInt(sellFormData.quantity || 1, 10);
    if (requestedQty > availableStock) {
      showNotification(t('products.insufficient_stock_warning', { available: availableStock, requested: requestedQty }), 'warning');
      return;
    }

    try {
      setSellingProduct(true);
      const res = await api.post('/products/sell', {
        ...sellFormData,
        academic_year_id: selectedYearId
      });

      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setSellModalOpen(false);
        fetchProducts();
        fetchSales();

        // Open official receipt modal immediately
        setSelectedSaleForReceipt(res.data);
        setSelectedPaymentInstallment(null);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setSellingProduct(false);
    }
  };

  // Pay Product Debt Handlers
  const handleOpenPayDebtModal = (sale) => {
    setSelectedSaleForPayment(sale);
    setPayDebtFormData({
      amount: sale.remaining_debt,
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPayDebtModalOpen(true);
  };

  const handleExecutePayDebt = async (e) => {
    e.preventDefault();
    if (!selectedSaleForPayment) return;

    const amount = parseFloat(payDebtFormData.amount || 0);
    const remaining = parseFloat(selectedSaleForPayment.remaining_debt || 0);

    if (amount <= 0 || amount > remaining) {
      showNotification(t('products.invalid_pay_amount', 'مبلغ السداد يجب أن يكون بين 1 والدين المتبقي'), 'warning');
      return;
    }

    try {
      setPayingDebt(true);
      const res = await api.post(`/products/sales/${selectedSaleForPayment.id}/pay-debt`, payDebtFormData);
      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setPayDebtModalOpen(false);
        fetchProducts();
        fetchSales();

        // Open updated receipt modal
        setSelectedSaleForReceipt({
          ...selectedSaleForPayment,
          paid_amount: res.data.total_paid_now,
          remaining_debt: res.data.remaining_debt_now,
          status: res.data.status
        });
        setSelectedPaymentInstallment({
          receipt_no: res.data.payment_receipt_no,
          amount: res.data.amount_paid,
          payment_date: payDebtFormData.payment_date
        });
        setReceiptModalOpen(true);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setPayingDebt(false);
    }
  };

  // Quick total calculations for Sell modal
  const sellTotalAmount = useMemo(() => {
    const qty = parseInt(sellFormData.quantity || 1, 10);
    const price = parseFloat(sellFormData.unit_price || 0);
    return Math.round(qty * price * 100) / 100;
  }, [sellFormData.quantity, sellFormData.unit_price]);

  const sellRemainingDebt = useMemo(() => {
    const paid = parseFloat(sellFormData.paid_amount || 0);
    return Math.max(0, Math.round((sellTotalAmount - paid) * 100) / 100);
  }, [sellTotalAmount, sellFormData.paid_amount]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir={dir}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-5 sm:p-6 rounded-3xl border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-main">
              {t('products.page_title', 'المتجر والمبيعات المدرسية')}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {t('products.page_subtitle', 'إدارة وتتبع المنتجات والمخزون، بيع الأدوات للطلبة، وحساب الديون تلقائياً')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenSellModal()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <CreditCard className="w-4 h-4" />
            <span>{t('products.sell_btn', 'بيع منتج لطالب')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('products.add_product_btn', 'إضافة منتج جديد')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="p-4 sm:p-5 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">{t('products.stat_total_products', 'إجمالي المنتجات')}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-cairo text-text-main">
            {productStats?.total_products || 0}
          </div>
          <span className="text-[11px] text-text-muted block">
            {t('products.stat_total_items', '{count} قطعة بالمخزن', { count: productStats?.total_stock_items || 0 })}
          </span>
        </div>

        {/* Low Stock Warning */}
        <div className="p-4 sm:p-5 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">{t('products.stat_low_stock', 'تنبيهات المخزون')}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-cairo text-amber-600">
            {(productStats?.low_stock_count || 0) + (productStats?.out_of_stock_count || 0)}
          </div>
          <div className="text-[11px] text-text-muted flex gap-2">
            <span className="text-rose-500 font-bold">{productStats?.out_of_stock_count || 0} {t('products.out_of_stock', 'نافذ')}</span>
            <span>•</span>
            <span className="text-amber-500 font-bold">{productStats?.low_stock_count || 0} {t('products.low_stock', 'منخفض')}</span>
          </div>
        </div>

        {/* Sales Revenue */}
        <div className="p-4 sm:p-5 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">{t('products.stat_sales_revenue', 'مداخيل المبيعات')}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-cairo text-emerald-600">
            {parseFloat(productStats?.overall_paid_amount || 0).toLocaleString()} {t('common.currency')}
          </div>
          <span className="text-[11px] text-text-muted block">
            {t('products.stat_sales_total', 'من إجمالي {total} دج مبيعات', { total: parseFloat(productStats?.overall_sales_amount || 0).toLocaleString() })}
          </span>
        </div>

        {/* Outstanding Debt */}
        <div className="p-4 sm:p-5 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">{t('products.stat_product_debt', 'ديون المشتريات المستحقة')}</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-cairo text-rose-600">
            {parseFloat(productStats?.overall_remaining_debt || 0).toLocaleString()} {t('common.currency')}
          </div>
          <span className="text-[11px] text-rose-500 font-bold block">
            {t('products.stat_debtors_count', '{count} عملية بيع عليها دين', { count: productStats?.debtors_count || 0 })}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="p-1.5 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'INVENTORY'
              ? 'bg-primary text-white shadow-md shadow-primary/25 font-black'
              : 'text-text-muted hover:text-text-main hover:bg-surface'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('products.tab_inventory', 'المخزون وقائمة المنتجات ({count})', { count: products.length })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SALES')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'SALES'
              ? 'bg-primary text-white shadow-md shadow-primary/25 font-black'
              : 'text-text-muted hover:text-text-main hover:bg-surface'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{t('products.tab_sales', 'سجل المبيعات والديون ({count})', { count: sales.length })}</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY & PRODUCTS */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-surface-card border border-border rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs">
          
          {/* Inventory Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className={`w-4 h-4 text-text-muted absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                placeholder={t('products.search_placeholder', 'البحث في المنتجات...')}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary`}
              />
            </div>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
            >
              <option value="">{t('products.filter_all_stock', 'جميع المنتجات بالمخزن')}</option>
              <option value="IN_STOCK">{t('products.filter_in_stock', 'متوفر (> 5 قطع)')}</option>
              <option value="LOW_STOCK">{t('products.filter_low_stock', 'مخزون منخفض (1-5 قطع)')}</option>
              <option value="OUT_OF_STOCK">{t('products.filter_out_of_stock', 'نافذ (0 قطعة)')}</option>
            </select>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface text-text-muted font-bold border-b border-border">
                <tr>
                  <th className="p-3 text-start">{t('products.table_designation', 'اسم المنتج / التسمية')}</th>
                  <th className="p-3 text-center">{t('products.table_qte', 'الكمية المتوفرة')}</th>
                  <th className="p-3 text-start">{t('products.table_prix_achat', 'سعر الشراء (التكلفة)')}</th>
                  <th className="p-3 text-start">{t('products.table_prix_vente', 'سعر البيع')}</th>
                  <th className="p-3 text-start">{t('products.table_profit_margin', 'هامش الربح')}</th>
                  <th className="p-3 text-center">{t('products.table_total_sold', 'إجمالي المبيعات')}</th>
                  <th className="p-3 text-center">{t('common.actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-text-muted">
                      {t('products.no_products_found', 'لا توجد منتجات مسجلة')}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const buy = parseFloat(product.prix_achat || 0);
                    const sell = parseFloat(product.prix_vente || 0);
                    const margin = sell - buy;
                    const isOutOfStock = product.qte <= 0;
                    const isLowStock = product.qte > 0 && product.qte <= 5;

                    return (
                      <tr key={product.id} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-text-main text-sm">{product.designation}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold font-mono text-xs ${
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {product.qte} {t('products.items_unit', 'قطعة')}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-medium text-text-muted">
                          {buy.toLocaleString()} {t('common.currency')}
                        </td>
                        <td className="p-3 font-mono font-bold text-primary text-sm">
                          {sell.toLocaleString()} {t('common.currency')}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-600">
                          +{margin.toLocaleString()} {t('common.currency')}
                        </td>
                        <td className="p-3 text-center font-mono text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setSalesProductFilter(String(product.id));
                              setActiveTab('SALES');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-primary/10 text-text-main hover:text-primary border border-border transition-colors group cursor-pointer"
                            title={t('products.view_product_sales', 'عرض جميع مبيعات هذا المنتج')}
                          >
                            <span className="font-bold">{product.total_sold_quantity || 0}</span>
                            <span className="text-text-muted group-hover:text-primary">{t('products.items_sold', 'مباعة')}</span>
                            <ArrowUpRight className="w-3 h-3 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenSellModal(product)}
                              disabled={isOutOfStock}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                isOutOfStock
                                  ? 'opacity-40 cursor-not-allowed bg-surface border-border text-text-muted'
                                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-600 hover:text-white'
                              }`}
                              title={t('products.sell_this_product', 'بيع هذا المنتج')}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(product)}
                              className="p-1.5 rounded-lg bg-surface hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-border hover:border-blue-600 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDeleteProduct(product)}
                              className="p-1.5 rounded-lg bg-surface hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-border hover:border-rose-600 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Mobile Cards View (< md) */}
          <div className="md:hidden space-y-3">
            {products.length === 0 ? (
              <p className="p-6 text-center text-text-muted text-xs">{t('products.no_products_found')}</p>
            ) : (
              products.map((product) => {
                const buy = parseFloat(product.prix_achat || 0);
                const sell = parseFloat(product.prix_vente || 0);
                const isOutOfStock = product.qte <= 0;
                const isLowStock = product.qte > 0 && product.qte <= 5;

                return (
                  <div key={product.id} className="p-4 bg-surface rounded-2xl border border-border space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-text-main">{product.designation}</div>
                      <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[10px] shrink-0 ${
                        isOutOfStock
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : isLowStock
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}>
                        {product.qte} {t('products.items_unit', 'قطعة')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/60">
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('products.table_prix_achat')}</span>
                        <span className="font-mono text-text-muted">{buy.toLocaleString()} {t('common.currency')}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('products.table_prix_vente')}</span>
                        <span className="font-mono font-bold text-primary">{sell.toLocaleString()} {t('common.currency')}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('products.table_total_sold')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSalesProductFilter(String(product.id));
                            setActiveTab('SALES');
                          }}
                          className="font-mono font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                          title={t('products.view_product_sales', 'عرض مبيعات هذا المنتج')}
                        >
                          <span>{product.total_sold_quantity || 0} {t('products.items_sold', 'مباعة')}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => handleOpenSellModal(product)}
                        disabled={isOutOfStock}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                          isOutOfStock
                            ? 'opacity-40 cursor-not-allowed bg-surface border-border text-text-muted'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{t('products.sell_btn', 'بيع')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(product)}
                        className="py-1.5 px-3 rounded-xl bg-surface hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-bold border border-border"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteProduct(product)}
                        className="py-1.5 px-3 rounded-xl bg-surface hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold border border-border"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 2: SALES & DEBTS LEDGER */}
      {activeTab === 'SALES' && (
        <div className="bg-surface-card border border-border rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs">
          
          {/* Sales Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className={`w-4 h-4 text-text-muted absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                placeholder={t('products.search_sales_placeholder', 'البحث برقم الوصل، اسم الطالب، أو المنتج...')}
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary`}
              />
            </div>

            {/* Product Filter Dropdown */}
            <select
              value={salesProductFilter}
              onChange={(e) => setSalesProductFilter(e.target.value)}
              className="p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
            >
              <option value="">{t('products.filter_all_products', 'جميع المنتجات')}</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.designation}
                </option>
              ))}
            </select>

            {/* Period Filter Dropdown (Default: Today) */}
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1">
              <Calendar className="w-4 h-4 text-text-muted ms-1.5 shrink-0" />
              <select
                value={salesPeriodFilter}
                onChange={(e) => setSalesPeriodFilter(e.target.value)}
                className="p-1.5 bg-transparent border-0 text-xs font-bold text-text-main focus:outline-none cursor-pointer"
              >
                <option value="today">📅 {t('products.period_today', 'اليوم (الافتراضي)')}</option>
                <option value="yesterday">{t('products.period_yesterday', 'أمس')}</option>
                <option value="this_week">{t('products.period_this_week', 'هذا الأسبوع')}</option>
                <option value="this_month">{t('products.period_this_month', 'هذا الشهر')}</option>
                <option value="custom_date">{t('products.period_custom_date', 'تاريخ محدد...')}</option>
                <option value="custom_range">{t('products.period_custom_range', 'فترة مخصصة...')}</option>
                <option value="all">{t('products.period_all', 'جميع الأوقات')}</option>
              </select>
            </div>

            {/* Custom Date Input */}
            {salesPeriodFilter === 'custom_date' && (
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-2.5 py-1.5 animate-fadeIn">
                <input
                  type="date"
                  value={salesSpecificDate}
                  onChange={(e) => setSalesSpecificDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-text-main focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Custom Range Inputs */}
            {salesPeriodFilter === 'custom_range' && (
              <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs animate-fadeIn flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-text-muted font-bold text-[10px]">{t('common.from', 'من')}:</span>
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="bg-transparent font-mono font-bold text-text-main focus:outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted font-bold text-[10px]">{t('common.to', 'إلى')}:</span>
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="bg-transparent font-mono font-bold text-text-main focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Debt Filter Dropdown */}
            <select
              value={salesDebtFilter}
              onChange={(e) => setSalesDebtFilter(e.target.value)}
              className="p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
            >
              <option value="">{t('products.filter_all_sales', 'جميع عمليات البيع')}</option>
              <option value="DEBT_ONLY">⚠️ {t('products.filter_debt_only', 'العمليات التي عليها ديون متبقية')}</option>
              <option value="PAID_ONLY">✓ {t('products.filter_paid_only', 'العمليات المسددة بالكامل')}</option>
            </select>
          </div>

          {/* Active Product Filter Pill if any */}
          {salesProductFilter && (
            <div className="flex items-center gap-2 p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-xs">
              <Package className="w-4 h-4 text-primary shrink-0" />
              <span className="text-text-muted">{t('products.filtering_by_product', 'تصفية حسب المنتج:')}</span>
              <span className="font-bold text-primary">
                {products.find((p) => String(p.id) === String(salesProductFilter))?.designation || salesProductFilter}
              </span>
              <button
                type="button"
                onClick={() => setSalesProductFilter('')}
                className="inline-flex items-center gap-1 ms-auto px-2 py-0.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-rose-600 font-bold border border-border transition-colors cursor-pointer text-[11px]"
              >
                <X className="w-3 h-3" />
                <span>{t('products.clear_filter', 'إلغاء التصفية')}</span>
              </button>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface text-text-muted font-bold border-b border-border">
                <tr>
                  <th className="p-3 text-start">{t('products.table_receipt_no', 'رقم الوصل')}</th>
                  <th className="p-3 text-start">{t('products.table_student', 'الطالب')}</th>
                  <th className="p-3 text-start">{t('products.table_product', 'المنتج')}</th>
                  <th className="p-3 text-center">{t('products.table_quantity', 'الكمية')}</th>
                  <th className="p-3 text-start">{t('products.table_total_amount', 'المبلغ الإجمالي')}</th>
                  <th className="p-3 text-start">{t('products.table_paid_amount', 'المدفوع')}</th>
                  <th className="p-3 text-start">{t('products.table_remaining_debt', 'الدين المتبقي')}</th>
                  <th className="p-3 text-start">{t('common.date', 'التاريخ')}</th>
                  <th className="p-3 text-center">{t('common.actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <div className="p-3 bg-surface rounded-full text-text-muted border border-border">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-bold text-xs text-text-main">
                          {salesPeriodFilter === 'today'
                            ? t('products.no_sales_today', 'لا توجد مبيعات مسجلة لهذا اليوم.')
                            : t('products.no_sales_found', 'لا توجد مبيعات مسجلة لهذه الفترة.')}
                        </p>
                        {salesPeriodFilter === 'today' && (
                          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSalesPeriodFilter('this_month')}
                              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-bold transition-all cursor-pointer"
                            >
                              {t('products.show_this_month', 'عرض مبيعات هذا الشهر')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSalesPeriodFilter('all')}
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
                  sales.map((sale) => {
                    const remaining = parseFloat(sale.remaining_debt || 0);
                    const isFullyPaid = remaining === 0;

                    return (
                      <tr key={sale.id} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">{sale.receipt_no}</td>
                        <td className="p-3">
                          <div className="font-bold text-text-main">{sale.student_name}</div>
                          <span className="text-[10px] text-text-muted font-mono">{sale.student_reg_no}</span>
                        </td>
                        <td className="p-3 font-medium text-text-main">{sale.product_name}</td>
                        <td className="p-3 text-center font-mono font-bold">{sale.quantity}</td>
                        <td className="p-3 font-mono font-bold">{parseFloat(sale.total_amount).toLocaleString()} {t('common.currency')}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">{parseFloat(sale.paid_amount).toLocaleString()} {t('common.currency')}</td>
                        <td className="p-3">
                          {isFullyPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('products.status_paid', 'مسدد')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/25">
                              <AlertCircle className="w-3 h-3" />
                              <span>{remaining.toLocaleString()} {t('common.currency')}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-text-muted">{DateTimeFormatter.formatDate(sale.sale_date)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isFullyPaid && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayDebtModal(sale)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                                title={t('products.pay_debt_btn', 'سداد الدين')}
                              >
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                <span>{t('products.pay_debt_short', 'سداد')}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSaleForReceipt(sale);
                                setSelectedPaymentInstallment(null);
                                setReceiptModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-text-main border border-border transition-colors"
                              title={t('finance.print_receipt_btn', 'طباعة الوصل')}
                            >
                              <Printer className="w-3.5 h-3.5" />
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

          {/* Mobile Sales View (< md) */}
          <div className="md:hidden space-y-3">
            {sales.length === 0 ? (
              <div className="p-6 bg-surface rounded-2xl border border-border text-center space-y-3">
                <div className="p-3 bg-surface-card rounded-full text-primary w-fit mx-auto border border-border">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="font-bold text-xs text-text-main">
                  {salesPeriodFilter === 'today'
                    ? t('products.no_sales_today', 'لا توجد مبيعات مسجلة لهذا اليوم.')
                    : t('products.no_sales_found', 'لا توجد مبيعات مسجلة لهذه الفترة.')}
                </p>
                {salesPeriodFilter === 'today' && (
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSalesPeriodFilter('this_month')}
                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-bold"
                    >
                      {t('products.show_this_month', 'هذا الشهر')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesPeriodFilter('all')}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold"
                    >
                      {t('products.show_all_sales', 'عرض الكل')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              sales.map((sale) => {
                const remaining = parseFloat(sale.remaining_debt || 0);
                const isFullyPaid = remaining === 0;

                return (
                  <div key={sale.id} className="p-4 bg-surface rounded-2xl border border-border space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-primary">{sale.receipt_no}</span>
                      {isFullyPaid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700">
                          {t('products.status_paid', 'خالص بالكامل')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700">
                          {t('products.status_debt', 'دين')}: {remaining.toLocaleString()} {t('common.currency')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('products.table_student')}</span>
                        <span className="font-bold text-text-main">{sale.student_name}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('products.table_product')}</span>
                        <span className="font-medium text-text-main">{sale.product_name} ({sale.quantity})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px]">{t('products.table_paid_amount')}</span>
                        <span className="font-mono font-bold text-emerald-600">{parseFloat(sale.paid_amount).toLocaleString()} {t('common.currency')}</span>
                      </div>
                      <div className="text-end">
                        <span className="text-text-muted block text-[10px]">{t('products.table_total_amount')}</span>
                        <span className="font-mono font-bold text-text-main">{parseFloat(sale.total_amount).toLocaleString()} {t('common.currency')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      {!isFullyPaid && (
                        <button
                          type="button"
                          onClick={() => handleOpenPayDebtModal(sale)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          <span>{t('products.pay_debt_short', 'سداد الدين')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSaleForReceipt(sale);
                          setSelectedPaymentInstallment(null);
                          setReceiptModalOpen(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-surface hover:bg-primary hover:text-white text-text-main border border-border text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('common.print')}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">
                    {editingProduct ? t('products.edit_product_title', 'تعديل بيانات المنتج') : t('products.add_product_title', 'إضافة منتج جديد للمخزن')}
                  </h3>
                  <p className="text-xs text-text-muted">{t('products.modal_subtitle', 'أدخل اسم وكمية وأسعار الشراء والبيع')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('products.table_designation', 'اسم المنتج / التسمية')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('products.designation_placeholder', 'مثال: مصحف التجويد، كراس الحفظ...')}
                  value={productFormData.designation}
                  onChange={(e) => setProductFormData({ ...productFormData, designation: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('products.table_qte', 'الكمية بالمخزن')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.qte}
                    onChange={(e) => setProductFormData({ ...productFormData, qte: parseInt(e.target.value || 0, 10) })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('products.table_prix_achat', 'سعر الشراء (دج)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={productFormData.prix_achat}
                    onChange={(e) => setProductFormData({ ...productFormData, prix_achat: parseFloat(e.target.value || 0) })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono font-medium text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('products.table_prix_vente', 'سعر البيع (دج)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={productFormData.prix_vente}
                    onChange={(e) => setProductFormData({ ...productFormData, prix_vente: parseFloat(e.target.value || 0) })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border text-xs flex justify-between items-center text-text-muted">
                <span>{t('products.estimated_margin', 'هامش الربح المتوقع للقطعة:')}</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  +{Math.max(0, parseFloat(productFormData.prix_vente || 0) - parseFloat(productFormData.prix_achat || 0)).toLocaleString()} {t('common.currency')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-surface"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {savingProduct && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{t('common.save')}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: SELL PRODUCT TO STUDENT */}
      {sellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('products.sell_modal_title', 'تسجيل عملية بيع لطالب')}</h3>
                  <p className="text-xs text-text-muted">{t('products.sell_modal_subtitle', 'حدد الطالب والمنتج والمبلغ المدفوع وسيتم احتساب أي متبقٍ كدين تلقائياً')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSellModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSale} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Select Student */}
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('products.select_student', 'اختيار الطالب المشتري')} <span className="text-rose-500">*</span>
                </label>
                
                <input
                  type="text"
                  placeholder={t('products.search_student_hint', 'اكتب لتصفية قائمة الطلبة...')}
                  value={sellStudentSearch}
                  onChange={(e) => setSellStudentSearch(e.target.value)}
                  className="w-full p-2 rounded-xl bg-surface border border-border text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <select
                  required
                  value={sellFormData.student_id}
                  onChange={(e) => setSellFormData({ ...sellFormData, student_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">{t('common.select_placeholder')}</option>
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.reg_no}) {s.has_unpaid ? `⚠️ [عليه دين: ${s.unpaid_amount} دج]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Product */}
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('products.select_product', 'اختيار المنتج')} <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={sellFormData.product_id}
                  onChange={(e) => handleSelectProductInSellModal(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">{t('common.select_placeholder')}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.qte <= 0}>
                      {p.designation} — {parseFloat(p.prix_vente).toLocaleString()} {t('common.currency')} {p.qte <= 0 ? '(نافذ من المخزن)' : `(المتوفر: ${p.qte})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-text-main">{t('products.table_quantity', 'الكمية')} <span className="text-rose-500">*</span></label>
                    {selectedProductInModal && (
                      <span className="text-[10px] text-text-muted font-bold">
                        {t('products.max_stock', 'المتاح:')} {selectedProductInModal.qte}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductInModal ? selectedProductInModal.qte : undefined}
                    required
                    value={sellFormData.quantity}
                    onChange={(e) => handleQuantityChangeInSellModal(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('products.table_unit_price', 'سعر الوحدة (دج)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={sellFormData.unit_price}
                    onChange={(e) => handleUnitPriceChangeInSellModal(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Total & Paid Settlement Box */}
              <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-text-muted">{t('products.total_amount', 'المبلغ الإجمالي:')}</span>
                  <span className="font-mono font-black text-base text-text-main">
                    {sellTotalAmount.toLocaleString()} {t('common.currency')}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-text-main">{t('products.paid_amount', 'المبلغ المدفوع فوراً (دج)')}</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSellFormData(prev => ({ ...prev, paid_amount: sellTotalAmount }))}
                        className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20"
                      >
                        {t('products.pay_full_preset', 'دفع كامل')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSellFormData(prev => ({ ...prev, paid_amount: 0 }))}
                        className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md hover:bg-rose-500/20"
                      >
                        {t('products.pay_zero_preset', 'لم يدفع (دين كامل)')}
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={sellTotalAmount}
                    value={sellFormData.paid_amount}
                    onChange={(e) => setSellFormData({ ...sellFormData, paid_amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface-card border border-border text-xs font-mono font-bold text-emerald-600 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Remaining Debt Highlight */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  sellRemainingDebt > 0 
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300 font-bold' 
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {sellRemainingDebt > 0 ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    <span>
                      {sellRemainingDebt > 0 
                        ? t('products.calculated_debt_notice', 'سيتم تسجيل دين في ذمة الطالب قدره:') 
                        : t('products.fully_paid_notice', 'العملية مسددة بالكامل ولا يوجد دين')}
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm">
                    {sellRemainingDebt.toLocaleString()} {t('common.currency')}
                  </span>
                </div>
              </div>

              {/* Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('common.date')}</label>
                  <input
                    type="date"
                    required
                    value={sellFormData.sale_date}
                    onChange={(e) => setSellFormData({ ...sellFormData, sale_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-main focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('common.notes')}</label>
                  <input
                    type="text"
                    placeholder={t('products.notes_placeholder', 'ملاحظات إضافية (اختياري)...')}
                    value={sellFormData.notes}
                    onChange={(e) => setSellFormData({ ...sellFormData, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSellModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-surface"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={sellingProduct}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {sellingProduct && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{t('products.confirm_sale_btn', 'تأكيد البيع وطباعة الوصل')}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: PAY PRODUCT DEBT */}
      {payDebtModalOpen && selectedSaleForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('products.pay_debt_title', 'سداد دين مشتريات')}</h3>
                  <p className="text-xs text-text-muted">{selectedSaleForPayment.receipt_no} — {selectedSaleForPayment.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayDebtModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePayDebt} className="p-5 space-y-4">
              
              <div className="p-3 bg-surface rounded-xl border border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('products.table_product')}:</span>
                  <span className="font-bold text-text-main">{selectedSaleForPayment.product_name} ({selectedSaleForPayment.quantity} قطعة)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('products.remaining_debt')}:</span>
                  <span className="font-mono font-black text-rose-600">
                    {parseFloat(selectedSaleForPayment.remaining_debt).toLocaleString()} {t('common.currency')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('products.amount_to_pay', 'مبلغ السداد (دج)')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSaleForPayment.remaining_debt}
                  required
                  value={payDebtFormData.amount}
                  onChange={(e) => setPayDebtFormData({ ...payDebtFormData, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-emerald-600 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('common.date')}</label>
                <input
                  type="date"
                  required
                  value={payDebtFormData.payment_date}
                  onChange={(e) => setPayDebtFormData({ ...payDebtFormData, payment_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-main focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('common.notes')}</label>
                <input
                  type="text"
                  placeholder={t('products.pay_notes_placeholder', 'ملاحظات وصل السداد...')}
                  value={payDebtFormData.notes}
                  onChange={(e) => setPayDebtFormData({ ...payDebtFormData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPayDebtModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-surface"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={payingDebt}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {payingDebt && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{t('products.confirm_payment_btn', 'تأكيد السداد وإصدار الوصل')}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: DELETE PRODUCT CONFIRMATION */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-main">{t('products.delete_modal_title', 'تأكيد حذف المنتج')}</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('products.delete_modal_msg', 'هل أنت متأكد من رغبتك في حذف المنتج "{name}" نهائياً من النظام؟', { name: productToDelete.designation })}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-surface"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={deletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                {deletingProduct && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{t('common.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: OFFICIAL PRINTABLE SALE RECEIPT */}
      {receiptModalOpen && selectedSaleForReceipt && (
        <SaleReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          sale={selectedSaleForReceipt}
          paymentInstallment={selectedPaymentInstallment}
        />
      )}

    </div>
  );
}
