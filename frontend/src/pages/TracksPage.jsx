import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { 
  Layers, 
  Plus, 
  Search, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  X, 
  Sparkles,
  Tag,
  Play,
  Pause,
  RotateCcw,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import GroupScheduleBuilder from '../components/GroupScheduleBuilder';
import GroupEditModal from '../components/GroupEditModal';

export default function TracksPage() {
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { showNotification, confirm } = useNotification();
  const { settings } = useSettings();
  const { t, dir, isRtl } = useLanguage();

  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'HALAQA' | 'PRESCHOOL' | 'TUTORING'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PENDING' | 'STOPPED' | 'ARCHIVED'
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // New Group Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    track_type: 'HALAQA',
    subject_name: '',
    teacher_id: '',
    room: '',
    schedule: '',
    sessions: [],
    is_free: false,
    monthly_fee: 1500
  });

  // Edit Group Modal state
  const [editingGroup, setEditingGroup] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleOpenEditModal = (group) => {
    setEditingGroup(group);
    setEditModalOpen(true);
  };

  const fetchGroups = useCallback(async () => {
    if (!selectedYearId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let url = `/groups?academic_year_id=${selectedYearId}`;
      if (activeTab !== 'ALL') {
        url += `&track_type=${activeTab}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const res = await api.get(url);
      if (res.success) {
        setGroups(res.data);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, activeTab, searchTerm, showNotification, t]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [teachersRes, classroomsRes] = await Promise.all([
          api.get('/teachers'),
          api.get('/classrooms')
        ]);
        if (teachersRes.success) setTeachers(teachersRes.data || []);
        if (classroomsRes.success) setClassrooms(classroomsRes.data || []);
      } catch (err) {
        console.error('Failed to load dependencies:', err);
      }
    };
    fetchDependencies();
  }, []);

  const [scheduleConflict, setScheduleConflict] = useState(false);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showNotification(t('tracks.group_name_required'), 'warning');
      return;
    }

    if (formData.track_type === 'TUTORING' && scheduleConflict) {
      showNotification(t('tracks.schedule_overlap_error_toast'), 'warning');
      return;
    }

    try {
      const payload = {
        ...formData,
        subject_name: formData.track_type === 'PRESCHOOL' ? null : (formData.subject_name?.trim() || null),
        academic_year_id: selectedYearId,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id, 10) : null,
        monthly_fee: formData.is_free ? 0 : parseFloat(formData.monthly_fee) || 0
      };

      const res = await api.post('/groups', payload);
      if (res.success) {
        showNotification(res.message || t('tracks.group_created_success'), 'success');
        setModalOpen(false);
        setScheduleConflict(false);
        setFormData({
          name: '',
          track_type: 'HALAQA',
          subject_name: '',
          teacher_id: '',
          room: '',
          schedule: '',
          sessions: [],
          is_free: false,
          monthly_fee: 1500
        });
        fetchGroups();
      }
    } catch (err) {
      showNotification(err.message || t('tracks.group_created_failed'), 'error');
    }
  };

  const isQuranEnabled = Boolean(settings?.enable_quran_track);
  const isPreschoolEnabled = Boolean(settings?.enable_preschool_track);
  const isTutoringEnabled = Boolean(settings?.enable_tutoring_track);

  // Auto fallback if activeTab belongs to a disabled track
  useEffect(() => {
    if (activeTab === 'HALAQA' && !isQuranEnabled) {
      setActiveTab('ALL');
    } else if (activeTab === 'PRESCHOOL' && !isPreschoolEnabled) {
      setActiveTab('ALL');
    } else if (activeTab === 'TUTORING' && !isTutoringEnabled) {
      setActiveTab('ALL');
    }
  }, [activeTab, isQuranEnabled, isPreschoolEnabled, isTutoringEnabled]);

  const firstAvailableTrack = isQuranEnabled 
    ? 'HALAQA' 
    : isPreschoolEnabled 
    ? 'PRESCHOOL' 
    : isTutoringEnabled 
    ? 'TUTORING' 
    : '';

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      track_type: firstAvailableTrack || 'HALAQA',
      subject_name: '',
      teacher_id: '',
      room: '',
      schedule: '',
      is_free: false,
      monthly_fee: 1500
    });
    setModalOpen(true);
  };

  const handleStatusChange = async (groupOrId, newStatus) => {
    const group = typeof groupOrId === 'object' ? groupOrId : (groups.find(g => g.id === groupOrId) || { id: groupOrId, name: '', status: 'ACTIVE' });
    const groupName = group.name || '';

    let title = t('confirm_dialog.title_status_change');
    let subtitle = t('confirm_dialog.subtitle_status_change');
    let message = t('confirm_dialog.start_group_msg', { name: groupName });
    let confirmText = t('confirm_dialog.confirm_btn');
    let variant = 'warning';
    let icon = null;

    if (newStatus === 'ACTIVE') {
      const isRestart = group.status === 'STOPPED';
      title = isRestart ? t('confirm_dialog.restart_group_title') : t('confirm_dialog.start_group_title');
      message = isRestart
        ? t('confirm_dialog.restart_group_msg', { name: groupName })
        : t('confirm_dialog.start_group_msg', { name: groupName });
      confirmText = isRestart ? t('tracks.action_restart') : t('tracks.action_start');
      variant = 'success';
      icon = isRestart ? 'rotate-ccw' : 'play';
    } else if (newStatus === 'STOPPED') {
      const isFromArchived = group.status === 'ARCHIVED';
      if (isFromArchived) {
        title = t('confirm_dialog.restore_group_title');
        message = t('confirm_dialog.restore_group_msg', { name: groupName });
        confirmText = t('tracks.action_restore');
        variant = 'info';
        icon = 'rotate-ccw';
      } else {
        title = t('confirm_dialog.stop_group_title');
        message = t('confirm_dialog.stop_group_msg', { name: groupName });
        confirmText = t('tracks.action_stop');
        variant = 'danger';
        icon = 'pause';
      }
    } else if (newStatus === 'ARCHIVED') {
      title = t('confirm_dialog.archive_group_title');
      message = t('confirm_dialog.archive_group_msg', { name: groupName });
      confirmText = t('tracks.action_archive');
      variant = 'warning';
      icon = 'archive';
    }

    const accepted = await confirm({
      title,
      subtitle,
      message,
      confirmText,
      cancelText: t('common.cancel'),
      variant,
      icon
    });

    if (!accepted) return;

    try {
      setUpdatingStatusId(group.id);
      const res = await api.patch(`/groups/${group.id}/status`, { status: newStatus });
      if (res.success) {
        showNotification(res.message || t('tracks.group_status_updated_success'), 'success');
        fetchGroups();
      }
    } catch (err) {
      showNotification(err.message || t('tracks.group_status_updated_failed'), 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Filter groups according to active track settings
  const visibleGroups = useMemo(() => {
    return groups.filter((group) => {
      if (group.track_type === 'HALAQA' && !isQuranEnabled) return false;
      if (group.track_type === 'PRESCHOOL' && !isPreschoolEnabled) return false;
      if (group.track_type === 'TUTORING' && !isTutoringEnabled) return false;
      return true;
    });
  }, [groups, isQuranEnabled, isPreschoolEnabled, isTutoringEnabled]);

  // Filter teachers matching the currently selected track type in modal
  const filteredTeachers = useMemo(() => {
    const selectedTrack = formData.track_type;
    if (!selectedTrack) return teachers;
    return teachers.filter(t => {
      // If teacher has track_types array
      if (Array.isArray(t.track_types) && t.track_types.length > 0) {
        if (t.track_types.includes('GENERAL') || t.track_types.includes('ALL')) return true;
        return t.track_types.includes(selectedTrack);
      }
      // If teacher has track_type string (e.g. 'HALAQA' or 'HALAQA,TUTORING' or 'GENERAL')
      if (typeof t.track_type === 'string') {
        if (t.track_type === 'GENERAL' || t.track_type.includes('ALL')) return true;
        const types = t.track_type.split(',').map(s => s.trim());
        return types.includes(selectedTrack);
      }
      return true;
    });
  }, [teachers, formData.track_type]);

  const statusCounts = useMemo(() => {
    return {
      allNonArchived: visibleGroups.filter(g => (g.status || 'ACTIVE') !== 'ARCHIVED').length,
      pending: visibleGroups.filter(g => g.status === 'PENDING').length,
      active: visibleGroups.filter(g => (g.status || 'ACTIVE') === 'ACTIVE').length,
      stopped: visibleGroups.filter(g => g.status === 'STOPPED').length,
      archived: visibleGroups.filter(g => g.status === 'ARCHIVED').length,
      total: visibleGroups.length
    };
  }, [visibleGroups]);

  const displayedGroups = useMemo(() => {
    return visibleGroups.filter(g => {
      const st = g.status || 'ACTIVE';
      if (statusFilter === 'ALL') return st !== 'ARCHIVED';
      return st === statusFilter;
    });
  }, [visibleGroups, statusFilter]);

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* Top Header & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-text-main">
            {t('tracks.page_title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('tracks.academic_year_approved', { year: selectedYearObj?.label || '', count: visibleGroups.length })}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={selectedYearObj?.is_locked || (!isQuranEnabled && !isPreschoolEnabled && !isTutoringEnabled)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-50 transition-all self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>{t('tracks.new_group_btn')}</span>
        </button>
      </div>

      {/* Notice if all tracks disabled */}
      {!isQuranEnabled && !isPreschoolEnabled && !isTutoringEnabled && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-700 dark:text-amber-300 text-xs font-bold">
          {t('tracks.tracks_disabled_warning')}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3 p-3 bg-surface-card border border-border rounded-3xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Track Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              }`}
            >
              {t('tracks.all_tracks', { count: visibleGroups.length })}
            </button>
            {isQuranEnabled && (
              <button
                type="button"
                onClick={() => setActiveTab('HALAQA')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'HALAQA'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-text-muted hover:text-emerald-700 hover:bg-emerald-500/10'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{t('tracks.track_quran')}</span>
              </button>
            )}
            {isPreschoolEnabled && (
              <button
                type="button"
                onClick={() => setActiveTab('PRESCHOOL')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'PRESCHOOL'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-text-muted hover:text-purple-700 hover:bg-purple-500/10'
                }`}
              >
                <Baby className="w-4 h-4" />
                <span>{t('tracks.track_preschool')}</span>
              </button>
            )}
            {isTutoringEnabled && (
              <button
                type="button"
                onClick={() => setActiveTab('TUTORING')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'TUTORING'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-text-muted hover:text-blue-700 hover:bg-blue-500/10'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>{t('tracks.track_tutoring')}</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className={`w-4 h-4 text-text-muted absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 pointer-events-none`} />
            <input
              type="text"
              placeholder={t('tracks.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-xl bg-surface border border-border text-xs font-medium text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary`}
            />
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-border/70 text-xs font-bold">
          <span className="text-text-muted text-[11px] whitespace-nowrap pl-1">
            {t('tracks.status_label')}
          </span>
          
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-surface text-primary border-primary shadow-sm font-black'
                : 'bg-surface/50 text-text-muted border-border hover:border-border/80'
            }`}
          >
            {t('tracks.status_all_non_archived', { count: statusCounts.allNonArchived })}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500/15 text-amber-600 border-amber-500 shadow-sm font-black'
                : 'bg-surface/50 text-text-muted border-border hover:border-amber-500/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('tracks.status_pending')} ({statusCounts.pending})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500 shadow-sm font-black'
                : 'bg-surface/50 text-text-muted border-border hover:border-emerald-500/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{t('tracks.status_active')} ({statusCounts.active})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('STOPPED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              statusFilter === 'STOPPED'
                ? 'bg-rose-500/15 text-rose-600 border-rose-500 shadow-sm font-black'
                : 'bg-surface/50 text-text-muted border-border hover:border-rose-500/50'
            }`}
          >
            <Pause className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('tracks.status_stopped')} ({statusCounts.stopped})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ARCHIVED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              statusFilter === 'ARCHIVED'
                ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500 shadow-sm font-black'
                : 'bg-surface/50 text-text-muted border-border hover:border-slate-500/50'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('tracks.status_archived')} ({statusCounts.archived})</span>
          </button>
        </div>
      </div>

      {/* Cohorts / Groups Grid */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">{t('tracks.loading_groups')}</div>
      ) : displayedGroups.length === 0 ? (
        <div className="p-12 bg-surface-card border border-border rounded-3xl text-center space-y-3">
          <Layers className="w-12 h-12 text-text-muted/60 mx-auto" />
          <h3 className="text-lg font-bold text-text-main">{t('tracks.no_groups_found')}</h3>
          <p className="text-xs text-text-muted">{t('tracks.no_groups_found_hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedGroups.map((group) => {
            const isHalaqa = group.track_type === 'HALAQA';
            const isPreschool = group.track_type === 'PRESCHOOL';
            const isTutoring = group.track_type === 'TUTORING';
            const groupStatus = group.status || 'ACTIVE';
            const isUpdatingThis = updatingStatusId === group.id;

            return (
              <div 
                key={group.id}
                className={`flex flex-col justify-between p-6 bg-surface-card border rounded-3xl shadow-sm hover:shadow-md transition-all group ${
                  groupStatus === 'STOPPED'
                    ? 'border-rose-500/30 bg-rose-500/[0.02]'
                    : groupStatus === 'PENDING'
                    ? 'border-amber-500/30 bg-amber-500/[0.02]'
                    : groupStatus === 'ARCHIVED'
                    ? 'border-slate-500/30 opacity-80'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Badge & Status Pill */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isHalaqa 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                        : isPreschool 
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    }`}>
                      {isHalaqa && <BookOpen className="w-3.5 h-3.5" />}
                      {isPreschool && <Baby className="w-3.5 h-3.5" />}
                      {isTutoring && <GraduationCap className="w-3.5 h-3.5" />}
                      <span>
                        {isHalaqa ? t('tracks.track_badge_halaqa') : isPreschool ? t('tracks.track_badge_preschool') : t('tracks.track_badge_tutoring')}
                      </span>
                    </span>

                    {/* Status Pill */}
                    {groupStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/25">
                        <Clock className="w-3 h-3" />
                        <span>{t('tracks.status_pending')}</span>
                      </span>
                    )}
                    {groupStatus === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{t('tracks.status_active')}</span>
                      </span>
                    )}
                    {groupStatus === 'STOPPED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/25">
                        <Pause className="w-3 h-3" />
                        <span>{t('tracks.status_stopped')}</span>
                      </span>
                    )}
                    {groupStatus === 'ARCHIVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25">
                        <Archive className="w-3 h-3" />
                        <span>{t('tracks.status_archived')}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h3 className="text-lg font-black text-text-main group-hover:text-primary transition-colors">
                      {group.name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {group.subject_name && group.track_type !== 'PRESCHOOL' ? (
                        <p className="text-xs text-text-muted truncate">{group.subject_name}</p>
                      ) : <span />}
                      {group.is_free ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 shrink-0">
                          {t('tracks.free_badge')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-surface text-text-main border border-border shrink-0">
                          {t('tracks.fee_per_month', { fee: parseFloat(group.monthly_fee).toLocaleString() })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-2 text-xs text-text-muted pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      {group.teacher_photo_url ? (
                        <img 
                          src={group.teacher_photo_url} 
                          alt={group.teacher_name} 
                          className="w-5 h-5 rounded-full object-cover border border-primary/30 flex-shrink-0" 
                        />
                      ) : (
                        <Users className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                      <span>{t('tracks.teacher_supervisor')} <strong>{group.teacher_name || t('tracks.unspecified')}</strong></span>
                    </div>
                    {group.schedule && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <span>{t('tracks.time_schedule')} {group.schedule}</span>
                      </div>
                    )}
                    {group.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-text-muted" />
                        <span>{t('tracks.room_location')} {group.room}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Card with Lifecycle controls */}
                <div className="pt-4 mt-4 border-t border-border flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-bold text-text-main">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        groupStatus === 'ACTIVE' 
                          ? 'bg-emerald-500' 
                          : groupStatus === 'PENDING' 
                          ? 'bg-amber-500' 
                          : groupStatus === 'STOPPED' 
                          ? 'bg-rose-500' 
                          : 'bg-slate-400'
                      }`}></span>
                      <span>{t('tracks.enrolled_students_count', { count: group.active_students_count || 0 })}</span>
                    </div>

                    {/* Quick Status Action Controls */}
                    <div className="flex items-center gap-1.5">
                      {groupStatus === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleStatusChange(group, 'ACTIVE')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-600 hover:text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                            title={t('tracks.action_start_title')}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{t('tracks.action_start')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleStatusChange(group, 'ARCHIVED')}
                            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-main transition-colors disabled:opacity-50"
                            title={t('tracks.action_archive_title')}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {groupStatus === 'ACTIVE' && (
                        <button
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(group, 'STOPPED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-600 hover:text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                          title={t('tracks.action_stop_title')}
                        >
                          <Pause className="w-3 h-3" />
                          <span>{t('tracks.action_stop')}</span>
                        </button>
                      )}

                      {groupStatus === 'STOPPED' && (
                        <>
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleStatusChange(group, 'ACTIVE')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-600 hover:text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                            title={t('tracks.action_restart_title')}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{t('tracks.action_restart')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleStatusChange(group, 'ARCHIVED')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-500/15 hover:bg-slate-700 text-slate-600 hover:text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                            title={t('tracks.action_archive_title')}
                          >
                            <Archive className="w-3 h-3" />
                            <span>{t('tracks.action_archive')}</span>
                          </button>
                        </>
                      )}

                      {groupStatus === 'ARCHIVED' && (
                        <button
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(group, 'STOPPED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                          title={t('tracks.action_restore_title')}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t('tracks.action_restore')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Link
                      to={`/groups/${group.id}`}
                      className="flex-1 text-center py-2 text-xs font-bold rounded-xl bg-surface hover:bg-primary hover:text-white border border-border hover:border-primary transition-all"
                    >
                      {t('tracks.view_group_and_evaluations')} {isRtl ? '←' : '→'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(group)}
                      className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 border border-border hover:border-primary/30 rounded-xl transition-all shrink-0"
                      title={t('tracks.edit_group_btn')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" dir={dir}>
            
            <div className="flex items-center justify-between p-6 border-b border-border bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-text-main">{t('tracks.create_group_title')}</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-hover"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4 overflow-y-auto">
              {/* Instance Mode Notification */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300 font-bold">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{t('tracks.modal_instance_notice')}</span>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('tracks.educational_track_label')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.track_type}
                  onChange={(e) => {
                    const newTrack = e.target.value;
                    setFormData(prev => {
                      // Check if currently selected teacher teaches the new track
                      let keepTeacher = false;
                      if (prev.teacher_id) {
                        const currentTeacher = teachers.find(tc => String(tc.id) === String(prev.teacher_id));
                        if (currentTeacher) {
                          const trackList = Array.isArray(currentTeacher.track_types)
                            ? currentTeacher.track_types
                            : (currentTeacher.track_type ? currentTeacher.track_type.split(',').map(s => s.trim()) : ['GENERAL']);
                          keepTeacher = trackList.includes('GENERAL') || trackList.includes('ALL') || trackList.includes(newTrack);
                        }
                      }
                      return {
                        ...prev,
                        track_type: newTrack,
                        teacher_id: keepTeacher ? prev.teacher_id : ''
                      };
                    });
                  }}
                  className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-bold text-text-main"
                >
                  {isQuranEnabled && (
                    <option value="HALAQA">{t('tracks.track_quran')}</option>
                  )}
                  {isPreschoolEnabled && (
                    <option value="PRESCHOOL">{t('tracks.track_preschool')}</option>
                  )}
                  {isTutoringEnabled && (
                    <option value="TUTORING">{t('tracks.track_tutoring')}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('tracks.group_name_label')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('tracks.group_name_placeholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main"
                  required
                />
              </div>

              {/* Subject / Program (hidden when track is preschool) */}
              {formData.track_type !== 'PRESCHOOL' && (
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('tracks.subject_program_label')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('tracks.subject_program_placeholder')}
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main"
                  />
                </div>
              )}

              {/* Teacher */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-xs font-bold text-text-main">
                      {t('tracks.teacher_label')}
                    </label>
                    <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                      ({filteredTeachers.length})
                    </span>
                  </div>
                  <Link 
                    to="/teachers" 
                    className="text-[11px] text-primary hover:underline font-bold"
                    title={t('tracks.manage_teachers_link')}
                  >
                    {t('tracks.manage_teachers_link')}
                  </Link>
                </div>
                <SearchableSelect
                  options={filteredTeachers.map(t => ({
                    value: String(t.id),
                    label: t.full_name,
                    sublabel: t.specialty,
                    badge: t.phone || '',
                    avatarUrl: t.photo_url || null,
                    avatarText: t.full_name ? t.full_name.charAt(0).toUpperCase() : '?',
                    searchExtra: `${t.full_name} ${t.specialty || ''} ${t.phone || ''}`
                  }))}
                  value={formData.teacher_id}
                  onChange={(val) => setFormData({ ...formData, teacher_id: val })}
                  placeholder={
                    formData.track_type === 'HALAQA'
                      ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_quran') })
                      : formData.track_type === 'PRESCHOOL'
                      ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_preschool') })
                      : formData.track_type === 'TUTORING'
                      ? t('tracks.select_teacher_for_track_placeholder', { track: t('tracks.track_tutoring') })
                      : t('tracks.select_teacher_placeholder')
                  }
                  searchPlaceholder={t('tracks.search_teacher_placeholder')}
                  icon={GraduationCap}
                />
                {filteredTeachers.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    {t('tracks.no_teachers_for_track_hint')}
                  </p>
                )}
              </div>

              {/* Classroom */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-text-main">
                    {t('tracks.classroom_label')}
                  </label>
                  <Link 
                    to="/timetable" 
                    className="text-[11px] text-primary hover:underline font-bold"
                    title={t('tracks.manage_classrooms_link')}
                  >
                    {t('tracks.manage_classrooms_link')}
                  </Link>
                </div>
                <SearchableSelect
                  options={classrooms.map(c => ({
                    value: c.name,
                    label: c.name,
                    sublabel: c.code ? `${t('classrooms_timetable.classroom_code', 'رمز')}: ${c.code}` : '',
                    badge: `${t('classrooms_timetable.room_capacity')}: ${c.capacity}`,
                    searchExtra: `${c.name} ${c.code || ''} ${c.equipment || ''}`
                  }))}
                  value={formData.room}
                  onChange={(val) => setFormData({ ...formData, room: val })}
                  placeholder={t('tracks.select_classroom_placeholder')}
                  searchPlaceholder={t('tracks.search_classroom_placeholder')}
                  icon={MapPin}
                />
              </div>

              {/* Weekly Schedule Builder */}
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {t('tracks.weekly_schedule_label')}
                </label>
                <GroupScheduleBuilder
                  trackType={formData.track_type}
                  value={formData.schedule}
                  onChange={(scheduleText, sessionsList, meta) => {
                    setFormData(prev => ({
                      ...prev,
                      schedule: scheduleText,
                      sessions: sessionsList
                    }));
                    setScheduleConflict(Boolean(meta?.hasConflict));
                  }}
                />
              </div>

              {/* Flexible Pricing Options */}
              <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-text-main block">{t('tracks.fully_free_group')}</span>
                    <span className="text-xs text-text-muted">{t('tracks.fully_free_hint')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                {!formData.is_free && (
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">
                      {t('tracks.monthly_fee_standard')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/25"
                >
                  {t('tracks.save_group_btn')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      <GroupEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        teachers={teachers}
        classrooms={classrooms}
        onSuccess={() => {
          fetchGroups();
        }}
      />

    </div>
  );
}
