import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import {
  CalendarDays,
  DoorOpen,
  Plus,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Filter,
  Printer,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  BookOpen,
  Baby,
  X,
  Building2,
  Layers,
  Wrench,
  Check
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'SATURDAY', translationKey: 'day_saturday' },
  { key: 'SUNDAY', translationKey: 'day_sunday' },
  { key: 'MONDAY', translationKey: 'day_monday' },
  { key: 'TUESDAY', translationKey: 'day_tuesday' },
  { key: 'WEDNESDAY', translationKey: 'day_wednesday' },
  { key: 'THURSDAY', translationKey: 'day_thursday' },
  { key: 'FRIDAY', translationKey: 'day_friday' },
];

const CLASSROOM_TYPES = {
  GENERAL: { translationKey: 'type_general', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  HALAQA: { translationKey: 'type_halaqa', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  PRESCHOOL: { translationKey: 'type_preschool', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' },
  LAB: { translationKey: 'type_lab', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  LIBRARY: { translationKey: 'type_library', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' }
};

export default function ClassroomsTimetablePage() {
  const [searchParams] = useSearchParams();
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { showNotification } = useNotification();
  const { t, isRtl, dir } = useLanguage();

  const [activeTab, setActiveTab] = useState('TIMETABLE'); // 'TIMETABLE' | 'CLASSROOMS'
  const [loading, setLoading] = useState(true);

  // Core Data
  const [classrooms, setClassrooms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Timetable Filters (read initial query params if present)
  const [filterClassroom, setFilterClassroom] = useState(() => searchParams.get('classroom_id') || '');
  const [filterTeacher, setFilterTeacher] = useState(() => searchParams.get('teacher_id') || '');
  const [filterGroup, setFilterGroup] = useState(() => searchParams.get('group_id') || '');
  const [filterTrack, setFilterTrack] = useState(() => searchParams.get('track_type') || '');

  // Classrooms Search
  const [classroomSearch, setClassroomSearch] = useState('');

  // Classroom Modal
  const [classroomModalOpen, setClassroomModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [classroomForm, setClassroomForm] = useState({
    name: '',
    code: '',
    capacity: 25,
    type: 'GENERAL',
    equipment: '',
    status: 'AVAILABLE'
  });
  const [savingClassroom, setSavingClassroom] = useState(false);

  // Session Modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    group_id: '',
    classroom_id: '',
    teacher_id: '',
    day_of_week: 'SATURDAY',
    start_time: '08:00',
    end_time: '10:00',
    notes: ''
  });
  const [conflictErrors, setConflictErrors] = useState([]);
  const [savingSession, setSavingSession] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'CLASSROOM' | 'SESSION', id, title }
  const [deleting, setDeleting] = useState(false);

  // 1. Fetch Classrooms
  const fetchClassrooms = useCallback(async () => {
    try {
      const res = await api.get('/classrooms');
      if (res.success) {
        setClassrooms(res.data);
      }
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    }
  }, []);

  // 2. Fetch Timetable Sessions
  const fetchTimetable = useCallback(async () => {
    if (!selectedYearId) return;
    try {
      const res = await api.get(`/timetable/week?academic_year_id=${selectedYearId}`);
      if (res.success) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load timetable:', err);
    }
  }, [selectedYearId]);

  // 3. Fetch Groups and Teachers for select dropdowns
  const fetchSupportData = useCallback(async () => {
    if (!selectedYearId) return;
    try {
      const [grpRes, tchrRes] = await Promise.all([
        api.get(`/groups?academic_year_id=${selectedYearId}`),
        api.get('/teachers')
      ]);
      if (grpRes.success) setGroups(grpRes.data);
      if (tchrRes.success) setTeachers(tchrRes.data);
    } catch (err) {
      console.error('Failed to load support data:', err);
    }
  }, [selectedYearId]);

  // Initial Load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchClassrooms(), fetchTimetable(), fetchSupportData()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchClassrooms, fetchTimetable, fetchSupportData]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterClassroom && String(s.classroom_id) !== String(filterClassroom)) return false;
      if (filterTeacher && String(s.teacher_id) !== String(filterTeacher)) return false;
      if (filterGroup && String(s.group_id) !== String(filterGroup)) return false;
      if (filterTrack && s.track_type !== filterTrack) return false;
      return true;
    });
  }, [sessions, filterClassroom, filterTeacher, filterGroup, filterTrack]);

  // Group sessions by Day of Week
  const sessionsByDay = useMemo(() => {
    const map = {};
    DAYS_OF_WEEK.forEach(d => { map[d.key] = []; });
    filteredSessions.forEach(s => {
      if (map[s.day_of_week]) {
        map[s.day_of_week].push(s);
      }
    });
    return map;
  }, [filteredSessions]);

  // Filtered Classrooms
  const filteredClassrooms = useMemo(() => {
    if (!classroomSearch.trim()) return classrooms;
    const q = classroomSearch.toLowerCase();
    return classrooms.filter(c => 
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.equipment?.toLowerCase().includes(q)
    );
  }, [classrooms, classroomSearch]);

  // Statistics
  const stats = useMemo(() => {
    const totalCapacity = classrooms.reduce((acc, c) => acc + (parseInt(c.capacity, 10) || 0), 0);
    const availableClassrooms = classrooms.filter(c => c.status === 'AVAILABLE').length;
    return {
      totalClassrooms: classrooms.length,
      availableClassrooms,
      totalCapacity,
      weeklySessionsCount: sessions.length
    };
  }, [classrooms, sessions]);

  // --- Handlers: Classroom Modal ---
  const handleOpenClassroomModal = (classroom = null) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setClassroomForm({
        name: classroom.name || '',
        code: classroom.code || '',
        capacity: classroom.capacity || 25,
        type: classroom.type || 'GENERAL',
        equipment: classroom.equipment || '',
        status: classroom.status || 'AVAILABLE'
      });
    } else {
      setEditingClassroom(null);
      setClassroomForm({
        name: '',
        code: '',
        capacity: 25,
        type: 'GENERAL',
        equipment: '',
        status: 'AVAILABLE'
      });
    }
    setClassroomModalOpen(true);
  };

  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    if (!classroomForm.name.trim()) {
      showNotification(t('classrooms_timetable.room_name'), 'warning');
      return;
    }

    try {
      setSavingClassroom(true);
      let res;
      if (editingClassroom) {
        res = await api.put(`/classrooms/${editingClassroom.id}`, classroomForm);
      } else {
        res = await api.post('/classrooms', classroomForm);
      }

      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setClassroomModalOpen(false);
        fetchClassrooms();
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setSavingClassroom(false);
    }
  };

  // --- Handlers: Session Modal ---
  const handleOpenSessionModal = (session = null, presetDay = null) => {
    setConflictErrors([]);
    if (session) {
      setEditingSession(session);
      setSessionForm({
        group_id: String(session.group_id),
        classroom_id: session.classroom_id ? String(session.classroom_id) : '',
        teacher_id: session.teacher_id ? String(session.teacher_id) : '',
        day_of_week: session.day_of_week || 'SATURDAY',
        start_time: session.start_time || '08:00',
        end_time: session.end_time || '10:00',
        notes: session.notes || ''
      });
    } else {
      setEditingSession(null);
      setSessionForm({
        group_id: groups.length > 0 ? String(groups[0].id) : '',
        classroom_id: classrooms.length > 0 ? String(classrooms[0].id) : '',
        teacher_id: '',
        day_of_week: presetDay || 'SATURDAY',
        start_time: '08:00',
        end_time: '10:00',
        notes: ''
      });
    }
    setSessionModalOpen(true);
  };

  const handleSessionGroupChange = (groupId) => {
    const selectedGrp = groups.find(g => String(g.id) === String(groupId));
    setSessionForm(prev => ({
      ...prev,
      group_id: groupId,
      classroom_id: selectedGrp?.classroom_id ? String(selectedGrp.classroom_id) : prev.classroom_id,
      teacher_id: selectedGrp?.teacher_id ? String(selectedGrp.teacher_id) : prev.teacher_id
    }));
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    setConflictErrors([]);

    if (!sessionForm.group_id || !sessionForm.day_of_week || !sessionForm.start_time || !sessionForm.end_time) {
      showNotification(t('common.error'), 'warning');
      return;
    }

    try {
      setSavingSession(true);
      const payload = {
        academic_year_id: selectedYearId,
        group_id: parseInt(sessionForm.group_id, 10),
        classroom_id: sessionForm.classroom_id ? parseInt(sessionForm.classroom_id, 10) : null,
        teacher_id: sessionForm.teacher_id ? parseInt(sessionForm.teacher_id, 10) : null,
        day_of_week: sessionForm.day_of_week,
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        notes: sessionForm.notes || ''
      };

      let res;
      if (editingSession) {
        res = await api.put(`/timetable/sessions/${editingSession.id}`, payload);
      } else {
        res = await api.post('/timetable/sessions', payload);
      }

      if (res.success) {
        showNotification(res.message || t('common.saved'), 'success');
        setSessionModalOpen(false);
        fetchTimetable();
      }
    } catch (err) {
      if (err.status === 409 && err.conflicts) {
        setConflictErrors(err.conflicts);
        showNotification(t('classrooms_timetable.clash_warning'), 'error');
      } else {
        showNotification(err.message || t('common.error'), 'error');
      }
    } finally {
      setSavingSession(false);
    }
  };

  // --- Handlers: Delete Confirmation ---
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      if (itemToDelete.type === 'CLASSROOM') {
        const res = await api.delete(`/classrooms/${itemToDelete.id}`);
        if (res.success) {
          showNotification(res.message || t('common.deleted'), 'success');
          fetchClassrooms();
          fetchTimetable();
        }
      } else if (itemToDelete.type === 'SESSION') {
        const res = await api.delete(`/timetable/sessions/${itemToDelete.id}`);
        if (res.success) {
          showNotification(res.message || t('common.deleted'), 'success');
          fetchTimetable();
        }
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted space-y-3 animate-fadeIn">
        <Clock className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="font-bold text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* Top Header Card */}
      <div className="p-6 lg:p-8 bg-surface-card border border-border rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>{t('student_profile.academic_year_label', { year: selectedYearObj?.label || 'الحالية' })}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-text-main font-cairo">
              {t('classrooms_timetable.title')}
            </h1>
            <p className="text-xs text-text-muted mt-1">
              {t('classrooms_timetable.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-text-main text-xs font-bold transition-all shadow-sm"
              title={t('classrooms_timetable.print_schedule')}
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>{t('classrooms_timetable.print_schedule')}</span>
            </button>

            {activeTab === 'TIMETABLE' ? (
              <button
                type="button"
                onClick={() => handleOpenSessionModal()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('classrooms_timetable.add_session_btn')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenClassroomModal()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('classrooms_timetable.add_room_btn')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/80">
          <div className="p-3 bg-surface rounded-2xl border border-border/60">
            <span className="text-[11px] font-bold text-text-muted block mb-0.5">{t('classrooms_timetable.rooms_tab', { count: '' }).trim()}</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-xl font-black text-text-main font-mono">{stats.totalClassrooms}</strong>
              <span className="text-[11px] text-emerald-600 font-bold">({stats.availableClassrooms} {t('classrooms_timetable.room_status_available')})</span>
            </div>
          </div>

          <div className="p-3 bg-surface rounded-2xl border border-border/60">
            <span className="text-[11px] font-bold text-text-muted block mb-0.5">{t('classrooms_timetable.room_capacity_label')}</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-xl font-black text-primary font-mono">{stats.totalCapacity}</strong>
            </div>
          </div>

          <div className="p-3 bg-surface rounded-2xl border border-border/60">
            <span className="text-[11px] font-bold text-text-muted block mb-0.5">{t('classrooms_timetable.timetable_tab')}</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-xl font-black text-text-main font-mono">{stats.weeklySessionsCount}</strong>
            </div>
          </div>

          <div className="p-3 bg-surface rounded-2xl border border-border/60">
            <span className="text-[11px] font-bold text-text-muted block mb-0.5">{t('tracks.all_tracks', { count: groups.length })}</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-xl font-black text-text-main font-mono">{groups.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('TIMETABLE')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'TIMETABLE'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{t('classrooms_timetable.timetable_tab')}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-surface border border-border">
            {filteredSessions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CLASSROOMS')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'CLASSROOMS'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>{t('classrooms_timetable.rooms_tab', { count: classrooms.length })}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WEEKLY TIMETABLE VIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === 'TIMETABLE' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="p-4 bg-surface-card border border-border rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted shrink-0">
              <Filter className="w-4 h-4 text-primary" />
              <span>{t('teachers.filter_by_track')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
              {/* Filter by Classroom */}
              <select
                value={filterClassroom}
                onChange={(e) => setFilterClassroom(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none focus:border-primary"
              >
                <option value="">{t('classrooms_timetable.filter_classroom')}</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Filter by Teacher */}
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none focus:border-primary"
              >
                <option value="">{t('classrooms_timetable.filter_teacher')}</option>
                {teachers.map(teach => (
                  <option key={teach.id} value={teach.id}>{teach.full_name}</option>
                ))}
              </select>

              {/* Filter by Group */}
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none focus:border-primary"
              >
                <option value="">{t('classrooms_timetable.filter_group')}</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              {/* Filter by Track */}
              <select
                value={filterTrack}
                onChange={(e) => setFilterTrack(e.target.value)}
                className="p-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none focus:border-primary"
              >
                <option value="">{t('classrooms_timetable.filter_track')}</option>
                <option value="HALAQA">{t('tracks.track_quran')}</option>
                <option value="PRESCHOOL">{t('tracks.track_preschool')}</option>
                <option value="TUTORING">{t('tracks.track_tutoring')}</option>
              </select>
            </div>

            {(filterClassroom || filterTeacher || filterGroup || filterTrack) && (
              <button
                type="button"
                onClick={() => {
                  setFilterClassroom('');
                  setFilterTeacher('');
                  setFilterGroup('');
                  setFilterTrack('');
                }}
                className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-rose-600 text-xs font-bold border border-border shrink-0"
                title="إعادة ضبط الفلاتر"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>

          {/* Weekly Grid (7 Days Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const daySessions = sessionsByDay[day.key] || [];
              const dayLabel = t(`classrooms_timetable.${day.translationKey}`);
              const isFriday = day.key === 'FRIDAY';

              return (
                <div 
                  key={day.key} 
                  className={`flex flex-col bg-surface-card border rounded-3xl p-4 shadow-sm min-h-[380px] transition-all ${
                    isFriday ? 'border-border/60 bg-surface/40' : 'border-border'
                  }`}
                >
                  {/* Day Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <h3 className="font-black text-sm text-text-main font-cairo">{dayLabel}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-mono font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                        {daySessions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenSessionModal(null, day.key)}
                        className="w-6 h-6 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                        title={t('classrooms_timetable.add_session_btn')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day Sessions List */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {daySessions.length === 0 ? (
                      <div className="h-36 flex flex-col items-center justify-center text-center p-3 text-text-muted/60 border border-dashed border-border/60 rounded-2xl">
                        <Clock className="w-5 h-5 mb-1 stroke-1" />
                        <span className="text-[11px]">{t('classrooms_timetable.no_sessions_found')}</span>
                      </div>
                    ) : (
                      daySessions.map((session) => {
                        const isHalaqa = session.track_type === 'HALAQA';
                        const isPreschool = session.track_type === 'PRESCHOOL';

                        const trackColor = isHalaqa
                          ? (isRtl ? 'border-r-4 border-r-emerald-500 bg-emerald-500/5' : 'border-l-4 border-l-emerald-500 bg-emerald-500/5')
                          : isPreschool
                          ? (isRtl ? 'border-r-4 border-r-purple-500 bg-purple-500/5' : 'border-l-4 border-l-purple-500 bg-purple-500/5')
                          : (isRtl ? 'border-r-4 border-r-blue-500 bg-blue-500/5' : 'border-l-4 border-l-blue-500 bg-blue-500/5');

                        return (
                          <div
                            key={session.id}
                            className={`p-3 rounded-2xl bg-surface border border-border/80 shadow-xs hover:shadow-md transition-all group relative ${trackColor}`}
                          >
                            {/* Time badge */}
                            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-primary mb-1.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{session.start_time} - {session.end_time}</span>
                              </span>

                              {/* Action buttons visible on card hover */}
                              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSessionModal(session)}
                                  className="p-1 rounded-lg text-text-muted hover:text-primary hover:bg-surface-card"
                                  title={t('classrooms_timetable.edit_session_title')}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemToDelete({
                                      type: 'SESSION',
                                      id: session.id,
                                      title: `${session.group_name} (${session.start_time} - ${session.end_time})`
                                    });
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1 rounded-lg text-text-muted hover:text-rose-600 hover:bg-surface-card"
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Group Name & Track */}
                            <h4 className="font-bold text-xs text-text-main line-clamp-1 mb-1" title={session.group_name}>
                              {session.group_name}
                            </h4>

                            {/* Teacher info */}
                            <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-1">
                              <GraduationCap className="w-3 h-3 text-text-muted shrink-0" />
                              <span className="truncate">{session.teacher_name || t('common.unspecified')}</span>
                            </div>

                            {/* Classroom info */}
                            <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border/50">
                              <span className="flex items-center gap-1 text-primary font-medium truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <strong className="truncate">{session.classroom_name || t('classrooms_timetable.type_general')}</strong>
                              </span>

                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isHalaqa ? 'text-emerald-700 dark:text-emerald-300' : isPreschool ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'
                              }`}>
                                {isHalaqa ? t('tracks.track_badge_halaqa') : isPreschool ? t('tracks.track_badge_preschool') : t('tracks.track_badge_tutoring')}
                              </span>
                            </div>

                            {session.notes && (
                              <p className="text-[10px] text-text-muted/80 italic mt-1 line-clamp-1" title={session.notes}>
                                📝 {session.notes}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLASSROOMS MANAGEMENT VIEW                                         */}
      {/* ========================================================================= */}
      {activeTab === 'CLASSROOMS' && (
        <div className="space-y-6">
          
          {/* Classrooms Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-surface-card border border-border rounded-2xl shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-3 text-text-muted`} />
              <input
                type="text"
                placeholder={t('classrooms_timetable.search_classrooms_placeholder')}
                value={classroomSearch}
                onChange={(e) => setClassroomSearch(e.target.value)}
                className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none focus:border-primary`}
              >
              </input>
            </div>

            <div className="text-xs text-text-muted font-bold">
              {t('classrooms_timetable.rooms_tab', { count: filteredClassrooms.length })}
            </div>
          </div>

          {/* Classrooms Grid */}
          {filteredClassrooms.length === 0 ? (
            <div className="p-12 text-center text-text-muted bg-surface-card border border-border rounded-3xl space-y-3">
              <DoorOpen className="w-10 h-10 mx-auto text-text-muted/60 stroke-1" />
              <p className="font-bold text-sm">{t('classrooms_timetable.no_classrooms_found')}</p>
              <button
                type="button"
                onClick={() => handleOpenClassroomModal()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                {t('classrooms_timetable.add_room_btn')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredClassrooms.map((classroom) => {
                const typeConfig = CLASSROOM_TYPES[classroom.type] || CLASSROOM_TYPES.GENERAL;
                const typeLabel = t(`classrooms_timetable.${typeConfig.translationKey}`);
                const isAvailable = classroom.status === 'AVAILABLE';
                const isMaintenance = classroom.status === 'MAINTENANCE';

                return (
                  <div
                    key={classroom.id}
                    className="p-6 bg-surface-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeConfig.color}`}>
                              {typeLabel}
                            </span>
                            {classroom.code && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-surface text-text-muted border border-border">
                                {classroom.code}
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-lg text-text-main font-cairo">
                            {classroom.name}
                          </h3>
                        </div>

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : isMaintenance
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : 'bg-zinc-500/10 text-zinc-600 border border-zinc-500/20'
                        }`}>
                          {isAvailable ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{t('classrooms_timetable.room_status_available')}</span>
                            </>
                          ) : isMaintenance ? (
                            <>
                              <Wrench className="w-3 h-3" />
                              <span>{t('classrooms_timetable.room_status_maintenance')}</span>
                            </>
                          ) : (
                            <span>{t('common.unspecified')}</span>
                          )}
                        </span>
                      </div>

                      {/* Capacity & Usage stats */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-surface rounded-2xl border border-border/60 text-center">
                        <div>
                          <span className="text-[10px] text-text-muted block">{t('classrooms_timetable.room_capacity_label')}</span>
                          <strong className="text-sm font-black text-primary font-mono">{classroom.capacity || 25}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">{t('tracks.title')}</span>
                          <strong className="text-sm font-black text-text-main font-mono">{classroom.active_groups_count || 0}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">{t('classrooms_timetable.timetable_tab')}</span>
                          <strong className="text-sm font-black text-text-main font-mono">{classroom.weekly_sessions_count || 0}</strong>
                        </div>
                      </div>

                      {/* Equipment / Notes */}
                      {classroom.equipment ? (
                        <div className="text-xs text-text-muted space-y-1">
                          <span className="font-bold text-[11px] text-text-main block">{t('classrooms_timetable.room_equipment')}:</span>
                          <p className="p-2.5 bg-surface/50 rounded-xl border border-border/40 text-[11px] leading-relaxed">
                            {classroom.equipment}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterClassroom(String(classroom.id));
                          setActiveTab('TIMETABLE');
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{t('classrooms_timetable.timetable_tab')}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenClassroomModal(classroom)}
                          className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border transition-colors"
                          title={t('classrooms_timetable.edit_room')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete({
                              type: 'CLASSROOM',
                              id: classroom.id,
                              title: `${classroom.name}`
                            });
                            setDeleteModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-text-muted hover:text-rose-600 border border-border transition-colors"
                          title={t('classrooms_timetable.delete_room')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CLASSROOM                                             */}
      {/* ========================================================================= */}
      {classroomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-main">
                  {editingClassroom ? t('classrooms_timetable.edit_room_title') : t('classrooms_timetable.new_room_title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setClassroomModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.room_name')} *</label>
                  <input
                    type="text"
                    required
                    value={classroomForm.name}
                    onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.room_code')}</label>
                  <input
                    type="text"
                    value={classroomForm.code}
                    onChange={(e) => setClassroomForm({ ...classroomForm, code: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.room_capacity_label')}</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={classroomForm.capacity}
                    onChange={(e) => setClassroomForm({ ...classroomForm, capacity: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.room_type')}</label>
                  <select
                    value={classroomForm.type}
                    onChange={(e) => setClassroomForm({ ...classroomForm, type: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="GENERAL">{t('classrooms_timetable.type_general')}</option>
                    <option value="HALAQA">{t('classrooms_timetable.type_halaqa')}</option>
                    <option value="PRESCHOOL">{t('classrooms_timetable.type_preschool')}</option>
                    <option value="LAB">{t('classrooms_timetable.type_lab')}</option>
                    <option value="LIBRARY">{t('classrooms_timetable.type_library')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.room_status')}</label>
                  <select
                    value={classroomForm.status}
                    onChange={(e) => setClassroomForm({ ...classroomForm, status: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="AVAILABLE">{t('classrooms_timetable.room_status_available')}</option>
                    <option value="MAINTENANCE">{t('classrooms_timetable.room_status_maintenance')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.room_equipment')}</label>
                <textarea
                  rows="2"
                  value={classroomForm.equipment}
                  onChange={(e) => setClassroomForm({ ...classroomForm, equipment: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setClassroomModalOpen(false)}
                  disabled={savingClassroom}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingClassroom}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingClassroom ? t('common.loading') : t('classrooms_timetable.save_room_btn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT TIMETABLE SESSION (With Conflict Detection)           */}
      {/* ========================================================================= */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-main">
                  {editingSession ? t('classrooms_timetable.edit_session_title') : t('classrooms_timetable.new_session_title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Warnings Box */}
            {conflictErrors.length > 0 && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t('classrooms_timetable.clash_warning')}</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-400 space-y-1">
                  {conflictErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_group')} *</label>
                <select
                  required
                  value={sessionForm.group_id}
                  onChange={(e) => handleSessionGroupChange(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="">-- {t('classrooms_timetable.session_group')} --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_classroom')}</label>
                  <select
                    value={sessionForm.classroom_id}
                    onChange={(e) => setSessionForm({ ...sessionForm, classroom_id: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="">-- {t('classrooms_timetable.session_classroom')} --</option>
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_teacher')}</label>
                  <select
                    value={sessionForm.teacher_id}
                    onChange={(e) => setSessionForm({ ...sessionForm, teacher_id: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="">-- {t('classrooms_timetable.session_teacher')} --</option>
                    {teachers.map(teach => (
                      <option key={teach.id} value={teach.id}>
                        {teach.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_day')} *</label>
                  <select
                    required
                    value={sessionForm.day_of_week}
                    onChange={(e) => setSessionForm({ ...sessionForm, day_of_week: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.key} value={d.key}>{t(`classrooms_timetable.${d.translationKey}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_start_time')} *</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.start_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                    className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-mono font-bold text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_end_time')} *</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.end_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                    className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-mono font-bold text-text-main focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">{t('classrooms_timetable.session_notes')}</label>
                <input
                  type="text"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  disabled={savingSession}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingSession}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingSession ? t('common.loading') : t('classrooms_timetable.save_session_btn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-card border border-border rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-main">{t('confirm_dialog.title_default')}</h3>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {itemToDelete.title}
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all"
              >
                {deleting ? t('student_profile.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
