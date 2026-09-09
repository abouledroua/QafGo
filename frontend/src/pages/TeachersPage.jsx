import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { 
  GraduationCap, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Layers, 
  Edit3, 
  Trash2, 
  BookOpen, 
  Baby, 
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  Filter,
  Camera,
  Upload,
  CalendarDays,
  Clock,
  MapPin,
  Printer,
  ExternalLink,
  Check,
  Plus
} from 'lucide-react';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function TeachersPage() {
  const { showNotification } = useNotification();
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { t, isRtl, dir } = useLanguage();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [trackFilter, setTrackFilter] = useState('ALL');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    specialty: '',
    track_types: ['HALAQA'],
    track_type: 'HALAQA',
    bio: '',
    photo_url: ''
  });

  // Delete Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Teacher Schedule Modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState(null);
  const [teacherScheduleSessions, setTeacherScheduleSessions] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const handleOpenTeacherSchedule = async (teacher) => {
    setSelectedTeacherForSchedule(teacher);
    setScheduleModalOpen(true);
    setLoadingSchedule(true);
    try {
      let url = `/timetable/week?teacher_id=${teacher.id}`;
      if (selectedYearId) url += `&academic_year_id=${selectedYearId}`;
      const res = await api.get(url);
      if (res.success) {
        setTeacherScheduleSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load teacher schedule:', err);
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/teachers';
      const params = new URLSearchParams();
      if (trackFilter && trackFilter !== 'ALL') {
        params.append('track_type', trackFilter);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const res = await api.get(url);
      if (res?.success) {
        setTeachers(res.data || []);
      }
    } catch (error) {
      console.error('fetchTeachers error:', error);
      showNotification(error.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [trackFilter, searchTerm, showNotification, t]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setPhotoPreview(null);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      specialty: '',
      track_types: ['HALAQA'],
      track_type: 'HALAQA',
      bio: '',
      photo_url: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (teacher) => {
    setEditingTeacher(teacher);
    setPhotoPreview(teacher.photo_url || null);
    
    // Parse track_types from array or comma-separated string
    let initialTracks = ['HALAQA'];
    if (Array.isArray(teacher.track_types) && teacher.track_types.length > 0) {
      initialTracks = teacher.track_types;
    } else if (teacher.track_type) {
      initialTracks = teacher.track_type.split(',').map(s => s.trim()).filter(Boolean);
    }

    setFormData({
      full_name: teacher.full_name || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      specialty: teacher.specialty || '',
      track_types: initialTracks.length > 0 ? initialTracks : ['HALAQA'],
      track_type: initialTracks.join(','),
      bio: teacher.bio || '',
      photo_url: teacher.photo_url || ''
    });
    setModalOpen(true);
  };

  const handleToggleTrack = (trackKey) => {
    setFormData(prev => {
      const current = prev.track_types || [];
      let updated;
      if (current.includes(trackKey)) {
        updated = current.filter(t => t !== trackKey);
        if (updated.length === 0) updated = [trackKey]; // keep at least one selected
      } else {
        updated = [...current.filter(t => t !== 'GENERAL'), trackKey];
      }
      return {
        ...prev,
        track_types: updated,
        track_type: updated.join(',')
      };
    });
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification('حجم الصورة يجب ألا يتجاوز 5 ميغابايت', 'warning');
      return;
    }

    try {
      setUploadingPhoto(true);
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'teacher_photo');

      const res = await api.post('/settings/upload-assets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res?.success && res?.url) {
        setPhotoPreview(res.url);
        setFormData(prev => ({ ...prev, photo_url: res.url }));
        showNotification(t('teachers.change_photo'), 'success');
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      showNotification(t('teachers.full_name'), 'warning');
      return;
    }

    const payload = {
      ...formData,
      track_types: formData.track_types?.length > 0 ? formData.track_types : ['HALAQA'],
      track_type: formData.track_types?.length > 0 ? formData.track_types.join(',') : 'HALAQA'
    };

    try {
      setSubmitting(true);
      if (editingTeacher) {
        const res = await api.put(`/teachers/${editingTeacher.id}`, payload);
        if (res?.success) {
          showNotification(res.message || t('common.saved'), 'success');
          setModalOpen(false);
          fetchTeachers();
        }
      } else {
        const res = await api.post('/teachers', payload);
        if (res?.success) {
          showNotification(res.message || t('common.saved'), 'success');
          setModalOpen(false);
          fetchTeachers();
        }
      }
    } catch (error) {
      const msg = error.message || t('common.error');
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/teachers/${teacherToDelete.id}`);
      if (res?.success) {
        showNotification(res.message || t('common.deleted'), 'success');
        setDeleteModalOpen(false);
        setTeacherToDelete(null);
        fetchTeachers();
      }
    } catch (error) {
      const msg = error.message || t('common.error');
      showNotification(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Track Type Helper
  const getTrackBadge = (type) => {
    switch (type) {
      case 'HALAQA':
        return {
          label: t('tracks.track_quran'),
          icon: BookOpen,
          badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
        };
      case 'PRESCHOOL':
        return {
          label: t('tracks.track_preschool'),
          icon: Baby,
          badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
        };
      case 'TUTORING':
        return {
          label: t('tracks.track_tutoring'),
          icon: GraduationCap,
          badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
        };
      default:
        return {
          label: t('teachers.filter_general'),
          icon: Layers,
          badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
        };
    }
  };

  // KPIs
  const totalCount = teachers.length;
  const quranCount = teachers.filter(tItem => tItem.track_types?.includes('HALAQA') || tItem.track_type?.includes('HALAQA') || tItem.track_type === 'GENERAL').length;
  const preschoolCount = teachers.filter(tItem => tItem.track_types?.includes('PRESCHOOL') || tItem.track_type?.includes('PRESCHOOL') || tItem.track_type === 'GENERAL').length;
  const tutoringCount = teachers.filter(tItem => tItem.track_types?.includes('TUTORING') || tItem.track_type?.includes('TUTORING') || tItem.track_type === 'GENERAL').length;

  return (
    <div className="space-y-8 animate-fadeIn font-cairo" dir={dir}>
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-card p-6 rounded-3xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner flex-shrink-0">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-main flex items-center gap-2.5">
              {t('teachers.title')}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {t('teachers.teacher_count', { count: totalCount })}
              </span>
            </h1>
            <p className="text-xs font-semibold text-text-muted mt-1">
              {t('teachers.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-sm flex-shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          <span>{t('teachers.new_teacher_btn')}</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card p-5 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('teachers.total_teachers')}</span>
            <span className="text-2xl font-black text-text-main">{totalCount}</span>
          </div>
        </div>

        <div className="bg-surface-card p-5 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('teachers.quran_teachers')}</span>
            <span className="text-2xl font-black text-emerald-600">{quranCount}</span>
          </div>
        </div>

        <div className="bg-surface-card p-5 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Baby className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('teachers.preschool_teachers')}</span>
            <span className="text-2xl font-black text-purple-600">{preschoolCount}</span>
          </div>
        </div>

        <div className="bg-surface-card p-5 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('teachers.tutoring_teachers')}</span>
            <span className="text-2xl font-black text-blue-600">{tutoringCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Track Filter Bar */}
      <div className="bg-surface-card p-4 rounded-2xl border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted`} />
          <input
            type="text"
            placeholder={t('teachers.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary text-text-main`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Track Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-text-muted hidden sm:block" />
          <span className="text-xs font-bold text-text-muted hidden sm:inline">{t('teachers.filter_by_track')}</span>
          <div className="flex bg-surface p-1 rounded-xl border border-border text-xs font-bold">
            {[
              { id: 'ALL', label: t('teachers.filter_all') },
              { id: 'HALAQA', label: t('teachers.filter_quran') },
              { id: 'PRESCHOOL', label: t('teachers.filter_preschool') },
              { id: 'TUTORING', label: t('teachers.filter_tutoring') },
              { id: 'GENERAL', label: t('teachers.filter_general') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTrackFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  trackFilter === tab.id
                    ? 'bg-primary text-white shadow-sm font-extrabold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Teachers Grid */}
      {loading ? (
        <div className="p-16 text-center bg-surface-card rounded-3xl border border-border">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm font-bold text-text-muted">{t('teachers.loading_teachers')}</span>
        </div>
      ) : teachers.length === 0 ? (
        <div className="p-16 text-center bg-surface-card rounded-3xl border border-border space-y-3">
          <GraduationCap className="w-14 h-14 text-text-muted mx-auto stroke-1" />
          <h3 className="text-base font-bold text-text-main">{t('teachers.no_teachers_found')}</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {t('teachers.no_teachers_hint')}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow hover:bg-primary-hover"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('teachers.new_teacher_btn')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teachers.map((teacher) => {
            const teacherTracks = (Array.isArray(teacher.track_types) && teacher.track_types.length > 0)
              ? teacher.track_types
              : (teacher.track_type ? teacher.track_type.split(',').map(s => s.trim()).filter(Boolean) : ['GENERAL']);

            return (
              <div 
                key={teacher.id} 
                className="bg-surface-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group hover:border-primary/40"
              >
                <div>
                  {/* Top: Avatar/Photo & Track Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {teacher.photo_url ? (
                        <img 
                          src={teacher.photo_url} 
                          alt={teacher.full_name} 
                          className="rounded-2xl object-cover border border-primary/25 shadow-sm flex-shrink-0"
                          style={{ width: '3.25rem', height: '3.25rem' }}
                        />
                      ) : (
                        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/25 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0" style={{ width: '3.25rem', height: '3.25rem' }}>
                          {teacher.full_name?.charAt(0) || 'م'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-extrabold text-text-main line-clamp-1 group-hover:text-primary transition-colors">
                          {teacher.full_name}
                        </h3>
                        <span className="text-xs font-semibold text-text-muted line-clamp-1">
                          {teacher.specialty || t('teachers.total_teachers')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 justify-end max-w-[55%]">
                      {teacherTracks.map(trk => {
                        const trackInfo = getTrackBadge(trk);
                        const TrackIcon = trackInfo.icon;
                        return (
                          <span 
                            key={trk}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${trackInfo.badgeClass}`}
                          >
                            <TrackIcon className="w-3 h-3" />
                            <span>{trackInfo.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 py-3 border-y border-border/60 text-xs font-medium text-text-muted">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary/70 flex-shrink-0" />
                      {teacher.phone ? (
                        <a href={`tel:${teacher.phone}`} className="hover:text-primary transition-colors font-mono" dir="ltr">
                          {teacher.phone}
                        </a>
                      ) : (
                        <span className="italic text-text-muted/60">{t('common.unspecified')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary/70 flex-shrink-0" />
                      {teacher.email ? (
                        <a href={`mailto:${teacher.email}`} className="hover:text-primary transition-colors truncate">
                          {teacher.email}
                        </a>
                      ) : (
                        <span className="italic text-text-muted/60">{t('common.unspecified')}</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Groups Section */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-text-muted flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        {t('tracks.teacher_supervisor')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        Number(teacher.groups_count) > 0 
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold' 
                          : 'bg-surface text-text-muted border border-border'
                      }`}>
                        {t('teachers.assigned_groups_count', { count: teacher.groups_count || 0 })}
                      </span>
                    </div>

                    {teacher.groups_names ? (
                      <p className="text-xs text-text-muted bg-surface p-2.5 rounded-xl border border-border/70 line-clamp-2 leading-relaxed">
                        {teacher.groups_names}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted/60 italic bg-surface/50 p-2.5 rounded-xl border border-border/40 text-center">
                        {t('teachers.no_assigned_groups')}
                      </p>
                    )}
                  </div>

                  {/* Bio if exists */}
                  {teacher.bio && (
                    <div className="mt-3 text-xs text-text-muted line-clamp-2 italic bg-surface/40 px-2.5 py-1.5 rounded-lg border border-border/40">
                      "{teacher.bio}"
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-border/60">
                  <button
                    onClick={() => handleOpenTeacherSchedule(teacher)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold transition-colors"
                    title={t('teachers.weekly_schedule_btn')}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{t('teachers.weekly_schedule_btn')}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(teacher)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-main border border-border rounded-xl text-xs font-bold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" />
                      <span>{t('teachers.edit_btn')}</span>
                    </button>

                    <button
                      onClick={() => handleOpenDelete(teacher)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('teachers.delete_btn')}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Edit Teacher Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-cairo">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">
                    {editingTeacher ? t('teachers.modal_edit_title') : t('teachers.modal_new_title')}
                  </h3>
                  <span className="text-xs text-text-muted">
                    {editingTeacher ? t('teachers.modal_edit_subtitle') : t('teachers.modal_new_subtitle')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-hover border border-border flex items-center justify-center text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Teacher Photo Upload Box */}
              <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl bg-surface-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {photoPreview ? (
                    <>
                      <img
                        src={photoPreview}
                        alt="معاينة"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setFormData(prev => ({ ...prev, photo_url: '' }));
                        }}
                        className="absolute top-1 left-1 bg-black/70 hover:bg-black text-white p-1 rounded-full text-[10px]"
                        title={t('teachers.remove_photo')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-text-muted">
                      <Camera className="w-7 h-7 text-text-muted/60" />
                      <span className="text-[10px] mt-1 font-bold">{t('teachers.teacher_photo')}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-center sm:text-start flex-1">
                  <span className="block text-xs font-bold text-text-main">
                    {t('teachers.teacher_photo')}
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPhoto ? t('teachers.saving') : photoPreview ? t('teachers.change_photo') : t('teachers.change_photo')}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        disabled={uploadingPhoto}
                        onChange={handlePhotoSelect}
                      />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setFormData(prev => ({ ...prev, photo_url: '' }));
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
                      >
                        {t('teachers.remove_photo')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('teachers.full_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('teachers.full_name')}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary text-text-main"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('teachers.phone')}
                  </label>
                  <input
                    type="tel"
                    placeholder="0550123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary text-text-main font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('teachers.email')}
                  </label>
                  <input
                    type="email"
                    placeholder="teacher@qafgo.dz"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary text-text-main font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('teachers.specialty')}
                </label>
                <input
                  type="text"
                  placeholder={t('teachers.specialty_placeholder')}
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary text-text-main"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-text-muted">
                    {t('teachers.authorized_tracks')}
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      key: 'HALAQA',
                      title: t('tracks.track_quran'),
                      icon: BookOpen,
                      activeBg: 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300',
                      badgeClass: 'bg-emerald-500 text-white'
                    },
                    {
                      key: 'PRESCHOOL',
                      title: t('tracks.track_preschool'),
                      icon: Baby,
                      activeBg: 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300',
                      badgeClass: 'bg-purple-500 text-white'
                    },
                    {
                      key: 'TUTORING',
                      title: t('tracks.track_tutoring'),
                      icon: GraduationCap,
                      activeBg: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300',
                      badgeClass: 'bg-blue-500 text-white'
                    }
                  ].map((track) => {
                    const Icon = track.icon;
                    const isSelected = formData.track_types?.includes(track.key);
                    return (
                      <button
                        key={track.key}
                        type="button"
                        onClick={() => handleToggleTrack(track.key)}
                        className={`p-3.5 rounded-2xl border text-start transition-all flex flex-col justify-between gap-2.5 relative ${
                          isSelected 
                            ? `${track.activeBg} ring-2 ring-primary/20 shadow-sm` 
                            : 'bg-surface hover:bg-surface-hover border-border text-text-muted opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className={`p-2 rounded-xl border ${isSelected ? 'border-current/20 bg-white/40 dark:bg-black/20' : 'border-border bg-surface-card'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                            isSelected 
                              ? `${track.badgeClass} border-transparent shadow-sm` 
                              : 'border-border bg-surface'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-text-main">{track.title}</h4>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('teachers.bio')}
                </label>
                <textarea
                  rows="3"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary text-text-main resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-extrabold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('teachers.saving')}</span>
                    </>
                  ) : (
                    <span>{editingTeacher ? t('common.save') : t('teachers.save_teacher_btn')}</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deleteModalOpen && teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 font-cairo">
            
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-text-main">{t('teachers.delete_modal_title')}</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {t('teachers.delete_confirm_text', { name: teacherToDelete.full_name })}
              </p>
              {Number(teacherToDelete.groups_count) > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-bold text-start mt-2">
                  {t('teachers.delete_warning')}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-5 py-2.5 bg-surface hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('teachers.saving')}</span>
                  </>
                ) : (
                  <span>{t('teachers.delete_btn')}</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Teacher Weekly Schedule (Emploi du temps) Modal */}
      {scheduleModalOpen && selectedTeacherForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 font-cairo max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                {selectedTeacherForSchedule.photo_url ? (
                  <img 
                    src={selectedTeacherForSchedule.photo_url} 
                    alt={selectedTeacherForSchedule.full_name} 
                    className="w-14 h-14 rounded-2xl object-cover border border-primary/25 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/25 flex items-center justify-center font-black text-xl shadow-sm">
                    {selectedTeacherForSchedule.full_name?.charAt(0) || 'م'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {t('teachers.teacher_schedule_title')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                      {selectedYearObj?.label || 'الحالية'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-text-main mt-0.5">
                    {selectedTeacherForSchedule.full_name}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {selectedTeacherForSchedule.specialty || t('teachers.total_teachers')} • {selectedTeacherForSchedule.phone || t('common.unspecified')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface border border-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Schedule Body */}
            {loadingSchedule ? (
              <div className="p-12 text-center text-text-muted space-y-3">
                <Clock className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="font-bold text-xs">{t('common.loading')}</p>
              </div>
            ) : teacherScheduleSessions.length === 0 ? (
              <div className="p-10 text-center text-text-muted bg-surface rounded-2xl border border-dashed border-border/80 space-y-3">
                <CalendarDays className="w-10 h-10 mx-auto text-text-muted/60 stroke-1" />
                <h4 className="font-bold text-sm text-text-main">{t('teachers.no_sessions_for_teacher')}</h4>
                <Link
                  to={`/timetable?teacher_id=${selectedTeacherForSchedule.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-hover transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('classrooms_timetable.add_session_btn')}</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="flex items-center justify-between p-3 bg-surface rounded-2xl border border-border/80 text-xs">
                  <span className="text-text-muted">
                    {teacherScheduleSessions.length} {t('common.records_count')}
                  </span>
                  <Link
                    to={`/timetable?teacher_id=${selectedTeacherForSchedule.id}`}
                    className="text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('classrooms_timetable.title')}</span>
                  </Link>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'SATURDAY', label: t('classrooms_timetable.day_saturday') },
                    { key: 'SUNDAY', label: t('classrooms_timetable.day_sunday') },
                    { key: 'MONDAY', label: t('classrooms_timetable.day_monday') },
                    { key: 'TUESDAY', label: t('classrooms_timetable.day_tuesday') },
                    { key: 'WEDNESDAY', label: t('classrooms_timetable.day_wednesday') },
                    { key: 'THURSDAY', label: t('classrooms_timetable.day_thursday') },
                    { key: 'FRIDAY', label: t('classrooms_timetable.day_friday') },
                  ].map(day => {
                    const daySessions = teacherScheduleSessions.filter(s => s.day_of_week === day.key);
                    if (daySessions.length === 0) return null;

                    return (
                      <div key={day.key} className="p-4 bg-surface rounded-2xl border border-border space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <span className="font-extrabold text-xs text-text-main font-cairo flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {day.label}
                          </span>
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-surface-card border border-border text-primary">
                            {daySessions.length}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {daySessions.map(session => (
                            <div 
                              key={session.id}
                              className="p-2.5 bg-surface-card rounded-xl border border-border/70 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono font-bold text-primary flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {session.start_time} - {session.end_time}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                  session.track_type === 'HALAQA' 
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                                    : session.track_type === 'PRESCHOOL'
                                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                }`}>
                                  {session.track_type === 'HALAQA' ? t('tracks.track_badge_halaqa') : session.track_type === 'PRESCHOOL' ? t('tracks.track_badge_preschool') : t('tracks.track_badge_tutoring')}
                                </span>
                              </div>

                              <h5 className="font-bold text-xs text-text-main">
                                {session.group_name}
                              </h5>

                              <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border/40">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-primary" />
                                  <span>{session.classroom_name || t('classrooms_timetable.type_general')}</span>
                                </span>
                                {session.notes && (
                                  <span className="italic text-text-muted truncate max-w-[150px]">
                                    {session.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover text-text-main border border-border rounded-xl text-xs font-bold transition-colors"
                title={t('teachers.print_schedule')}
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>{t('teachers.print_schedule')}</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                {t('common.cancel')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
