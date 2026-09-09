import React, { useState, useEffect, useCallback } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { ArrowLeftRight, Calendar, User, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function TransfersPage() {
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { showNotification } = useNotification();
  const { t, isRtl } = useLanguage();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransfers = useCallback(async () => {
    if (!selectedYearId) return;
    try {
      setLoading(true);
      const res = await api.get(`/transfers?academic_year_id=${selectedYearId}`);
      if (res.success) {
        setTransfers(res.data);
      }
    } catch (err) {
      showNotification(err.message || t('transfers.fetch_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, showNotification, t]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const filteredTransfers = transfers.filter(t => 
    t.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reg_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-text-main">
          {t('transfers.title')}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t('transfers.subtitle', { year: selectedYearObj?.label || '' })}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between p-3 bg-surface-card border border-border rounded-2xl gap-4 flex-wrap">
        <div className="relative w-full max-w-md">
          <Search className={`w-4 h-4 text-text-muted absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
          <input
            type="text"
            placeholder={t('transfers.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full py-2.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary ${
              isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
          />
        </div>

        <span className="text-xs font-bold text-text-muted">
          {t('transfers.total_transfers', { count: filteredTransfers.length })}
        </span>
      </div>

      {/* Transfers Cards / Table */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-text-muted">{t('transfers.loading_transfers')}</div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-text-muted bg-surface-card border border-border rounded-3xl">
            {t('transfers.no_transfers')}
          </div>
        ) : (
          filteredTransfers.map((tr) => (
            <div key={tr.id} className="p-5 bg-surface-card border border-border rounded-3xl shadow-sm hover:border-primary/40 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <Link to={`/students/${tr.student_id}`} className="text-base font-extrabold text-text-main hover:text-primary transition-colors">
                      {tr.student_name}
                    </Link>
                    <span className="text-xs font-mono text-primary block">{tr.reg_no}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('transfers.transfer_date')} <span className="font-mono">{DateTimeFormatter.formatDateTime(tr.transfer_date)}</span></span>
                </div>
              </div>

              {/* From / To Groups Route */}
              <div className="flex items-center gap-3 p-3 bg-surface rounded-2xl border border-border/60 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{t('transfers.from_group')}</span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    {tr.from_group_name}
                  </span>
                </div>

                <span className="text-primary font-bold">
                  {isRtl ? '←' : '→'} {t('transfers.to_label')} {isRtl ? '←' : '→'}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{t('transfers.to_group')}</span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {tr.to_group_name}
                  </span>
                </div>
              </div>

              {/* Reason & Responsible */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                <p className="text-text-muted italic leading-relaxed">
                  {t('transfers.reason')} <strong className="text-text-main not-italic">{tr.reason}</strong>
                </p>
                <span className="text-text-muted whitespace-nowrap">
                  {t('transfers.executed_by')}: <strong>{tr.created_by}</strong>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

