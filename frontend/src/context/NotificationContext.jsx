import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationDialog from '../components/NotificationDialog';
import { useLanguage } from './LanguageContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { t } = useLanguage();

  const showNotification = useCallback((message, type = 'info', title = '') => {
    setNotification({
      id: Date.now(),
      type, // 'success' | 'error' | 'info' | 'warning'
      title: title || (type === 'success' ? t('common.success') : type === 'error' ? t('common.error') : t('common.info')),
      message
    });
  }, [t]);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Async Confirm dialog to replace native confirm()
  const confirm = useCallback(({ 
    title, 
    subtitle,
    message, 
    confirmText, 
    cancelText,
    variant = 'warning', // 'warning' | 'danger' | 'success' | 'info'
    icon = null
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title: title || t('confirm_dialog.title_default'),
        subtitle: subtitle !== undefined ? subtitle : t('confirm_dialog.subtitle_default'),
        message,
        confirmText: confirmText || t('confirm_dialog.confirm_btn'),
        cancelText: cancelText || t('confirm_dialog.cancel_btn'),
        variant,
        icon,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  }, [t]);

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification, confirm }}>
      {children}
      <NotificationDialog 
        notification={notification} 
        onClose={closeNotification} 
        confirmDialog={confirmDialog} 
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
