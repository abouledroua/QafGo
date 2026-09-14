import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNotification } from './NotificationContext';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { setRuntimeCurrency } from '../i18n/index.js';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { showNotification } = useNotification();
  const { setTheme } = useTheme();
  const { t } = useLanguage();

  const [settings, setSettings] = useState({
    school_name: 'مدرسة النور والفرقان القرآنية والتعليمية',
    legal_registration_no: 'اعتماد وزاري رقم: 2024/0984-QAF',
    phone_primary: '0550 12 34 56',
    phone_secondary: '023 45 67 89',
    email: 'contact@qafgo-school.dz',
    address_line: 'حي النور، شارع الإمام مالك، المقاطعة الإدارية الأولى',
    city: 'الجزائر العاصمة',
    state_province: 'الجزائر',
    logo_url: null,
    stamp_signature_url: null,
    receipt_header_text: 'الجمهورية الجزائرية الديمقراطية الشعبية - وزارة الشؤون الدينية والأوقاف',
    receipt_footer_notes: 'يرجى الاحتفاظ بهذا الوصل كسند إثبات رسمي. الاشتراكات غير قابلة للاسترداد بعد انقضاء الشهر المرجعي.',
    currency_symbol: (typeof window !== 'undefined' && localStorage.getItem('qafgo_currency_symbol')) || 'د.ج',
    default_language: 'ar',
    default_theme: 'brown-light',
    auto_backup_enabled: false,
    late_attendance_threshold_minutes: 15,
    default_max_absences_warning: 3,
    enable_quran_track: true,
    enable_preschool_track: true,
    enable_tutoring_track: true
  });

  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.success && res.data) {
        setSettings(res.data);
        if (res.data.currency_symbol) {
          setRuntimeCurrency(res.data.currency_symbol);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('currency:updated', { detail: res.data.currency_symbol }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load school settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettingsData) => {
    try {
      const res = await api.put('/settings', newSettingsData);
      if (res.success) {
        setSettings(res.data);
        const sym = newSettingsData.currency_symbol || res.data?.currency_symbol;
        if (sym) {
          setRuntimeCurrency(sym);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('currency:updated', { detail: sym }));
          }
        }
        if (newSettingsData.default_theme) {
          setTheme(newSettingsData.default_theme);
        }
        showNotification(t('settings.settings_save_success', 'تم حفظ إعدادات المؤسسة والنظام بنجاح'), 'success');
        return res.data;
      }
    } catch (err) {
      showNotification(err.message || t('settings.settings_save_error', 'فشل حفظ الإعدادات'), 'error');
      throw err;
    }
  };

  const uploadAsset = async (file, type = 'logo') => {
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('file', file);

      const res = await api.post(`/settings/upload-assets?type=${encodeURIComponent(type)}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.success) {
        showNotification(type === 'stamp' ? t('settings.stamp_uploaded_success', 'تم رفع الختم والتوقيع الإداري بنجاح') : t('settings.logo_uploaded_success', 'تم رفع الشعار الرسمي بنجاح'), 'success');
        return res.url;
      }
    } catch (err) {
      showNotification(err.message || t('settings.upload_error', 'فشل رفع الملف'), 'error');
      throw err;
    }
  };

  const downloadDatabaseBackup = async () => {
    try {
      const token = localStorage.getItem('qafgo_token');
      const res = await api.get('/settings/backup/download', {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const blob = new Blob([res], { type: 'application/sql' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
      link.download = `sauvegarde_${dateStr}_${timeStr}.sql`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showNotification(t('settings.backup_download_success', 'تم تنزيل نسخة قاعدة البيانات بنجاح'), 'success');
      return true;
    } catch (err) {
      console.error('Download DB backup error:', err);
      showNotification(err.message || t('settings.backup_download_error', 'فشل تنزيل نسخة قاعدة البيانات'), 'error');
      throw err;
    }
  };

  const runManualBackupNow = async () => {
    try {
      const res = await api.post('/settings/backup/run-now');
      if (res.success) {
        showNotification(t('settings.backup_run_success', 'تم حفظ النسخة الاحتياطية بنجاح في المجلد المحدد'), 'success');
        fetchSettings();
        return res.result;
      }
    } catch (err) {
      showNotification(err.message || t('settings.backup_run_error', 'فشل إجراء النسخ الاحتياطي'), 'error');
      throw err;
    }
  };

  const verifyFolder = async (folderPath) => {
    try {
      const res = await api.post('/settings/backup/verify-folder', { folderPath });
      return res;
    } catch (err) {
      throw err;
    }
  };

  const getBackupStatus = async () => {
    try {
      const res = await api.get('/settings/backup/status');
      return res.data;
    } catch (err) {
      console.error('getBackupStatus error:', err);
      return null;
    }
  };

  const exploreDirectory = async (folderPath = '') => {
    try {
      const url = folderPath 
        ? `/settings/backup/explore-directory?path=${encodeURIComponent(folderPath)}` 
        : '/settings/backup/explore-directory';
      const res = await api.get(url);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const createDirectory = async (parentPath, folderName) => {
    try {
      const res = await api.post('/settings/backup/create-directory', { parentPath, folderName });
      return res;
    } catch (err) {
      throw err;
    }
  };

  const currentCurrency = settings?.currency_symbol || (typeof window !== 'undefined' ? localStorage.getItem('qafgo_currency_symbol') : 'د.ج') || 'د.ج';

  return (
    <SettingsContext.Provider value={{
      settings,
      currency: currentCurrency,
      loading,
      updateSettings,
      uploadAsset,
      fetchSettings,
      reloadSettings: fetchSettings,
      downloadDatabaseBackup,
      runManualBackupNow,
      verifyFolder,
      getBackupStatus,
      exploreDirectory,
      createDirectory
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
