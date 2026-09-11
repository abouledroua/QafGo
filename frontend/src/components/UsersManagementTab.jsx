import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  LayoutDashboard,
  ArrowLeftRight,
  Layers,
  CalendarDays,
  GraduationCap,
  Wallet,
  Sparkles,
  Settings,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export const ALL_MODULE_PERMISSIONS = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'perm_dashboard' },
  { id: 'students', icon: Users, labelKey: 'perm_students' },
  { id: 'transfers', icon: ArrowLeftRight, labelKey: 'perm_transfers' },
  { id: 'tracks', icon: Layers, labelKey: 'perm_tracks' },
  { id: 'timetable', icon: CalendarDays, labelKey: 'perm_timetable' },
  { id: 'teachers', icon: GraduationCap, labelKey: 'perm_teachers' },
  { id: 'finance', icon: Wallet, labelKey: 'perm_finance' },
  { id: 'rollover', icon: Sparkles, labelKey: 'perm_rollover' },
  { id: 'settings', icon: Settings, labelKey: 'perm_settings' },
  { id: 'users', icon: ShieldAlert, labelKey: 'perm_users' },
];

export const ALL_PERMISSION_KEYS = ALL_MODULE_PERMISSIONS.map(p => p.id);

export default function UsersManagementTab() {
  const { t, isRtl } = useLanguage();
  const { showNotification } = useNotification();
  const { user: authUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create mode
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'SUPERVISOR',
    is_active: true,
    permissions: ['students', 'tracks', 'timetable', 'teachers']
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Password reset modal
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdTargetUser, setPwdTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Autofocus refs for modals
  const firstNameInputRef = useRef(null);
  const resetPwdInputRef = useRef(null);

  useEffect(() => {
    if (userModalOpen) {
      const timer = setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [userModalOpen]);

  useEffect(() => {
    if (pwdModalOpen) {
      const timer = setTimeout(() => {
        resetPwdInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [pwdModalOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showNotification(err.message || t('users_management.fetch_error', 'فشل تحميل قائمة المستخدمين'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.is_active) ||
        (statusFilter === 'INACTIVE' && !u.is_active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const staff = total - admins;
    return { total, active, admins, staff };
  }, [users]);

  // Handlers for User Modal
  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      full_name: '',
      password: '',
      role: 'SUPERVISOR',
      is_active: true,
      permissions: ['dashboard', 'students', 'transfers', 'tracks', 'timetable', 'teachers']
    });
    setShowPassword(false);
    setUserModalOpen(true);
  };

  const openEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setUserForm({
      username: targetUser.username,
      full_name: targetUser.full_name,
      password: '',
      role: targetUser.role || 'SUPERVISOR',
      is_active: Boolean(targetUser.is_active),
      permissions: Array.isArray(targetUser.permissions) ? targetUser.permissions : []
    });
    setShowPassword(false);
    setUserModalOpen(true);
  };

  const handleRoleChange = (newRole) => {
    let perms = [...userForm.permissions];
    if (newRole === 'ADMIN') {
      perms = ALL_PERMISSION_KEYS;
    } else if (newRole === 'SUPERVISOR') {
      perms = ['dashboard', 'students', 'transfers', 'tracks', 'timetable', 'teachers'];
    } else if (newRole === 'TEACHER') {
      perms = ['tracks', 'timetable', 'teachers'];
    }
    setUserForm(prev => ({
      ...prev,
      role: newRole,
      permissions: perms
    }));
  };

  const togglePermission = (permId) => {
    if (userForm.role === 'ADMIN') return;
    setUserForm(prev => {
      const exists = prev.permissions.includes(permId);
      const newPerms = exists 
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: newPerms };
    });
  };

  const selectAllPermissions = () => {
    if (userForm.role === 'ADMIN') return;
    setUserForm(prev => ({ ...prev, permissions: ALL_PERMISSION_KEYS }));
  };

  const deselectAllPermissions = () => {
    if (userForm.role === 'ADMIN') return;
    setUserForm(prev => ({ ...prev, permissions: [] }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.full_name || !userForm.username) {
      showNotification(t('users_management.required_fields_error', 'يرجى ملء كافة الحقول الأساسية'), 'error');
      return;
    }

    if (!editingUser && (!userForm.password || userForm.password.length < 4)) {
      showNotification(t('users_management.password_length_error', 'يرجى إدخال كلمة مرور من 4 خانات على الأقل'), 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingUser) {
        // Update user
        const payload = {
          full_name: userForm.full_name,
          role: userForm.role,
          is_active: userForm.is_active,
          permissions: userForm.role === 'ADMIN' ? ALL_PERMISSION_KEYS : userForm.permissions
        };
        const res = await api.put(`/users/${editingUser.id}`, payload);
        if (res.success) {
          // If password was also provided during edit
          if (userForm.password && userForm.password.trim().length >= 4) {
            await api.put(`/users/${editingUser.id}/password`, { new_password: userForm.password.trim() });
          }
          showNotification(res.message || t('users_management.update_success', 'تم تحديث حساب المستخدم بنجاح'), 'success');
          setUserModalOpen(false);
          fetchUsers();
        }
      } else {
        // Create user
        const payload = {
          username: userForm.username.trim(),
          password: userForm.password.trim(),
          full_name: userForm.full_name.trim(),
          role: userForm.role,
          is_active: userForm.is_active,
          permissions: userForm.role === 'ADMIN' ? ALL_PERMISSION_KEYS : userForm.permissions
        };
        const res = await api.post('/users', payload);
        if (res.success) {
          showNotification(res.message || t('users_management.create_success', 'تم إنشاء حساب المستخدم بنجاح'), 'success');
          setUserModalOpen(false);
          fetchUsers();
        }
      }
    } catch (err) {
      showNotification(err.message || t('users_management.save_error', 'حدث خطأ أثناء حفظ المستخدم'), 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle User Active Status directly from table
  const handleToggleStatus = async (user) => {
    if (user.username === 'admin') {
      showNotification(t('users_management.cannot_delete_admin'), 'error');
      return;
    }
    try {
      const updatedStatus = !user.is_active;
      const res = await api.put(`/users/${user.id}`, { is_active: updatedStatus });
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: updatedStatus } : u));
        showNotification(
          updatedStatus ? t('users_management.activated_success', 'تم تفعيل حساب المستخدم بنجاح') : t('users_management.deactivated_success', 'تم تعطيل حساب المستخدم مؤقتاً'),
          'success'
        );
      }
    } catch (err) {
      showNotification(err.message || t('users_management.status_error', 'فشل تغيير حالة المستخدم'), 'error');
    }
  };

  // Reset Password Handler
  const openResetPasswordModal = (targetUser) => {
    setPwdTargetUser(targetUser);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPwd(false);
    setPwdModalOpen(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showNotification(t('users_management.password_length_error', 'كلمة المرور يجب أن لا تقل عن 4 خانات'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification(t('users_management.pwd_mismatch_error'), 'error');
      return;
    }

    try {
      setPwdSubmitting(true);
      const res = await api.put(`/users/${pwdTargetUser.id}/password`, { new_password: newPassword });
      if (res.success) {
        showNotification(res.message || t('users_management.pwd_update_success', 'تم تحديث كلمة المرور بنجاح'), 'success');
        setPwdModalOpen(false);
      }
    } catch (err) {
      showNotification(err.message || t('users_management.pwd_reset_error', 'فشل إعادة تعيين كلمة المرور'), 'error');
    } finally {
      setPwdSubmitting(false);
    }
  };

  // Delete User Handler
  const openDeleteModal = (targetUser) => {
    if (targetUser.username === 'admin') {
      showNotification(t('users_management.cannot_delete_admin'), 'error');
      return;
    }
    if (Number(authUser?.id) === Number(targetUser.id)) {
      showNotification(t('users_management.cannot_delete_self'), 'error');
      return;
    }
    setDeleteTargetUser(targetUser);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    try {
      setDeleteSubmitting(true);
      const res = await api.delete(`/users/${deleteTargetUser.id}`);
      if (res.success) {
        showNotification(res.message || t('users_management.delete_success', 'تم حذف المستخدم بنجاح'), 'success');
        setDeleteModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      showNotification(err.message || t('users_management.delete_error', 'فشل حذف المستخدم'), 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('users_management.role_admin')}</span>
          </span>
        );
      case 'SUPERVISOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t('users_management.role_supervisor')}</span>
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{t('users_management.role_teacher')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t('users_management.role_custom')}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header & Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => { setRoleFilter('ALL'); setStatusFilter('ALL'); }}
          className={`text-start bg-surface-card border p-5 rounded-3xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${
            roleFilter === 'ALL' && statusFilter === 'ALL' ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border hover:border-primary/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('users_management.total_users')}</span>
            <span className="text-2xl font-black text-text-main">{stats.total}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE'); }}
          className={`text-start bg-surface-card border p-5 rounded-3xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${
            statusFilter === 'ACTIVE' ? 'border-emerald-500/50 ring-2 ring-emerald-500/10' : 'border-border hover:border-emerald-500/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('users_management.active_users')}</span>
            <span className="text-2xl font-black text-emerald-600">{stats.active}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setRoleFilter(roleFilter === 'ADMIN' ? 'ALL' : 'ADMIN'); }}
          className={`text-start bg-surface-card border p-5 rounded-3xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${
            roleFilter === 'ADMIN' ? 'border-indigo-500/50 ring-2 ring-indigo-500/10' : 'border-border hover:border-indigo-500/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('users_management.admins_count')}</span>
            <span className="text-2xl font-black text-text-main">{stats.admins}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setRoleFilter(roleFilter === 'TEACHER' ? 'ALL' : 'TEACHER'); }}
          className={`text-start bg-surface-card border p-5 rounded-3xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${
            roleFilter === 'TEACHER' ? 'border-blue-500/50 ring-2 ring-blue-500/10' : 'border-border hover:border-blue-500/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted block">{t('users_management.staff_count')}</span>
            <span className="text-2xl font-black text-text-main">{stats.staff}</span>
          </div>
        </button>
      </div>

      {/* Main Section Card */}
      <div className="bg-surface-card border border-border rounded-3xl shadow-sm overflow-hidden p-6 lg:p-8 space-y-6">
        
        {/* Toolbar: Search, Filters & Action Button */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className={`w-4 h-4 text-text-muted absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('users_management.search_placeholder')}
                className={`w-full bg-surface border border-border rounded-2xl text-xs font-bold text-text-main py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-primary transition-all`}
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface border border-border rounded-2xl px-3 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="ALL">{t('users_management.all_roles')}</option>
              <option value="ADMIN">{t('users_management.role_admin')}</option>
              <option value="SUPERVISOR">{t('users_management.role_supervisor')}</option>
              <option value="TEACHER">{t('users_management.role_teacher')}</option>
              <option value="CUSTOM">{t('users_management.role_custom')}</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-2xl px-3 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="ALL">{t('users_management.all_statuses')}</option>
              <option value="ACTIVE">{t('users_management.status_active')}</option>
              <option value="INACTIVE">{t('users_management.status_inactive')}</option>
            </select>
          </div>

          {/* Add User Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('users_management.add_user_btn')}</span>
          </button>
        </div>

        {/* Mobile List View (< md) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center bg-surface rounded-2xl border border-border text-text-muted font-bold">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>{t('common.loading')}</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center bg-surface rounded-2xl border border-border text-text-muted font-bold">
              <Users className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
              <span>{t('users_management.no_users_found')}</span>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isPrimaryAdmin = u.username === 'admin';
              const isSelf = Number(authUser?.id) === Number(u.id);
              const isFullAccess = u.role === 'ADMIN' || u.permissions.length === ALL_PERMISSION_KEYS.length;

              return (
                <div key={u.id} className="p-4 bg-surface rounded-2xl border border-border space-y-3 shadow-xs">
                  {/* Top row: Avatar + Name + Username */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-xs shrink-0 ${
                      u.role === 'ADMIN' 
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-background text-text-muted border-border'
                    }`}>
                      {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-text-main text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{u.full_name}</span>
                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary shrink-0">
                            ({t('users_management.you_badge', 'أنت')})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-text-muted font-mono" dir="ltr">
                        @{u.username}
                      </span>
                    </div>
                  </div>

                  {/* Middle row: Role & Access Chip & Active Chip & Created Date */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
                    {getRoleBadge(u.role)}

                    {/* Access Chip */}
                    {isFullAccess ? (
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{t('users_management.full_access')}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-text-muted bg-background px-2 py-0.5 rounded-lg border border-border">
                        {t('users_management.permissions_count', { count: u.permissions.length, total: ALL_PERMISSION_KEYS.length })}
                      </span>
                    )}

                    {/* Active / Inactive Status Chip */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={isPrimaryAdmin}
                      title={t('users_management.action_toggle_status')}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                        isPrimaryAdmin 
                          ? 'opacity-80 cursor-not-allowed bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : u.is_active 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 active:scale-95'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20 active:scale-95'
                      }`}
                    >
                      {u.is_active ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{u.is_active ? t('users_management.status_active') : t('users_management.status_inactive')}</span>
                    </button>

                    {u.created_at && (
                      <span className="text-[11px] text-text-muted font-mono ms-auto">
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: Actions toolbar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-text-main bg-background hover:bg-primary/10 hover:text-primary border border-border transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('users_management.action_edit')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openResetPasswordModal(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('users_management.action_reset_password')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(u)}
                      disabled={isPrimaryAdmin || isSelf}
                      className={`p-2 rounded-xl border transition-all ${
                        isPrimaryAdmin || isSelf
                          ? 'text-text-muted/30 border-transparent cursor-not-allowed'
                          : 'text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
                      }`}
                      title={t('users_management.action_delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Users Table (Desktop & Tablet: md and up) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-surface/60 border-b border-border text-text-muted text-xs font-bold">
                <th className="py-3.5 px-4 text-start">{t('users_management.col_user')}</th>
                <th className="py-3.5 px-4 text-start">{t('users_management.col_role')}</th>
                <th className="py-3.5 px-4 text-start">{t('users_management.col_permissions')}</th>
                <th className="py-3.5 px-4 text-center">{t('users_management.col_status')}</th>
                <th className="py-3.5 px-4 text-start">{t('users_management.col_created_at')}</th>
                <th className="py-3.5 px-4 text-center">{t('users_management.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-text-muted font-bold">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <span>{t('common.loading')}</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-text-muted font-bold">
                    <Users className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
                    <span>{t('users_management.no_users_found')}</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPrimaryAdmin = u.username === 'admin';
                  const isSelf = Number(authUser?.id) === Number(u.id);
                  const isFullAccess = u.role === 'ADMIN' || u.permissions.length === ALL_PERMISSION_KEYS.length;

                  return (
                    <tr key={u.id} className="hover:bg-surface/40 transition-colors">
                      {/* User Avatar & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm shrink-0 ${
                            u.role === 'ADMIN' 
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-surface text-text-muted border-border'
                          }`}>
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-text-main text-sm flex items-center gap-1.5">
                              {u.full_name}
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                                  ({t('users_management.you_badge', 'أنت')})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-text-muted font-mono" dir="ltr">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4">
                        {isFullAccess ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>{t('users_management.full_access')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            <span className="text-xs font-bold text-text-muted bg-surface px-2.5 py-1 rounded-xl border border-border">
                              {t('users_management.permissions_count', { count: u.permissions.length, total: ALL_PERMISSION_KEYS.length })}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={isPrimaryAdmin}
                          title={t('users_management.action_toggle_status')}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            isPrimaryAdmin 
                              ? 'opacity-80 cursor-not-allowed bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : u.is_active 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {u.is_active ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{u.is_active ? t('users_management.status_active') : t('users_management.status_inactive')}</span>
                        </button>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-xs text-text-muted font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit User & Permissions */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-xl text-text-muted hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                            title={t('users_management.action_edit')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => openResetPasswordModal(u)}
                            className="p-2 rounded-xl text-text-muted hover:text-amber-600 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
                            title={t('users_management.action_reset_password')}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => openDeleteModal(u)}
                            disabled={isPrimaryAdmin || isSelf}
                            className={`p-2 rounded-xl border border-transparent transition-all ${
                              isPrimaryAdmin || isSelf
                                ? 'text-text-muted/30 cursor-not-allowed'
                                : 'text-text-muted hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/20'
                            }`}
                            title={t('users_management.action_delete')}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL 1: Create or Edit User */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main">
                    {editingUser ? t('users_management.modal_edit_title') : t('users_management.modal_create_title')}
                  </h3>
                  <p className="text-xs font-bold text-text-muted">
                    {editingUser ? `@${editingUser.username}` : t('users_management.subtitle')}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-2 rounded-2xl hover:bg-surface text-text-muted hover:text-text-main transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} autoComplete="off" className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Browser autofill decoys */}
              <input type="text" name="fake_username_remembered" className="hidden" tabIndex="-1" aria-hidden="true" autoComplete="username" />
              <input type="password" name="fake_password_remembered" className="hidden" tabIndex="-1" aria-hidden="true" autoComplete="current-password" />
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('users_management.full_name_label')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    ref={firstNameInputRef}
                    autoFocus
                    required
                    name="new_user_fullname"
                    autoComplete="off"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder={t('users_management.full_name_placeholder')}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('users_management.username_label')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    name="new_user_login"
                    autoComplete="new-password"
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder={t('users_management.username_placeholder')}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary disabled:opacity-50 transition-all"
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('users_management.password_label')} {!editingUser && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      name="new_user_pwd"
                      autoComplete="new-password"
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={editingUser ? t('users_management.password_edit_hint') : t('users_management.password_placeholder')}
                      className={`w-full bg-surface border border-border rounded-2xl py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-all ${
                        isRtl ? 'pr-4 pl-10' : 'pl-4 pr-10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1.5 ${
                        isRtl ? 'left-2.5' : 'right-2.5'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {editingUser && (
                    <span className="text-[11px] font-bold text-text-muted mt-1 block">
                      {t('users_management.password_edit_hint')}
                    </span>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('users_management.role_label')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={editingUser?.username === 'admin'}
                    value={userForm.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full bg-surface border border-border rounded-2xl px-3 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <option value="ADMIN">{t('users_management.role_admin')}</option>
                    <option value="SUPERVISOR">{t('users_management.role_supervisor')}</option>
                    <option value="TEACHER">{t('users_management.role_teacher')}</option>
                    <option value="CUSTOM">{t('users_management.role_custom')}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('users_management.status_label')}
                  </label>
                  <div className="flex items-center gap-3 h-[42px]">
                    <button
                      type="button"
                      disabled={editingUser?.username === 'admin'}
                      onClick={() => setUserForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${
                        userForm.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                      }`}
                    >
                      {userForm.is_active ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <span>{userForm.is_active ? t('users_management.status_active') : t('users_management.status_inactive')}</span>
                    </button>
                    <span className="text-[11px] text-text-muted font-bold">
                      {t('users_management.active_toggle_hint')}
                    </span>
                  </div>
                </div>

              </div>

              {/* Permissions Matrix */}
              <div className="border-t border-border pt-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-text-main flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>{t('users_management.permissions_matrix_title')}</span>
                    </h4>
                    <p className="text-[11px] font-bold text-text-muted">
                      {userForm.role === 'ADMIN' 
                        ? t('users_management.admin_full_access_desc', 'حساب المدير العام يملك وصولاً كاملاً وغير مقيد لكافة وحدات المنصة.')
                        : t('users_management.permissions_matrix_desc')}
                    </p>
                  </div>

                  {userForm.role !== 'ADMIN' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {t('users_management.select_all')}
                      </button>
                      <span className="text-text-muted text-xs">•</span>
                      <button
                        type="button"
                        onClick={deselectAllPermissions}
                        className="text-xs font-bold text-text-muted hover:text-rose-500 transition-colors"
                      >
                        {t('users_management.deselect_all')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {ALL_MODULE_PERMISSIONS.map((perm) => {
                    const isChecked = userForm.role === 'ADMIN' || userForm.permissions.includes(perm.id);
                    const IconComp = perm.icon;

                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all select-none ${
                          userForm.role === 'ADMIN'
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 cursor-default'
                            : isChecked
                              ? 'bg-primary/10 border-primary/30 text-text-main cursor-pointer shadow-sm'
                              : 'bg-surface border-border text-text-muted hover:border-primary/40 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isChecked ? 'bg-primary/15 text-primary' : 'bg-surface-card text-text-muted'
                          }`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-text-main">
                            {t(`users_management.${perm.labelKey}`)}
                          </span>
                        </div>

                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={userForm.role === 'ADMIN'}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="border-t border-border pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover text-xs font-bold text-text-main border border-border transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{formSubmitting ? t('common.saving') : t('users_management.save_user_btn')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password */}
      {pwdModalOpen && pwdTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-main">
                    {t('users_management.reset_pwd_title')}
                  </h3>
                  <p className="text-xs font-bold text-text-muted">
                    {pwdTargetUser.full_name} (@{pwdTargetUser.username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPwdModalOpen(false)}
                className="p-2 rounded-2xl hover:bg-surface text-text-muted hover:text-text-main transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} autoComplete="off" className="p-6 space-y-4">
              <input type="text" name="fake_user_reset" className="hidden" tabIndex="-1" aria-hidden="true" autoComplete="username" />
              <input type="password" name="fake_pwd_reset" className="hidden" tabIndex="-1" aria-hidden="true" autoComplete="current-password" />

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  {t('users_management.new_password_label')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    ref={resetPwdInputRef}
                    autoFocus
                    required
                    name="reset_new_password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('users_management.new_password_placeholder')}
                    className={`w-full bg-surface border border-border rounded-2xl py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-all ${
                      isRtl ? 'pr-4 pl-10' : 'pl-4 pr-10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className={`absolute top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1.5 ${
                      isRtl ? 'left-2.5' : 'right-2.5'
                    }`}
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  {t('users_management.confirm_new_password_label')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('users_management.confirm_new_password_placeholder')}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="border-t border-border pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPwdModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover text-xs font-bold text-text-main border border-border transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pwdSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-600/25 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{pwdSubmitting ? t('common.saving') : t('users_management.save_new_pwd_btn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {deleteModalOpen && deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-text-main">
                {t('users_management.delete_title')}
              </h3>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                {t('users_management.delete_msg', {
                  name: deleteTargetUser.full_name,
                  username: deleteTargetUser.username
                })}
              </p>
            </div>

            <div className="border-t border-border pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover text-xs font-bold text-text-main border border-border transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteSubmitting ? t('common.deleting') : t('common.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
