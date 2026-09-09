import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNotification } from './NotificationContext';
import { useTheme } from './ThemeContext';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { showNotification } = useNotification();
  const { setTheme } = useTheme();

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
    currency_symbol: 'د.ج',
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
        if (newSettingsData.default_theme) {
          setTheme(newSettingsData.default_theme);
        }
        showNotification('تم حفظ إعدادات المؤسسة والنظام بنجاح', 'success');
        return res.data;
      }
    } catch (err) {
      showNotification(err.message || 'فشل حفظ الإعدادات', 'error');
      throw err;
    }
  };

  const uploadAsset = async (file, type = 'logo') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await api.post('/settings/upload-assets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.success) {
        showNotification(type === 'stamp' ? 'تم رفع الختم والتوقيع الإداري بنجاح' : 'تم رفع الشعار الرسمي بنجاح', 'success');
        return res.url;
      }
    } catch (err) {
      showNotification(err.message || 'فشل رفع الملف', 'error');
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      updateSettings,
      uploadAsset,
      reloadSettings: fetchSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
