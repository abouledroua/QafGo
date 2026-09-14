import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { 
  Building2, 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  UploadCloud, 
  Image as ImageIcon, 
  Stamp, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Palette, 
  Clock, 
  DollarSign, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Trash2,
  FileText,
  Globe,
  ShieldCheck,
  Users2,
  Database,
  Download,
  HardDrive,
  Folder,
  FolderOpen,
  RefreshCw,
  FolderCheck,
  Loader2,
  CheckCircle
} from 'lucide-react';
import UsersManagementTab from '../components/UsersManagementTab';
import FolderSelectorModal from '../components/FolderSelectorModal';

export default function SettingsPage() {
  const { 
    settings, 
    loading, 
    updateSettings, 
    uploadAsset,
    downloadDatabaseBackup,
    runManualBackupNow,
    verifyFolder,
    getBackupStatus
  } = useSettings();
  const { themes } = useTheme();
  const { t, isRtl } = useLanguage();

  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE' | 'SYSTEM' | 'TRACKS' | 'BACKUP' | 'USERS'
  const [formData, setFormData] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [stampFile, setStampFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  // Backup state
  const [downloadingDb, setDownloadingDb] = useState(false);
  const [runningBackupNow, setRunningBackupNow] = useState(false);
  const [verifyingFolder, setVerifyingFolder] = useState(false);
  const [folderVerification, setFolderVerification] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [folderSelectorOpen, setFolderSelectorOpen] = useState(false);

  const logoInputRef = useRef(null);
  const stampInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        enable_quran_track: Boolean(settings.enable_quran_track),
        enable_preschool_track: Boolean(settings.enable_preschool_track),
        enable_tutoring_track: Boolean(settings.enable_tutoring_track),
        auto_backup_enabled: Boolean(settings.auto_backup_enabled),
        backup_folder_path: settings.backup_folder_path || '',
        backup_interval: settings.backup_interval || '1_day'
      });
      setLogoPreview(null);
      setStampPreview(null);
      setLogoFile(null);
      setStampFile(null);
    }
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'BACKUP') {
      getBackupStatus().then(data => {
        if (data) setBackupStatus(data);
      }).catch(console.error);
    }
  }, [activeTab]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleStampUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStampFile(file);
    setStampPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let updatedFormData = { ...formData };

      if (logoFile) {
        setUploadingLogo(true);
        const url = await uploadAsset(logoFile, 'logo');
        if (url) updatedFormData.logo_url = url;
      }

      if (stampFile) {
        setUploadingStamp(true);
        const url = await uploadAsset(stampFile, 'stamp');
        if (url) updatedFormData.stamp_signature_url = url;
      }

      await updateSettings(updatedFormData);
      setLogoFile(null);
      setStampFile(null);
      setLogoPreview(null);
      setStampPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingLogo(false);
      setUploadingStamp(false);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-text-muted">{t('settings.loading_settings')}</div>;
  }

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-text-main">
            {t('settings.page_title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('settings.page_subtitle')}
          </p>
        </div>

        {activeTab !== 'USERS' && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-xl shadow-primary/25 disabled:opacity-50 transition-all shrink-0"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? t('settings.saving_btn') : t('settings.save_all_btn')}</span>
          </button>
        )}
      </div>

      {/* Sections / Tabs Navigation: Responsive grid with 5 tabs */}
      <div className="p-1.5 bg-surface border border-border rounded-2xl sm:rounded-3xl shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
          {[
            { id: 'PROFILE', labelKey: 'tab_profile', icon: Building2 },
            { id: 'SYSTEM', labelKey: 'tab_system', icon: Sliders },
            { id: 'TRACKS', labelKey: 'tab_tracks', icon: ToggleRight },
            { id: 'BACKUP', labelKey: 'tab_backup', icon: Database },
            { id: 'USERS', labelKey: 'tab_users', icon: ShieldCheck }
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all select-none ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-card bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-primary'}`} />
                <span className="truncate">{t(`settings.${sec.labelKey}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 4: Users & Access Management */}
      {activeTab === 'USERS' && (
        <UsersManagementTab />
      )}

      {/* Form Content for Settings Tabs (PROFILE, SYSTEM, TRACKS) */}
      {activeTab !== 'USERS' && (
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* TAB 1: Institution Profile */}
          {activeTab === 'PROFILE' && (
          <div className="p-4 sm:p-6 lg:p-8 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-sm space-y-6 sm:space-y-8">
            
            {/* General Institution Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>{t('settings.institution_data_title')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.school_name_label')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.school_name || ''}
                    onChange={(e) => handleChange('school_name', e.target.value)}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder={t('settings.school_name_placeholder')}
                    required
                  />
                  <span className="text-[11px] text-text-muted mt-1 block">
                    {t('settings.school_name_hint')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.legal_reg_label')}
                  </label>
                  <input
                    type="text"
                    value={formData.legal_registration_no || ''}
                    onChange={(e) => handleChange('legal_registration_no', e.target.value)}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder={t('settings.legal_reg_placeholder')}
                  />
                  <span className="text-[11px] text-text-muted mt-1 block">
                    {t('settings.legal_reg_hint')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.primary_phone_label')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_primary || ''}
                    onChange={(e) => handleChange('phone_primary', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm font-mono text-text-main focus:outline-none"
                    placeholder={t('settings.primary_phone_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.secondary_phone_label')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_secondary || ''}
                    onChange={(e) => handleChange('phone_secondary', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm font-mono text-text-main focus:outline-none"
                    placeholder={t('settings.secondary_phone_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.email_label')}
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm text-text-main focus:outline-none"
                    placeholder={t('settings.email_placeholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.address_label')}
                  </label>
                  <input
                    type="text"
                    value={formData.address_line || ''}
                    onChange={(e) => handleChange('address_line', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm text-text-main focus:outline-none"
                    placeholder={t('settings.address_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.city_label')}
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm text-text-main focus:outline-none"
                    placeholder={t('settings.city_placeholder')}
                  />
                </div>
              </div>
            </div>

            {/* Official Logo & Stamp Uploaders */}
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <span>{t('settings.assets_title')}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Official School Logo */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-text-main block">{t('settings.school_logo_title')}</span>
                      <span className="text-xs text-text-muted">{t('settings.school_logo_hint')}</span>
                    </div>
                    {(logoPreview || formData.logo_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                          handleChange('logo_url', null);
                        }}
                        className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('settings.remove_asset')}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-surface-card flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                      {logoPreview || formData.logo_url ? (
                        <img src={logoPreview || formData.logo_url} alt={t('settings.school_logo_title')} className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-text-muted/40" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-hover border border-border text-xs font-bold text-text-main shadow-sm transition-colors"
                      >
                        <UploadCloud className="w-4 h-4 text-primary" />
                        <span>{uploadingLogo ? t('settings.uploading') : (logoPreview || formData.logo_url) ? t('settings.upload_logo_btn') : t('settings.upload_logo_btn')}</span>
                      </button>
                      <p className="text-[11px] text-text-muted">
                        {t('settings.logo_formats_hint')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Administrative Stamp & Signature */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-text-main block">{t('settings.school_stamp_title')}</span>
                      <span className="text-xs text-text-muted">{t('settings.school_stamp_hint')}</span>
                    </div>
                    {(stampPreview || formData.stamp_signature_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStampFile(null);
                          setStampPreview(null);
                          handleChange('stamp_signature_url', null);
                        }}
                        className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('settings.remove_asset')}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-surface-card flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                      {stampPreview || formData.stamp_signature_url ? (
                        <img src={stampPreview || formData.stamp_signature_url} alt={t('settings.school_stamp_title')} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Stamp className="w-8 h-8 text-text-muted/40" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={stampInputRef}
                        onChange={handleStampUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => stampInputRef.current?.click()}
                        disabled={uploadingStamp}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-hover border border-border text-xs font-bold text-text-main shadow-sm transition-colors"
                      >
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        <span>{uploadingStamp ? t('settings.uploading') : t('settings.upload_stamp_btn')}</span>
                      </button>
                      <p className="text-[11px] text-text-muted">
                        {t('settings.stamp_formats_hint')}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Receipt Header & Footer Text Customization */}
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>{t('settings.receipt_texts_title')}</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.receipt_header_label')}
                  </label>
                  <input
                    type="text"
                    value={formData.receipt_header_text || ''}
                    onChange={(e) => handleChange('receipt_header_text', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm text-text-main focus:outline-none"
                    placeholder={t('settings.receipt_header_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    {t('settings.receipt_footer_label')}
                  </label>
                  <textarea
                    rows="2"
                    value={formData.receipt_footer_notes || ''}
                    onChange={(e) => handleChange('receipt_footer_notes', e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm text-text-main focus:outline-none"
                    placeholder={t('settings.receipt_footer_placeholder')}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: System & Operational Preferences */}
        {activeTab === 'SYSTEM' && (
          <div className="p-4 sm:p-6 lg:p-8 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-sm space-y-6 sm:space-y-8">
            
            {/* Language Selector */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <span>{t('settings.language_section_title')}</span>
              </h3>
              <p className="text-xs text-text-muted">
                {t('settings.language_section_desc')}
              </p>
              <LanguageSelector variant="settings" />
            </div>

            {/* Operational Rules */}
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                <span>{t('settings.operational_rules_title')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Currency */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2">
                  <label className="block text-xs font-bold text-text-main">
                    {t('settings.currency_label')}
                  </label>
                  <input
                    type="text"
                    value={formData.currency_symbol || (isRtl ? 'د.ج' : 'DZD')}
                    onChange={(e) => handleChange('currency_symbol', e.target.value)}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-bold text-text-main focus:outline-none"
                    placeholder={t('settings.currency_placeholder')}
                  />
                  <span className="text-[11px] text-text-muted block">
                    {t('settings.currency_hint')}
                  </span>
                </div>

                {/* Late attendance threshold */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2">
                  <label className="block text-xs font-bold text-text-main">
                    {t('settings.late_threshold_label')}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={formData.late_attendance_threshold_minutes || 15}
                    onChange={(e) => handleChange('late_attendance_threshold_minutes', e.target.value)}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main focus:outline-none"
                  />
                  <span className="text-[11px] text-text-muted block">
                    {t('settings.late_threshold_hint')}
                  </span>
                </div>

                {/* Max absences warning */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2">
                  <label className="block text-xs font-bold text-text-main">
                    {t('settings.absences_warning_label')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.default_max_absences_warning || 3}
                    onChange={(e) => handleChange('default_max_absences_warning', e.target.value)}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main focus:outline-none"
                  />
                  <span className="text-[11px] text-text-muted block">
                    {t('settings.absences_warning_hint')}
                  </span>
                </div>

              </div>
            </div>

            {/* Group Gender Policy (Mixed vs Separated) */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-text-main">
                  {t('settings.group_gender_policy_title')}
                </h3>
              </div>
              <p className="text-xs text-text-muted">
                {t('settings.group_gender_policy_desc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* MIXED option */}
                <button
                  type="button"
                  onClick={() => handleChange('group_gender_policy', 'MIXED')}
                  className={`p-5 rounded-2xl border text-start transition-all relative flex flex-col justify-between ${
                    (formData.group_gender_policy || 'MIXED') === 'MIXED'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                      : 'border-border bg-surface hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm">
                          ⚧
                        </div>
                        <span className="text-sm font-bold text-text-main">
                          {t('settings.group_gender_policy_mixed')}
                        </span>
                      </div>
                      {(formData.group_gender_policy || 'MIXED') === 'MIXED' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {t('settings.group_gender_policy_mixed_desc')}
                    </p>
                  </div>
                </button>

                {/* SEPARATED option */}
                <button
                  type="button"
                  onClick={() => handleChange('group_gender_policy', 'SEPARATED')}
                  className={`p-5 rounded-2xl border text-start transition-all relative flex flex-col justify-between ${
                    formData.group_gender_policy === 'SEPARATED'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                      : 'border-border bg-surface hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          ⚤
                        </div>
                        <span className="text-sm font-bold text-text-main">
                          {t('settings.group_gender_policy_separated')}
                        </span>
                      </div>
                      {formData.group_gender_policy === 'SEPARATED' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {t('settings.group_gender_policy_separated_desc')}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Default Theme Preference */}
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <span>{t('settings.theme_section_title')}</span>
              </h3>
              <p className="text-xs text-text-muted">
                {t('settings.theme_section_desc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map(tItem => {
                  const isSelected = (formData.default_theme || 'sky-blue') === tItem.id;
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => handleChange('default_theme', tItem.id)}
                      className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                          : 'border-border bg-surface hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-6 h-6 rounded-full border border-black/10 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: tItem.color }}
                        />
                        <div>
                          <span className="text-sm font-bold text-text-main block">{tItem.name}</span>
                          <span className="text-[11px] text-text-muted">
                            {tItem.isDark ? t('settings.theme_dark') : t('settings.theme_light')}
                          </span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: Educational Tracks Visibility Toggles */}
        {activeTab === 'TRACKS' && (
          <div className="p-4 sm:p-6 lg:p-8 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-sm space-y-5 sm:space-y-6">
            
            <div>
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <ToggleRight className="w-5 h-5 text-primary" />
                <span>{t('settings.tracks_section_title')}</span>
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {t('settings.tracks_section_desc')}
              </p>
            </div>

            <div className="space-y-4">
              
              {/* 1. Track: HALAQA */}
              <div className={`p-5 rounded-2xl border transition-all ${
                formData.enable_quran_track 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100' 
                  : 'bg-surface border-border opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold">{t('settings.track_quran_title')}</h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t('settings.track_quran_desc')}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enable_quran_track}
                      onChange={(e) => handleChange('enable_quran_track', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* 2. Track: PRESCHOOL */}
              <div className={`p-5 rounded-2xl border transition-all ${
                formData.enable_preschool_track 
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-100' 
                  : 'bg-surface border-border opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/20 text-purple-600 rounded-xl">
                      <Baby className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold">{t('settings.track_preschool_title')}</h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t('settings.track_preschool_desc')}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enable_preschool_track}
                      onChange={(e) => handleChange('enable_preschool_track', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              {/* 3. Track: TUTORING */}
              <div className={`p-5 rounded-2xl border transition-all ${
                formData.enable_tutoring_track 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100' 
                  : 'bg-surface border-border opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/20 text-blue-600 rounded-xl">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold">{t('settings.track_tutoring_title')}</h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t('settings.track_tutoring_desc')}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enable_tutoring_track}
                      onChange={(e) => handleChange('enable_tutoring_track', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{t('settings.track_min_notice')}</span>
            </div>

          </div>
        )}

        {/* TAB 4: Database & Scheduled Backup */}
        {activeTab === 'BACKUP' && (
          <div className="space-y-6">
            
            {/* 1. Direct Local Download Card */}
            <div className="p-5 sm:p-7 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                      <span>{t('settings.backup_direct_download_title')}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                        SQL Dump
                      </span>
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">
                      {t('settings.backup_direct_download_desc')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setDownloadingDb(true);
                    try {
                      await downloadDatabaseBackup();
                    } catch (e) {
                      // handled in context
                    } finally {
                      setDownloadingDb(false);
                    }
                  }}
                  disabled={downloadingDb}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all shrink-0 disabled:opacity-50"
                >
                  {downloadingDb ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadingDb ? t('settings.saving_btn') : t('settings.backup_direct_download_btn')}</span>
                </button>
              </div>
            </div>

            {/* 2. Automated Scheduled Backup Service */}
            <div className="p-5 sm:p-7 bg-surface-card border border-border rounded-2xl sm:rounded-3xl shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main">
                      {t('settings.backup_auto_title')}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">
                      {t('settings.backup_auto_desc')}
                    </p>
                  </div>
                </div>

                {/* Auto Backup Toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.auto_backup_enabled}
                    onChange={(e) => handleChange('auto_backup_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Destination Folder & Frequency Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Folder Path Input */}
                <div className="lg:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-text-main">
                    {t('settings.backup_folder_label')} <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-text-muted">
                        <Folder className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={formData.backup_folder_path || ''}
                        onChange={(e) => {
                          handleChange('backup_folder_path', e.target.value);
                          setFolderVerification(null);
                        }}
                        className="w-full ps-10 p-3 bg-surface border border-border rounded-xl text-sm font-mono text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder={t('settings.backup_folder_placeholder')}
                        dir="ltr"
                      />
                    </div>

                    {/* Folder Selector Browse Button */}
                    <button
                      type="button"
                      onClick={() => setFolderSelectorOpen(true)}
                      className="px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-xs"
                      title={t('settings.select_folder_btn', 'استعراض واختيار مجلد')}
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{t('settings.select_folder_btn', 'اختيار مجلد')}</span>
                    </button>

                    {/* Folder Verification Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.backup_folder_path?.trim()) {
                          setFolderVerification({ valid: false, message: t('settings.enter_folder_first', 'يرجى إدخال أو اختيار مسار المجلد أولاً') });
                          return;
                        }
                        setVerifyingFolder(true);
                        try {
                          const res = await verifyFolder(formData.backup_folder_path);
                          setFolderVerification({ valid: true, message: res.message });
                        } catch (err) {
                          setFolderVerification({ valid: false, message: err.message });
                        } finally {
                          setVerifyingFolder(false);
                        }
                      }}
                      disabled={verifyingFolder || !formData.backup_folder_path?.trim()}
                      className="px-4 py-3 rounded-xl bg-surface hover:bg-surface-card border border-border text-xs font-bold text-text-main transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
                      title={t('settings.backup_verify_folder_btn')}
                    >
                      {verifyingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderCheck className="w-4 h-4 text-emerald-600" />}
                      <span>{t('settings.backup_verify_folder_btn')}</span>
                    </button>
                  </div>

                  {/* Folder Verification Feedback */}
                  {folderVerification && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      folderVerification.valid 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                    }`}>
                      {folderVerification.valid ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{folderVerification.message}</span>
                    </div>
                  )}

                  <span className="text-[11px] text-text-muted block">
                    {t('settings.backup_folder_hint')}
                  </span>
                </div>

                {/* Interval Dropdown */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-main">
                    {t('settings.backup_interval_label')} <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-text-muted">
                      <Clock className="w-4 h-4" />
                    </div>
                    <select
                      value={formData.backup_interval || '1_day'}
                      onChange={(e) => handleChange('backup_interval', e.target.value)}
                      className="w-full ps-10 p-3 bg-surface border border-border rounded-xl text-sm font-bold text-text-main focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="1_hour">{t('settings.backup_interval_1_hour')}</option>
                      <option value="6_hours">{t('settings.backup_interval_6_hours')}</option>
                      <option value="1_day">{t('settings.backup_interval_1_day')}</option>
                    </select>
                  </div>

                  <span className="text-[11px] text-text-muted block">
                    يتم التحقق من استحقاق النسخ في الخلفية دورياً.
                  </span>
                </div>

              </div>

              {/* Dynamic Path Structure Preview */}
              <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-main flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span>{t('settings.backup_path_structure_title')}</span>
                  </h4>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                    Year / date / file.sql
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {t('settings.backup_path_structure_desc')}
                </p>
                <div className="p-3 bg-black/5 dark:bg-black/30 rounded-xl font-mono text-xs text-primary font-bold overflow-x-auto text-left" dir="ltr">
                  📁 {((formData.backup_folder_path?.trim() || 'C:/QafGo_Backups').replace(/\\/g, '/'))}/{new Date().getFullYear()}/{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}/sauvegarde_{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}_{String(new Date().getHours()).padStart(2, '0')}{String(new Date().getMinutes()).padStart(2, '0')}.sql
                </div>
              </div>

              {/* Status & Immediate Manual Trigger Box */}
              <div className="p-4 sm:p-5 bg-surface/50 border border-border rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-primary" />
                      <span>{t('settings.backup_status_title')}</span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        formData.auto_backup_enabled 
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${formData.auto_backup_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {formData.auto_backup_enabled ? t('settings.backup_status_active') : t('settings.backup_status_inactive')}
                      </span>

                      {settings?.last_backup_at ? (
                        <span>
                          {t('settings.backup_last_run')} <strong>{new Date(settings.last_backup_at).toLocaleString(isRtl ? 'ar-DZ' : 'fr-FR')}</strong> {settings.last_backup_file && `(${settings.last_backup_file})`}
                        </span>
                      ) : (
                        <span>{t('settings.backup_status_never')}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.backup_folder_path?.trim()) {
                        alert(t('settings.enter_folder_first', 'يرجى إدخال مسار المجلد أولاً'));
                        return;
                      }
                      setRunningBackupNow(true);
                      try {
                        await runManualBackupNow();
                        const s = await getBackupStatus();
                        if (s) setBackupStatus(s);
                      } catch (err) {
                        // Handled in context
                      } finally {
                        setRunningBackupNow(false);
                      }
                    }}
                    disabled={runningBackupNow || !formData.backup_folder_path?.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all shrink-0 disabled:opacity-50"
                  >
                    {runningBackupNow ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <HardDrive className="w-4 h-4" />
                    )}
                    <span>{runningBackupNow ? t('settings.saving_btn') : t('settings.backup_run_now_btn')}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Bottom Save Action */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-black shadow-xl shadow-primary/25 disabled:opacity-50 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? t('settings.saving_btn') : t('settings.save_changes_btn')}</span>
          </button>
          </div>

        </form>
      )}

      {/* Folder Selector Modal */}
      <FolderSelectorModal
        isOpen={folderSelectorOpen}
        onClose={() => setFolderSelectorOpen(false)}
        initialPath={formData.backup_folder_path || ''}
        onSelectFolder={async (selectedPath) => {
          handleChange('backup_folder_path', selectedPath);
          setFolderVerification(null);
          try {
            const res = await verifyFolder(selectedPath);
            setFolderVerification({ valid: true, message: res.message });
          } catch (err) {
            setFolderVerification({ valid: false, message: err.message });
          }
        }}
      />

    </div>
  );
}
