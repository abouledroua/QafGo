import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  HardDrive, 
  CornerLeftUp, 
  Search, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Loader2,
  Home,
  Monitor,
  FileText,
  Boxes
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';

export default function FolderSelectorModal({ isOpen, onClose, initialPath, onSelectFolder }) {
  const { t, isRtl, dir } = useLanguage();
  const { exploreDirectory, createDirectory } = useSettings();

  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [drives, setDrives] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [isWritable, setIsWritable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search filter
  const [filterQuery, setFilterQuery] = useState('');

  // Create new folder inline state
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Load directory details
  const loadDirectory = useCallback(async (path) => {
    try {
      setLoading(true);
      setError(null);
      const res = await exploreDirectory(path);
      if (res.success) {
        setCurrentPath(res.currentPath);
        setParentPath(res.parentPath);
        setBreadcrumbs(res.breadcrumbs || []);
        setDirectories(res.directories || []);
        setDrives(res.drives || []);
        setShortcuts(res.shortcuts || []);
        setIsWritable(res.isWritable !== false);
      }
    } catch (err) {
      console.error('Error exploring directory:', err);
      setError(err.message || t('settings.folder_picker_open_error', 'فشل فتح المجلد المحدد'));
    } finally {
      setLoading(false);
    }
  }, [exploreDirectory]);

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || '');
      setShowNewFolderInput(false);
      setNewFolderName('');
      setFilterQuery('');
    }
  }, [isOpen, initialPath, loadDirectory]);

  if (!isOpen) return null;

  const handleNavigate = (targetPath) => {
    setShowNewFolderInput(false);
    setNewFolderName('');
    setFilterQuery('');
    loadDirectory(targetPath);
  };

  const handleCreateFolder = async (e) => {
    e?.preventDefault();
    if (!newFolderName.trim() || !currentPath) return;

    try {
      setCreatingFolder(true);
      const res = await createDirectory(currentPath, newFolderName.trim());
      if (res.success && res.createdPath) {
        setShowNewFolderInput(false);
        setNewFolderName('');
        await loadDirectory(res.createdPath);
      }
    } catch (err) {
      setError(err.message || t('settings.folder_picker_create_error', 'فشل إنشاء المجلد'));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleConfirmSelection = () => {
    if (currentPath) {
      onSelectFolder(currentPath);
      onClose();
    }
  };

  const filteredDirs = directories.filter(d => 
    d.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const getShortcutIcon = (id) => {
    switch (id) {
      case 'home': return <Home className="w-3.5 h-3.5" />;
      case 'desktop': return <Monitor className="w-3.5 h-3.5" />;
      case 'documents': return <FileText className="w-3.5 h-3.5" />;
      case 'app': return <Boxes className="w-3.5 h-3.5" />;
      default: return <Folder className="w-3.5 h-3.5" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir={dir}>
      <div className="w-full max-w-2xl bg-surface-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-main">
                {t('settings.folder_picker_title', 'مستكشف المجلدات')}
              </h2>
              <p className="text-xs text-text-muted">
                {t('settings.folder_picker_desc', 'حدد المجلد الذي سيتم حفظ النسخ الاحتياطية داخله')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shortcuts & Drives */}
        <div className="p-3 bg-surface/50 border-b border-border/70 flex items-center gap-2 overflow-x-auto text-xs scrollbar-thin">
          {/* Drives */}
          {drives.map(drive => (
            <button
              key={drive}
              type="button"
              onClick={() => handleNavigate(drive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                currentPath.toUpperCase().startsWith(drive.toUpperCase())
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface hover:bg-surface-hover text-text-main border-border'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{drive}</span>
            </button>
          ))}

          <div className="h-4 w-px bg-border shrink-0 mx-1"></div>

          {/* Common Locations */}
          {shortcuts.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleNavigate(s.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                currentPath.toLowerCase() === s.path.toLowerCase()
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border-border'
              }`}
            >
              {getShortcutIcon(s.id)}
              <span>{t(`settings.folder_shortcut_${s.id}`, s.label)}</span>
            </button>
          ))}
        </div>

        {/* Navigation Bar & Breadcrumbs */}
        <div className="p-3 bg-surface border-b border-border flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => parentPath && handleNavigate(parentPath)}
            disabled={!parentPath || loading}
            title={t('settings.folder_picker_up', 'المستوى الأعلى')}
            className="p-2 rounded-xl bg-surface-card hover:bg-surface-hover text-text-main border border-border disabled:opacity-30 transition-all shrink-0"
          >
            <CornerLeftUp className={`w-4 h-4 ${isRtl ? 'scale-x-[-1]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            title={t('common.refresh', 'تحديث')}
            className="p-2 rounded-xl bg-surface-card hover:bg-surface-hover text-text-main border border-border disabled:opacity-30 transition-all shrink-0"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Breadcrumbs Path */}
          <div className="flex-1 min-w-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-card border border-border overflow-x-auto text-xs font-mono scrollbar-none" dir="ltr">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                {idx > 0 && <span className="text-text-muted/60 select-none">/</span>}
                <button
                  type="button"
                  onClick={() => handleNavigate(crumb.path)}
                  className={`px-1.5 py-0.5 rounded-md hover:bg-surface transition-colors whitespace-nowrap ${
                    idx === breadcrumbs.length - 1 ? 'font-bold text-primary bg-primary/10' : 'text-text-main'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* New Folder Toggle Button */}
          <button
            type="button"
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
              showNewFolderInput 
                ? 'bg-primary text-white border-primary' 
                : 'bg-surface-card hover:bg-surface-hover text-text-main border-border'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.folder_picker_new_folder', 'مجلد جديد')}</span>
          </button>
        </div>

        {/* Inline New Folder Form */}
        {showNewFolderInput && (
          <form onSubmit={handleCreateFolder} className="p-3 bg-primary/5 border-b border-primary/20 flex items-center gap-2 animate-fadeIn">
            <div className="relative flex-1">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t('settings.folder_picker_new_folder_prompt', 'اسم المجلد الجديد...')}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={creatingFolder || !newFolderName.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1"
            >
              {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{t('common.create', 'إنشاء')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewFolderInput(false);
                setNewFolderName('');
              }}
              className="px-3 py-2 bg-surface hover:bg-surface-hover text-text-muted rounded-xl text-xs font-bold border border-border"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
          </form>
        )}

        {/* Filter Input */}
        <div className="p-3 border-b border-border/60 bg-surface/30 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`w-3.5 h-3.5 text-text-muted absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t('settings.folder_picker_filter', 'تصفية المجلدات...')}
              className={`w-full py-1.5 rounded-xl bg-surface border border-border text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary ${
                isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
            />
          </div>
          <span className="text-[11px] font-bold text-text-muted shrink-0">
            {filteredDirs.length} {t('settings.folder_picker_count', 'مجلد')}
          </span>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="m-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Directory Explorer Body */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[260px] max-h-[380px]">
          {loading ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-bold">{t('common.loading', 'جاري التحميل...')}</span>
            </div>
          ) : filteredDirs.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 text-center p-6 text-text-muted">
              <Folder className="w-10 h-10 text-text-muted/40 stroke-1" />
              <p className="text-xs font-bold">
                {filterQuery 
                  ? t('settings.folder_picker_no_match', 'لا توجد نتائج مطابقة للبحث')
                  : t('settings.folder_picker_empty', 'لا توجد مجلدات فرعية في هذا المسار')}
              </p>
              <p className="text-[11px] text-text-muted/80 max-w-sm">
                {t('settings.folder_picker_empty_hint', 'يمكنك اعتماد هذا المجلد الحالي مباشرة أو إنشاء مجلد جديد داخله')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredDirs.map((dirItem) => (
                <button
                  key={dirItem.path}
                  type="button"
                  onClick={() => handleNavigate(dirItem.path)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border/80 hover:border-primary/40 transition-all text-start group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-text-main truncate" title={dirItem.name}>
                      {dirItem.name}
                    </span>
                  </div>

                  {dirItem.isWritable ? (
                    <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0 font-bold">
                      {t('settings.folder_picker_writable', 'متاح')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0 font-bold">
                      {t('settings.folder_picker_not_writable', 'قراءة فقط')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Selected Path and Confirmation */}
        <div className="p-4 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex-1 min-w-0">
            <span className="text-[11px] text-text-muted font-bold block mb-0.5">
              {t('settings.folder_picker_current_selection', 'المسار المحدد حالياً:')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-text-main truncate bg-surface-card px-2.5 py-1 rounded-lg border border-border" dir="ltr">
                {currentPath || '---'}
              </span>
              {isWritable ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('settings.folder_picker_writable', 'صالح للكتابة')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{t('settings.folder_picker_not_writable', 'غير متاح للكتابة')}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-bold text-text-muted hover:text-text-main transition-all"
            >
              {t('common.cancel', 'إلغاء')}
            </button>

            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={!currentPath || !isWritable}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t('settings.folder_picker_select_btn', 'اعتماد هذا المجلد')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
