import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import DateInput from '../components/DateInput';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';
import {
  ShieldAlert,
  ShieldCheck,
  History,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  User,
  Monitor,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Users,
  Wallet,
  BookOpen,
  ArrowLeftRight,
  Settings,
  Lock,
  Sparkles,
  KeyRound
} from 'lucide-react';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const { t, dir, isRtl } = useLanguage();
  const { showNotification } = useNotification();

  // Access Control: Strict ADMIN only
  const isAdmin = user?.role === 'ADMIN';

  // Filters State
  const [period, setPeriod] = useState('all'); // 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('ALL');
  const [selectedDataType, setSelectedDataType] = useState('ALL');
  const [selectedPoste, setSelectedPoste] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & Data State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total_logs: 0, today_logs: 0, total_users: 0, total_postes: 0 });

  // Filter Dropdown Options from DB
  const [filterOptions, setFilterOptions] = useState({
    users: [],
    actionTypes: [],
    dataTypes: [],
    postes: []
  });

  // Selected Log for Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedLog, setInspectedLog] = useState(null);

  // Workstation Naming Modal State
  const [posteModalOpen, setPosteModalOpen] = useState(false);
  const [currentPosteName, setCurrentPosteName] = useState(() => localStorage.getItem('qafgo_poste_name') || '');

  // 1. Fetch Dynamic Filter Options (Users, Postes, Types)
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await api.get('/logs/filters');
      if (res.success && res.data) {
        setFilterOptions(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit log filters:', err.message);
    }
  }, []);

  // 2. Fetch Filtered Logs
  const fetchLogs = useCallback(async (page = 1) => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: pagination.limit
      });

      if (specificDate) {
        params.append('date', specificDate);
      } else if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else if (startDate) {
        params.append('start_date', startDate);
      } else if (endDate) {
        params.append('end_date', endDate);
      } else if (period && period !== 'all') {
        params.append('period', period);
      }

      if (selectedUserId) params.append('user_id', selectedUserId);
      if (selectedActionType && selectedActionType !== 'ALL') params.append('action_type', selectedActionType);
      if (selectedDataType && selectedDataType !== 'ALL') params.append('data_type', selectedDataType);
      if (selectedPoste && selectedPoste !== 'ALL') params.append('poste', selectedPoste);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [
    isAdmin,
    pagination.limit,
    specificDate,
    startDate,
    endDate,
    period,
    selectedUserId,
    selectedActionType,
    selectedDataType,
    selectedPoste,
    searchTerm,
    showNotification,
    t
  ]);

  useEffect(() => {
    if (isAdmin) {
      fetchFilterOptions();
      fetchLogs(1);
    }
  }, [isAdmin, fetchFilterOptions, fetchLogs]);

  // Reset all filters
  const handleResetFilters = () => {
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    setSpecificDate('');
    setSelectedUserId('');
    setSelectedActionType('ALL');
    setSelectedDataType('ALL');
    setSelectedPoste('ALL');
    setSearchTerm('');
  };

  // Save custom workstation name locally
  const handleSavePosteName = (e) => {
    e.preventDefault();
    if (currentPosteName.trim()) {
      localStorage.setItem('qafgo_poste_name', currentPosteName.trim());
    } else {
      localStorage.removeItem('qafgo_poste_name');
    }
    setPosteModalOpen(false);
    showNotification(t('audit_logs.workstation_saved'), 'success');
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({ limit: 5000 });
      if (specificDate) params.append('date', specificDate);
      else if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else if (period && period !== 'all') params.append('period', period);

      if (selectedUserId) params.append('user_id', selectedUserId);
      if (selectedActionType && selectedActionType !== 'ALL') params.append('action_type', selectedActionType);
      if (selectedDataType && selectedDataType !== 'ALL') params.append('data_type', selectedDataType);
      if (selectedPoste && selectedPoste !== 'ALL') params.append('poste', selectedPoste);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/logs/export?${params.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        const rows = res.data;
        if (rows.length === 0) {
          showNotification(t('audit_logs.no_logs_found'), 'warning');
          return;
        }

        const headers = ['ID', 'Date & Time', 'User', 'Role', 'Action', 'Category', 'Target', 'Poste / Workstation', 'Details'];
        const csvContent = [
          '\uFEFF' + headers.join(','),
          ...rows.map(r => [
            r.id,
            `"${DateTimeFormatter.formatDateTime(r.created_at)}"`,
            `"${(r.user_full_name || r.username || '').replace(/"/g, '""')}"`,
            `"${r.user_role || ''}"`,
            `"${r.action_type || ''}"`,
            `"${r.data_type || ''}"`,
            `"${(r.entity_name || '').replace(/"/g, '""')}"`,
            `"${(r.poste || '').replace(/"/g, '""')}"`,
            `"${(r.details || '').replace(/"/g, '""')}"`
          ].join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `qafgo_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    }
  };

  // Helper Badge Color for Actions
  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'UPDATE':
        return 'bg-sky-500/15 text-sky-600 border-sky-500/30';
      case 'DELETE':
        return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
      case 'LOGIN':
        return 'bg-violet-500/15 text-violet-600 border-violet-500/30';
      case 'PAYMENT':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
      case 'EXEMPTION':
        return 'bg-teal-500/15 text-teal-600 border-teal-500/30';
      case 'TRANSFER':
        return 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30';
      case 'ATTENDANCE':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      case 'PASSWORD_RESET':
        return 'bg-orange-500/15 text-orange-600 border-orange-500/30';
      default:
        return 'bg-surface text-text-muted border-border';
    }
  };

  // Helper Icon for Data Types
  const getDataTypeIcon = (type) => {
    switch (type) {
      case 'STUDENT':
        return <Users className="w-3.5 h-3.5 text-emerald-500" />;
      case 'GROUP':
        return <Layers className="w-3.5 h-3.5 text-primary" />;
      case 'TEACHER':
      case 'TEACHER_ATTENDANCE':
        return <BookOpen className="w-3.5 h-3.5 text-purple-500" />;
      case 'PAYMENT':
        return <Wallet className="w-3.5 h-3.5 text-amber-500" />;
      case 'TRANSFER':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />;
      case 'SETTINGS':
        return <Settings className="w-3.5 h-3.5 text-blue-500" />;
      case 'USER':
      case 'AUTH':
        return <User className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  // Non-Admin Access Gate
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6" dir={dir}>
        <div className="max-w-md w-full bg-surface-card border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-text-main">
            {t('common.error')} - {t('audit_logs.admin_only_badge')}
          </h2>
          <p className="text-sm text-text-muted">
            {t('audit_logs.admin_only_desc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black text-text-main">
                  {t('audit_logs.title')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                  {t('audit_logs.admin_only_badge')}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-0.5">
                {t('audit_logs.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setPosteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-card hover:bg-surface border border-border text-text-muted hover:text-text-main flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Laptop className="w-4 h-4 text-primary" />
            <span>{t('audit_logs.workstation_settings_btn')}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="p-2 rounded-xl text-xs font-bold bg-surface-card hover:bg-surface border border-border text-text-muted hover:text-text-main transition-colors shadow-sm disabled:opacity-50"
            title={t('audit_logs.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-card hover:bg-surface border border-border text-text-muted hover:text-text-main flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{t('audit_logs.export_csv')}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-card hover:bg-surface border border-border text-text-muted hover:text-text-main flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-500" />
            <span>{t('audit_logs.print')}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-bold block">{t('audit_logs.kpi_total_logs')}</span>
            <span className="text-2xl font-black font-mono text-text-main">{stats.total_logs?.toLocaleString() || 0}</span>
          </div>
        </div>

        {/* Today's Logs */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-bold block">{t('audit_logs.kpi_today_logs')}</span>
            <span className="text-2xl font-black font-mono text-emerald-600">{stats.today_logs?.toLocaleString() || 0}</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-bold block">{t('audit_logs.kpi_total_users')}</span>
            <span className="text-2xl font-black font-mono text-text-main">{stats.total_users || 0}</span>
          </div>
        </div>

        {/* Registered Postes / Workstations */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-bold block">{t('audit_logs.kpi_total_postes')}</span>
            <span className="text-2xl font-black font-mono text-text-main">{stats.total_postes || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. Multi-Criteria Filter Controls Panel */}
      <div className="p-5 bg-surface-card border border-border rounded-3xl shadow-sm space-y-4">
        
        {/* Row 1: Period Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-muted shrink-0 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {t('audit_logs.filter_period')}
            </span>
            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
              {[
                { id: 'all', label: t('audit_logs.period_all') },
                { id: 'today', label: t('audit_logs.period_today') },
                { id: 'yesterday', label: t('audit_logs.period_yesterday') },
                { id: 'this_week', label: t('audit_logs.period_this_week') },
                { id: 'this_month', label: t('audit_logs.period_this_month') },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPeriod(p.id);
                    setSpecificDate('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p.id && !specificDate && !startDate
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-bold text-primary hover:underline"
          >
            {t('audit_logs.clear_filters')}
          </button>
        </div>

        {/* Row 2: Selectable Dropdowns & Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Specific Date */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1">
              {t('audit_logs.filter_date')}
            </label>
            <DateInput
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                setPeriod('custom');
              }}
              className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-mono text-text-main focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* User Selector */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1">
              {t('audit_logs.filter_user')}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">{t('audit_logs.filter_all_users')}</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1">
              {t('audit_logs.filter_action')}
            </label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">{t('audit_logs.filter_all_actions')}</option>
              {filterOptions.actionTypes.map((act) => (
                <option key={act} value={act}>
                  {t(`audit_logs.action_${act.toLowerCase()}`) || act}
                </option>
              ))}
            </select>
          </div>

          {/* Data Category */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1">
              {t('audit_logs.filter_data_type')}
            </label>
            <select
              value={selectedDataType}
              onChange={(e) => setSelectedDataType(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">{t('audit_logs.filter_all_data_types')}</option>
              {filterOptions.dataTypes.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`audit_logs.data_${cat.toLowerCase()}`) || cat}
                </option>
              ))}
            </select>
          </div>

          {/* Workstation (Poste) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-text-muted mb-1">
              {t('audit_logs.filter_poste')}
            </label>
            <select
              value={selectedPoste}
              onChange={(e) => setSelectedPoste(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary outline-none truncate"
            >
              <option value="ALL">{t('audit_logs.filter_all_postes')}</option>
              {filterOptions.postes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Live Keyword Search */}
        <div className="relative">
          <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-text-muted`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('audit_logs.search_placeholder')}
            className={`w-full ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2.5 bg-surface border border-border rounded-xl text-xs text-text-main placeholder-text-muted/60 focus:ring-2 focus:ring-primary outline-none`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Logs Table */}
      <div className="bg-surface-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-surface/80 text-text-muted font-black uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="p-3.5 text-start">{t('audit_logs.col_time')}</th>
                <th className="p-3.5 text-start">{t('audit_logs.col_user')}</th>
                <th className="p-3.5 text-start">{t('audit_logs.col_action')}</th>
                <th className="p-3.5 text-start">{t('audit_logs.col_data_type')}</th>
                <th className="p-3.5 text-start">{t('audit_logs.col_poste')}</th>
                <th className="p-3.5 text-start">{t('audit_logs.col_details')}</th>
                <th className="p-3.5 text-center">{t('audit_logs.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>{t('common.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <History className="w-10 h-10 text-text-muted/40" />
                      <span className="font-bold text-sm text-text-main">{t('audit_logs.no_logs_found')}</span>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-bold text-primary hover:underline"
                      >
                        {t('audit_logs.clear_filters')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                    {/* Timestamp */}
                    <td className="p-3.5 font-mono text-[11px] text-text-muted whitespace-nowrap">
                      {DateTimeFormatter.formatDateTime(log.created_at)}
                    </td>

                    {/* User */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {(log.user_full_name || log.username || 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-text-main block">
                            {log.user_full_name || log.username}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">
                            {log.user_role || 'SYSTEM'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Action Type */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${getActionBadge(log.action_type)}`}>
                        {t(`audit_logs.action_${log.action_type?.toLowerCase()}`) || log.action_type}
                      </span>
                    </td>

                    {/* Data Category */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-text-main">
                        {getDataTypeIcon(log.data_type)}
                        <span>{t(`audit_logs.data_${log.data_type?.toLowerCase()}`) || log.data_type}</span>
                      </div>
                    </td>

                    {/* Workstation (Poste & Device Key) */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-surface border border-border text-text-muted">
                          <Monitor className="w-3 h-3 text-primary shrink-0" />
                          <span className="max-w-[150px] truncate">{log.poste}</span>
                        </span>
                        {log.device_key && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary font-bold">
                            <KeyRound className="w-2.5 h-2.5" />
                            <span>{log.device_key}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action Details */}
                    <td className="p-3.5 text-text-main max-w-xs md:max-w-md truncate">
                      {log.details || log.entity_name || '—'}
                    </td>

                    {/* Inspection Button */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectedLog(log);
                          setInspectModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface border border-border transition-colors"
                        title={t('audit_logs.view_details_btn')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-surface/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-text-muted">
            {t('audit_logs.page_info', {
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface-card hover:bg-surface font-bold text-text-main flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
              <span>{t('audit_logs.prev_page')}</span>
            </button>

            <span className="px-3 py-1 font-mono font-bold bg-primary/10 text-primary rounded-lg">
              {pagination.page}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface-card hover:bg-surface font-bold text-text-main flex items-center gap-1 disabled:opacity-40"
            >
              <span>{t('audit_logs.next_page')}</span>
              <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Detailed Inspection Modal */}
      {inspectModalOpen && inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-card border border-border rounded-3xl p-6 shadow-2xl space-y-5" dir={dir}>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-main">
                    {t('audit_logs.modal_details_title')}
                  </h3>
                  <span className="text-xs text-text-muted font-mono">
                    ID: #{inspectedLog.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 rounded-xl bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                <span className="text-text-muted font-bold">{t('audit_logs.col_time')}</span>
                <span className="font-mono font-bold text-text-main">
                  {DateTimeFormatter.formatDateTime(inspectedLog.created_at)}
                </span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                <span className="text-text-muted font-bold">{t('audit_logs.col_user')}</span>
                <span className="font-bold text-text-main">
                  {inspectedLog.user_full_name} ({inspectedLog.username}) - <span className="font-mono text-primary">{inspectedLog.user_role}</span>
                </span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                <span className="text-text-muted font-bold">{t('audit_logs.col_action')}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getActionBadge(inspectedLog.action_type)}`}>
                  {inspectedLog.action_type}
                </span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                <span className="text-text-muted font-bold">{t('audit_logs.col_data_type')}</span>
                <span className="font-bold text-text-main">
                  {inspectedLog.data_type}
                </span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                <span className="text-text-muted font-bold">{t('audit_logs.col_poste')}</span>
                <span className="font-mono font-bold text-primary">
                  {inspectedLog.poste}
                </span>
              </div>

              {inspectedLog.device_key && (
                <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                  <span className="text-text-muted font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    <span>{t('audit_logs.device_key_label', 'رمز الجهاز (Device Key)')}</span>
                  </span>
                  <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {inspectedLog.device_key}
                  </span>
                </div>
              )}

              {inspectedLog.entity_name && (
                <div className="p-3 bg-surface rounded-xl border border-border flex justify-between items-center">
                  <span className="text-text-muted font-bold">{t('audit_logs.entity_label')}</span>
                  <span className="font-bold text-text-main">
                    {inspectedLog.entity_name} {inspectedLog.entity_id ? `(#${inspectedLog.entity_id})` : ''}
                  </span>
                </div>
              )}

              {inspectedLog.details && (
                <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1">
                  <span className="text-text-muted font-bold block">{t('audit_logs.col_details')}</span>
                  <p className="text-sm font-medium text-text-main leading-relaxed">
                    {inspectedLog.details}
                  </p>
                </div>
              )}

              {inspectedLog.user_agent && (
                <div className="p-3 bg-surface/50 rounded-xl border border-border space-y-1 text-[11px] text-text-muted">
                  <span className="font-bold block">{t('audit_logs.client_user_agent')}</span>
                  <p className="font-mono truncate">{inspectedLog.user_agent}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Workstation Naming Modal */}
      {posteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleSavePosteName} className="w-full max-w-md bg-surface-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" dir={dir}>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-text-main">
                  {t('audit_logs.workstation_settings_btn')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPosteModalOpen(false)}
                className="p-1.5 rounded-xl bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              {t('audit_logs.workstation_name_prompt')}
            </p>

            <div>
              <input
                type="text"
                value={currentPosteName}
                onChange={(e) => setCurrentPosteName(e.target.value)}
                placeholder="Poste-Accueil / Direction..."
                className="w-full p-3 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPosteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-md shadow-primary/25"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
