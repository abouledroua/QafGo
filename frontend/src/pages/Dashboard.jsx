import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import api from '../services/api';
import { 
  Users, 
  Layers, 
  ArrowLeftRight, 
  Wallet, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Award, 
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function Dashboard() {
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { settings, loading: settingsLoading, fetchSettings } = useSettings();
  const { t, dir, isRtl } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!selectedYearId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/stats/dashboard?academic_year_id=${selectedYearId}`);
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedYearId]);

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-muted font-bold text-base">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  const halaqaStats = stats?.trackBreakdown?.find(t => t.track_type === 'HALAQA') || { groups_count: 0, active_students_count: 0 };
  const preschoolStats = stats?.trackBreakdown?.find(t => t.track_type === 'PRESCHOOL') || { groups_count: 0, active_students_count: 0 };
  const tutoringStats = stats?.trackBreakdown?.find(t => t.track_type === 'TUTORING') || { groups_count: 0, active_students_count: 0 };

  const toBool = (val) => val === true || val === 1 || val === '1' || val === 'true';
  const isQuranEnabled = toBool(settings?.enable_quran_track);
  const isPreschoolEnabled = toBool(settings?.enable_preschool_track);
  const isTutoringEnabled = toBool(settings?.enable_tutoring_track);

  return (
    <div className="space-y-8 animate-fadeIn" dir={dir}>
      
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden p-8 rounded-3xl hero-gradient-banner shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/25 backdrop-blur-md text-xs font-bold text-white border border-white/20">
            <Calendar className="w-3.5 h-3.5 text-white" />
            <span>{t('dashboard.academic_year_scope', { year: selectedYearObj?.label || '' })}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black font-cairo text-white tracking-tight">
            {t('dashboard.welcome_title')}
          </h1>
          <p className="text-white/90 text-base leading-relaxed max-w-2xl">
            {t('dashboard.welcome_subtitle')}
          </p>
        </div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Primary KPI Metrics */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isQuranEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5`}>
        
        {/* Total Active Students */}
        <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-text-muted">{t('dashboard.active_students')}</span>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-black text-text-main font-cairo">
            {stats?.summary?.total_students || 0}
          </div>
          <p className="text-xs text-text-muted mt-1">{t('dashboard.students_desc')}</p>
        </div>

        {/* Total Groups */}
        <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-text-muted">{t('dashboard.groups_and_circles')}</span>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-black text-text-main font-cairo">
            {stats?.summary?.total_groups || 0}
          </div>
          <p className="text-xs text-text-muted mt-1">{t('dashboard.groups_desc')}</p>
        </div>

        {/* Total Transfers */}
        <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-text-muted">{t('dashboard.transfers_done')}</span>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-black text-text-main font-cairo">
            {stats?.summary?.total_transfers || 0}
          </div>
          <p className="text-xs text-text-muted mt-1">{t('dashboard.transfers_desc')}</p>
        </div>

        {/* Financial Highlights (Receipts & Exemptions) - Displayed only when Quranic track is enabled */}
        {isQuranEnabled && (
          <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-text-muted">{t('dashboard.revenue_and_exemptions')}</span>
              <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <div className="text-2xl font-black text-text-main font-cairo">
              {parseFloat(stats?.finances?.total_revenue || 0).toLocaleString()} <span className="text-xs font-bold text-text-muted">{t('common.currency')}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>{t('dashboard.exemptions_count', { count: stats?.finances?.total_exemptions || 0 })}</span>
            </div>
          </div>
        )}

      </div>

      {/* Concurrent Tracks Deep-Dive Cards */}
      {(() => {
        const activeTracksCount = [isQuranEnabled, isPreschoolEnabled, isTutoringEnabled].filter(Boolean).length;

        if (activeTracksCount === 0) {
          return null;
        }

        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-extrabold text-text-main">
                {t('dashboard.active_educational_tracks')}
              </h2>
              <Link to="/tracks" className="text-xs font-bold text-primary hover:underline">
                {t('dashboard.view_all_groups')} {isRtl ? '←' : '→'}
              </Link>
            </div>

            <div className={`grid gap-6 ${
              activeTracksCount === 1 ? 'grid-cols-1 max-w-xl' : activeTracksCount === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'
            }`}>
              
              {/* 1. Track: المسار القرآني */}
              {isQuranEnabled && (
                <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {t('dashboard.quran_track_badge')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text-main mb-1">{t('dashboard.quran_track_title')}</h3>
                  <p className="text-xs text-text-muted mb-6 leading-relaxed">
                    {t('dashboard.quran_track_desc')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="p-3 rounded-2xl bg-surface text-center">
                      <span className="text-xs text-text-muted block">{t('dashboard.active_circles')}</span>
                      <span className="text-xl font-black text-emerald-600">{halaqaStats.groups_count}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-surface text-center">
                      <span className="text-xs text-text-muted block">{t('dashboard.hafiz_students')}</span>
                      <span className="text-xl font-black text-emerald-600">{halaqaStats.active_students_count}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Track: مسار التعليم المبكر والتحضيري */}
              {isPreschoolEnabled && (
                <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:border-purple-500/40 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                      <Baby className="w-7 h-7" />
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300">
                      {t('dashboard.preschool_track_badge')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text-main mb-1">{t('dashboard.preschool_track_title')}</h3>
                  <p className="text-xs text-text-muted mb-6 leading-relaxed">
                    {t('dashboard.preschool_track_desc')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="p-3 rounded-2xl bg-surface text-center">
                      <span className="text-xs text-text-muted block">{t('dashboard.preschool_groups')}</span>
                      <span className="text-xl font-black text-purple-600">{preschoolStats.groups_count}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-surface text-center">
                      <span className="text-xs text-text-muted block">{t('dashboard.preschool_students')}</span>
                      <span className="text-xl font-black text-purple-600">{preschoolStats.active_students_count}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Track: مسار دروس الدعم والتقوية */}
              {isTutoringEnabled && (
                <div className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      {t('dashboard.tutoring_track_badge')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text-main mb-1">{t('dashboard.tutoring_track_title')}</h3>
                  <p className="text-xs text-text-muted mb-6 leading-relaxed">
                    {t('dashboard.tutoring_track_desc')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="p-3 rounded-2xl bg-surface text-center">
                      <span className="text-xs text-text-muted block">{t('dashboard.tutoring_groups')}</span>
                      <span className="text-xl font-black text-blue-600">{tutoringStats.groups_count}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-surface text-center">
                      <span className="text-xs text-text-muted block">{t('dashboard.tutoring_students')}</span>
                      <span className="text-xl font-black text-blue-600">{tutoringStats.active_students_count}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Recent Activity Grid */}
      <div className={`grid gap-6 ${isQuranEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Recent Quranic Sessions (Displayed only when Quranic track is enabled) */}
        {isQuranEnabled && (
          <div className="p-6 bg-surface-card border border-border rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-text-main">{t('dashboard.recent_quran_sessions')}</h3>
              </div>
              <Link to="/tracks" className="text-xs font-bold text-primary hover:underline">
                {t('dashboard.evaluations_log')}
              </Link>
            </div>

            <div className="space-y-3">
              {stats?.recentTahfiz?.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6">{t('dashboard.no_sessions_yet')}</p>
              ) : (
                stats?.recentTahfiz?.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        {log.type === 'MEMORIZATION' ? t('dashboard.memorization') : t('dashboard.revision')}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-main">{log.student_name}</h4>
                        <p className="text-xs text-text-muted">
                          {t('dashboard.from_surah_to', { from: log.surah_from, to: log.surah_to, group: log.group_name })}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {log.grade === 'MUMTAZ' ? t('dashboard.grade_mumtaz') : t('dashboard.grade_very_good')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent Mid-Year Transfers */}
        <div className="p-6 bg-surface-card border border-border rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-text-main">{t('dashboard.recent_transfers_title')}</h3>
            </div>
            <Link to="/transfers" className="text-xs font-bold text-primary hover:underline">
              {t('dashboard.full_log')}
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.recentTransfers?.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">{t('dashboard.no_transfers_yet')}</p>
            ) : (
              stats?.recentTransfers?.map((tr) => (
                <div key={tr.id} className="p-3.5 bg-surface rounded-2xl border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-main">{tr.student_name}</h4>
                    <span className="text-[11px] font-mono text-text-muted">{DateTimeFormatter.formatDate(tr.transfer_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">{t('dashboard.from')}: {tr.from_group}</span>
                    <span className="text-text-muted">←</span>
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">{t('dashboard.to')}: {tr.to_group}</span>
                  </div>
                  <p className="text-xs text-text-muted italic">{tr.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
