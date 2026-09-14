import React, { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportToExcel, exportHtmlTableToExcel } from '../utils/excelExporter';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';

/**
 * Reusable Multilingual Export to Excel Button
 */
export default function ExportExcelButton({
  data,
  columns,
  filename,
  sheetName,
  tableSelector,
  label,
  variant = 'default', // 'default' | 'compact' | 'outline' | 'iconOnly'
  className = '',
  disabled = false,
  rtl,
  onExportSuccess,
  onExportError
}) {
  const { t, isRtl } = useLanguage();
  const { showNotification } = useNotification();
  const [exporting, setExporting] = useState(false);

  const activeRtl = rtl !== undefined ? rtl : isRtl;
  const activeLabel = label || t('common.export_excel', 'تصدير Excel');
  const activeFilename = filename || t('common.data_export', 'تصدير_بيانات');
  const activeSheetName = sheetName || t('common.data', 'البيانات');

  const handleExport = async (e) => {
    e.stopPropagation();
    if (disabled || exporting) return;

    try {
      setExporting(true);
      if (tableSelector) {
        exportHtmlTableToExcel(tableSelector, activeFilename, activeRtl);
      } else if (data && data.length > 0) {
        exportToExcel({
          filename: activeFilename,
          sheetName: activeSheetName,
          columns,
          data,
          rtl: activeRtl
        });
      } else {
        showNotification(t('common.no_data_to_export', 'لا توجد بيانات متاحة للتصدير حالياً'), 'warning');
        return;
      }

      showNotification(t('common.export_success', 'تم تصدير ملف Excel بنجاح'), 'success');
      if (onExportSuccess) onExportSuccess();
    } catch (err) {
      console.error('Export Excel failed:', err);
      if (onExportError) {
        onExportError(err);
      } else {
        showNotification(err.message || t('common.export_failed', 'فشل تصدير البيانات إلى Excel'), 'error');
      }
    } finally {
      setExporting(false);
    }
  };

  const baseStyles = "inline-flex items-center justify-center font-bold transition-all select-none rounded-xl disabled:opacity-50 disabled:cursor-not-allowed";

  let variantStyles = "gap-2 px-3.5 py-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20";
  if (variant === 'compact') {
    variantStyles = "gap-1.5 px-2.5 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
  } else if (variant === 'outline') {
    variantStyles = "gap-2 px-3 py-2 text-xs sm:text-sm bg-surface hover:bg-surface-card text-emerald-700 dark:text-emerald-400 border border-emerald-600/40 shadow-xs";
  } else if (variant === 'iconOnly') {
    variantStyles = "p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20";
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || exporting || (!tableSelector && (!data || data.length === 0))}
      className={`${baseStyles} ${variantStyles} ${className}`}
      title={activeLabel}
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <FileSpreadsheet className="w-4 h-4 text-current shrink-0" />
      )}
      {variant !== 'iconOnly' && <span>{exporting ? t('common.exporting', 'جاري التصدير...') : activeLabel}</span>}
    </button>
  );
}
