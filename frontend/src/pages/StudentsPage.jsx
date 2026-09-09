import React, { useState, useEffect, useCallback } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { 
  Users, 
  UserPlus, 
  Search, 
  Calendar, 
  Phone, 
  ArrowLeftRight, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Award, 
  FileText,
  Camera,
  Upload,
  Image,
  X,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateTimeFormatter } from '../utils/dateTimeFormatter';

export default function StudentsPage() {
  const { selectedYearId, selectedYearObj } = useAcademicYear();
  const { showNotification } = useNotification();
  const { t, dir, isRtl } = useLanguage();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [trackFilter, setTrackFilter] = useState('');

  // New Student Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    gender: 'MALE',
    academic_level: '',
    guardian_name: '',
    guardian_phone: '',
    photo_url: '',
    notes: '',
    group_id: '',
    discount_type: 'NONE',
    discount_value: 0
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [availableGroups, setAvailableGroups] = useState([]);

  // Edit Student Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    dob: '',
    gender: 'MALE',
    academic_level: '',
    guardian_name: '',
    guardian_phone: '',
    photo_url: '',
    notes: ''
  });
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Student Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/students?academic_year_id=${selectedYearId || ''}`;
      if (trackFilter) url += `&track_type=${trackFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      
      const res = await api.get(url);
      if (res.success) {
        setStudents(res.data);
      }
    } catch (err) {
      showNotification(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, trackFilter, searchTerm, showNotification, t]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (selectedYearId) {
      api.get(`/groups?academic_year_id=${selectedYearId}`).then(res => {
        if (res.success) {
          setAvailableGroups(res.data);
        }
      });
    }
  }, [selectedYearId]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification(t('students.upload_size_limit'), 'warning');
      return;
    }

    try {
      setUploadingPhoto(true);
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'student_photo');

      const res = await api.post('/settings/upload-assets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success && res.url) {
        setPhotoPreview(res.url);
        setFormData(prev => ({ ...prev, photo_url: res.url }));
        showNotification(t('students.photo_upload_success'), 'success');
      }
    } catch (err) {
      showNotification(err.message || t('students.photo_upload_failed'), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.guardian_phone) {
      showNotification(t('students.required_fields_error'), 'warning');
      return;
    }

    try {
      const payload = {
        ...formData,
        academic_year_id: selectedYearId,
        group_id: formData.group_id ? parseInt(formData.group_id, 10) : null,
        discount_value: parseFloat(formData.discount_value) || 0
      };

      const res = await api.post('/students', payload);
      if (res.success) {
        showNotification(res.message || t('students.student_created_success'), 'success');
        setModalOpen(false);
        setPhotoPreview(null);
        setFormData({
          full_name: '',
          dob: '',
          gender: 'MALE',
          academic_level: '',
          guardian_name: '',
          guardian_phone: '',
          photo_url: '',
          notes: '',
          group_id: '',
          discount_type: 'NONE',
          discount_value: 0
        });
        fetchStudents();
      }
    } catch (err) {
      showNotification(err.message || t('students.student_created_failed'), 'error');
    }
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setEditFormData({
      full_name: student.full_name || '',
      dob: student.dob ? student.dob.split('T')[0] : '',
      gender: student.gender || 'MALE',
      academic_level: student.academic_level || '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      photo_url: student.photo_url || '',
      notes: student.notes || ''
    });
    setEditPhotoPreview(student.photo_url || null);
    setEditModalOpen(true);
  };

  const handleEditPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification(t('students.upload_size_limit'), 'warning');
      return;
    }

    try {
      setUploadingEditPhoto(true);
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'student_photo');

      const res = await api.post('/settings/upload-assets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success && res.url) {
        setEditPhotoPreview(res.url);
        setEditFormData(prev => ({ ...prev, photo_url: res.url }));
        showNotification(t('students.photo_upload_success'), 'success');
      }
    } catch (err) {
      showNotification(err.message || t('students.photo_upload_failed'), 'error');
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.guardian_phone) {
      showNotification(t('students.required_fields_error'), 'warning');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await api.put(`/students/${editingStudent.id}`, editFormData);
      if (res.success) {
        showNotification(res.message || t('students.student_updated_success'), 'success');
        setEditModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      showNotification(err.message || t('students.student_updated_failed'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDelete = (student) => {
    const activeEnrollments = student.enrollments?.filter(en => en.status === 'ACTIVE') || [];
    if (activeEnrollments.length > 0) {
      const groupNames = activeEnrollments.map(e => `"${e.group_name}"`).join('، ');
      showNotification(t('students.delete_blocked_active', { groups: groupNames }), 'warning');
      return;
    }
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setDeletingStudent(true);
      const res = await api.delete(`/students/${studentToDelete.id}`);
      if (res.success) {
        showNotification(res.message || t('students.student_deleted_success'), 'success');
        setDeleteModalOpen(false);
        setStudentToDelete(null);
        fetchStudents();
      }
    } catch (err) {
      showNotification(err.message || t('students.student_deleted_failed'), 'error');
    } finally {
      setDeletingStudent(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-text-main">
            {t('students.page_title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('students.page_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-5 h-5" />
          <span>{t('students.new_student_btn')}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-surface-card border border-border rounded-2xl">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 text-text-muted absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              placeholder={t('students.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary`}
            />
          </div>

          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="p-2.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-main"
          >
            <option value="">{t('students.track_filter_all')}</option>
            <option value="HALAQA">{t('students.track_quran')}</option>
            <option value="PRESCHOOL">{t('students.track_preschool')}</option>
            <option value="TUTORING">{t('students.track_tutoring')}</option>
          </select>
        </div>

        <span className="text-xs font-bold text-text-muted px-2">
          {t('students.total_results', { count: students.length })}
        </span>
      </div>

      {/* Students Table */}
      <div className="bg-surface-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-surface text-text-muted text-xs font-bold border-b border-border">
              <tr>
                <th className="p-4 text-start">{t('students.table_reg_no')}</th>
                <th className="p-4 text-start">{t('students.table_name')}</th>
                <th className="p-4 text-start">{t('students.table_level')}</th>
                <th className="p-4 text-start">{t('students.table_groups')}</th>
                <th className="p-4 text-start">{t('students.table_guardian')}</th>
                <th className="p-4 text-start">{t('students.table_phone')}</th>
                <th className="p-4 text-center">{t('students.table_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-text-muted">{t('students.loading_records')}</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-text-muted">{t('students.no_students_found')}</td>
                </tr>
              ) : (
                students.map((student) => {
                  return (
                    <tr key={student.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-primary text-start">
                        {student.reg_no}
                      </td>
                      <td className="p-4 text-start">
                        <div className="flex items-center gap-3">
                          {student.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={student.full_name}
                              className="w-10 h-10 rounded-2xl object-cover border border-border shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 border border-primary/20">
                              {student.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <Link to={`/students/${student.id}`} className="font-bold text-text-main hover:text-primary transition-colors block leading-tight">
                              {student.full_name}
                            </Link>
                            {student.notes && (
                              <span className="text-[11px] text-text-muted block truncate max-w-xs mt-0.5">
                                {student.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-text-muted text-start">
                        {student.academic_level || t('students.not_specified')}
                      </td>
                      <td className="p-4 text-start">
                        <div className="flex flex-wrap gap-1">
                          {student.enrollments?.length === 0 ? (
                            <span className="text-xs text-text-muted italic">{t('students.not_enrolled')}</span>
                          ) : (
                            student.enrollments?.map((en, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  en.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                <span>{en.group_name}</span>
                                {en.status === 'TRANSFERRED' && <span className="text-[10px]">{t('students.transferred')}</span>}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-text-main text-start">
                        {student.guardian_name || '-'}
                      </td>
                      <td className="p-4 font-mono text-xs text-text-muted text-start">
                        {student.guardian_phone}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            to={`/students/${student.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-xs font-bold border border-border transition-all text-text-muted hover:border-primary"
                            title={t('students.dossier_btn')}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('students.dossier_btn')}</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold border border-border hover:border-blue-600 transition-all"
                            title={t('students.edit_btn')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('students.edit_btn')}</span>
                          </button>

                          {(() => {
                            const activeEnrollments = (student.enrollments || []).filter(en => en.status === 'ACTIVE');
                            const hasActive = activeEnrollments.length > 0;
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(student)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  hasActive
                                    ? 'bg-surface/50 text-text-muted/60 border-border cursor-not-allowed hover:border-amber-500/50 hover:text-amber-500'
                                    : 'bg-surface hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border-border hover:border-rose-600'
                                }`}
                                title={hasActive ? t('students.delete_not_allowed_enrolled') : t('students.delete_btn')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('students.delete_btn')}</span>
                              </button>
                            );
                          })()}
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

      {/* New Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto" dir={dir}>
            
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-text-main">
                    {t('students.modal_new_title')}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {t('students.page_subtitle')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              
              {/* Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-surface rounded-2xl border border-border">
                <div className="relative w-20 h-20 rounded-2xl bg-surface-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden flex-shrink-0 group shadow-inner">
                  {photoPreview ? (
                    <>
                      <img 
                        src={photoPreview} 
                        alt={t('students.photo')} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setFormData(prev => ({ ...prev, photo_url: '' }));
                        }}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('students.delete_photo')}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-text-muted">
                      <Camera className="w-7 h-7 text-text-muted/60" />
                      <span className="text-[10px] mt-1 font-bold">{t('students.photo')}</span>
                    </div>
                  )}
                </div>

                <div className={`space-y-1 ${isRtl ? 'text-center sm:text-right' : 'text-center sm:text-left'} flex-1`}>
                  <span className="block text-xs font-bold text-text-main">
                    {t('students.photo_optional')}
                  </span>
                  <p className="text-[11px] text-text-muted">
                    {t('students.photo_hint')}
                  </p>
                  <div className={`flex items-center gap-2 justify-center ${isRtl ? 'sm:justify-start' : 'sm:justify-start'} pt-1`}>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPhoto ? t('students.uploading') : photoPreview ? t('students.change_photo') : t('students.select_photo')}</span>
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
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('students.full_name')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('students.full_name_placeholder')}
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-bold text-text-main"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('students.dob')}
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('students.gender')}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-xs font-bold text-text-main"
                  >
                    <option value="MALE">{t('students.male_boy')}</option>
                    <option value="FEMALE">{t('students.female_girl')}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1">{t('students.academic_level')}</label>
                  <input
                    type="text"
                    placeholder={t('students.level_placeholder')}
                    value={formData.academic_level}
                    onChange={(e) => setFormData({ ...formData, academic_level: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-xs text-text-main"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('students.guardian_name')}</label>
                  <input
                    type="text"
                    placeholder={t('students.guardian_placeholder')}
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('students.guardian_phone')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder={t('students.phone_placeholder')}
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-mono text-text-main"
                    required
                  />
                </div>
              </div>

              {/* Initial Enrollment in Current Year */}
              <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                <span className="text-xs font-bold text-primary block">
                  {t('students.initial_enrollment', { year: selectedYearObj?.label || '' })}
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">{t('students.initial_group')}</label>
                    <select
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main"
                    >
                      <option value="">{t('students.free_enrollment_no_group')}</option>
                      {availableGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.is_free ? t('students.free') : `${g.monthly_fee} ${t('common.currency')}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">{t('students.subscription_status')}</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-main"
                    >
                      <option value="NONE">{t('students.discount_none')}</option>
                      <option value="FULL_EXEMPTION">{t('students.discount_exempt')}</option>
                      <option value="PERCENTAGE">{t('students.discount_percent')}</option>
                      <option value="FIXED_AMOUNT">{t('students.discount_fixed')}</option>
                    </select>
                  </div>
                </div>

                {formData.discount_type !== 'NONE' && formData.discount_type !== 'FULL_EXEMPTION' && (
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">{t('students.discount_value')}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      className="w-full p-2 bg-surface-card border border-border rounded-xl text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('students.notes')}</label>
                <textarea
                  rows="2"
                  placeholder={t('students.notes_placeholder')}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs"
                />
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
                  {t('students.save_and_register')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir={dir}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('students.modal_edit_title')}</h3>
                  <p className="text-xs text-text-muted">{t('students.edit_modal_subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Photo Upload */}
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-card border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-text-muted" />
                  )}
                  {uploadingEditPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-bold text-text-main block mb-1">{t('students.photo')}</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-border text-xs font-bold text-text-main hover:bg-surface cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5 text-text-muted" />
                    <span>{uploadingEditPhoto ? t('students.uploading') : t('students.change_photo')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoSelect}
                      disabled={uploadingEditPhoto}
                      className="hidden"
                    />
                  </label>
                  {editPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditPhotoPreview(null);
                        setEditFormData(prev => ({ ...prev, photo_url: '' }));
                      }}
                      className={`text-xs text-rose-500 ${isRtl ? 'mr-2' : 'ml-2'} hover:underline`}
                    >
                      {t('students.remove_photo')}
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1">
                    {t('students.full_name_quad')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('students.dob')}</label>
                  <input
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">{t('students.gender')}</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:border-primary outline-none"
                  >
                    <option value="MALE">{t('students.male_boy')}</option>
                    <option value="FEMALE">{t('students.female_girl')}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1">{t('students.academic_level_regular')}</label>
                  <input
                    type="text"
                    placeholder={t('students.level_placeholder')}
                    value={editFormData.academic_level}
                    onChange={(e) => setEditFormData({ ...editFormData, academic_level: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Guardian Info */}
              <div className="p-3 bg-surface/50 rounded-xl border border-border space-y-3">
                <span className="text-xs font-black text-text-muted block">{t('students.guardian_info')}</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">{t('students.guardian_name_label')}</label>
                    <input
                      type="text"
                      value={editFormData.guardian_name}
                      onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                      className="w-full p-2 bg-surface-card border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1">
                      {t('students.guardian_phone')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={editFormData.guardian_phone}
                      onChange={(e) => setEditFormData({ ...editFormData, guardian_phone: e.target.value })}
                      className="w-full p-2 bg-surface-card border border-border rounded-xl text-xs font-mono text-text-main focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">{t('students.notes_short')}</label>
                <textarea
                  rows="2"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs text-text-main focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('students.saving')}</span>
                    </>
                  ) : (
                    <span>{t('students.save_changes')}</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" dir={dir}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">{t('students.modal_delete_title')}</h3>
                  <p className="text-xs text-rose-500">{t('students.sensitive_action')}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {(() => {
                const activeEnrollments = (studentToDelete.enrollments || []).filter(en => en.status === 'ACTIVE');
                if (activeEnrollments.length > 0) {
                  return (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{t('students.cannot_delete_title')}</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {t('students.cannot_delete_desc')}
                      </p>
                      <ul className="list-disc list-inside text-xs font-bold space-y-1">
                        {activeEnrollments.map((en, i) => (
                          <li key={i}>{en.group_name}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-text-muted pt-1">
                        {t('students.cannot_delete_hint')}
                      </p>
                    </div>
                  );
                }

                return (
                  <div>
                    <p className="text-xs leading-relaxed text-text-main">
                      {t('students.delete_confirm_msg', { name: studentToDelete.full_name })}
                    </p>
                    <p className="text-[11px] text-text-muted mt-2">
                      {t('students.delete_warning')}
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main bg-surface rounded-xl border border-border"
                >
                  {t('common.cancel')}
                </button>
                {(() => {
                  const hasActive = (studentToDelete.enrollments || []).some(en => en.status === 'ACTIVE');
                  if (hasActive) {
                    return (
                      <button
                        type="button"
                        disabled
                        className="px-5 py-2 text-xs font-bold text-text-muted bg-surface/50 rounded-xl border border-border cursor-not-allowed opacity-50"
                      >
                        {t('students.delete_not_allowed_enrolled')}
                      </button>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={deletingStudent}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50"
                    >
                      {deletingStudent ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('students.deleting')}</span>
                        </>
                      ) : (
                        <span>{t('students.confirm_final_delete')}</span>
                      )}
                    </button>
                  );
                })()}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
