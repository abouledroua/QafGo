import pool from '../config/db.js';
import { createDatabaseBackupFile } from '../utils/databaseDumper.js';
import { logActivity } from '../utils/auditLogger.js';

let tickerIntervalId = null;
let isBackupRunning = false;

const INTERVAL_MS_MAP = {
  '1_hour': 1 * 60 * 60 * 1000,
  '6_hours': 6 * 60 * 60 * 1000,
  '1_day': 24 * 60 * 60 * 1000
};

export const getIntervalMs = (intervalKey) => {
  return INTERVAL_MS_MAP[intervalKey] || INTERVAL_MS_MAP['1_day'];
};

/**
 * Check and execute automated backup if due
 */
export const checkAndRunAutoBackup = async () => {
  if (isBackupRunning) {
    return { skipped: true, reason: 'ALREADY_RUNNING' };
  }

  try {
    const [rows] = await pool.query(
      `SELECT auto_backup_enabled, backup_folder_path, backup_interval, last_backup_at 
       FROM school_settings WHERE id = 1`
    );

    if (rows.length === 0) return { skipped: true, reason: 'NO_SETTINGS' };

    const settings = rows[0];
    const isEnabled = settings.auto_backup_enabled === 1 || settings.auto_backup_enabled === true;
    const folderPath = settings.backup_folder_path ? settings.backup_folder_path.trim() : '';
    const intervalKey = settings.backup_interval || '1_day';
    const intervalMs = getIntervalMs(intervalKey);

    if (!isEnabled || !folderPath) {
      return { skipped: true, reason: 'DISABLED_OR_NO_FOLDER' };
    }

    const now = Date.now();
    const lastBackupTime = settings.last_backup_at ? new Date(settings.last_backup_at).getTime() : 0;
    const elapsed = now - lastBackupTime;

    if (elapsed < intervalMs) {
      return {
        skipped: true,
        reason: 'NOT_DUE_YET',
        nextRunInMs: intervalMs - elapsed
      };
    }

    console.log(`[BackupScheduler] Auto-backup is due (interval: ${intervalKey}). Executing backup to folder: "${folderPath}"...`);
    isBackupRunning = true;

    const result = await createDatabaseBackupFile(folderPath);

    // Update settings table with success
    await pool.query(
      `UPDATE school_settings SET
         last_backup_at = NOW(),
         last_backup_status = 'SUCCESS',
         last_backup_file = ?,
         last_backup_error = NULL
       WHERE id = 1`,
      [result.relativeFilePath]
    );

    console.log(`[BackupScheduler] Auto-backup completed successfully: ${result.relativeFilePath} (${result.sizeBytes} bytes)`);

    // Log to audit trail
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action_type, data_type, entity_id, entity_name, details)
         VALUES (NULL, 'BACKUP', 'SETTINGS', 1, 'قاعدة البيانات', ?)`,
        [`النسخ الاحتياطي التلقائي المجدول بنجاح: ${result.relativeFilePath} (${(result.sizeBytes / 1024).toFixed(1)} KB)`]
      );
    } catch (logErr) {
      console.warn('[BackupScheduler] Failed to log audit entry:', logErr.message);
    }

    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('[BackupScheduler] Auto-backup failed:', error);

    try {
      await pool.query(
        `UPDATE school_settings SET
           last_backup_status = 'FAILED',
           last_backup_error = ?
         WHERE id = 1`,
        [error.message || 'Unknown backup error']
      );
    } catch {
      // ignore
    }

    return {
      success: false,
      error: error.message
    };
  } finally {
    isBackupRunning = false;
  }
};

/**
 * Run manual backup immediately on demand
 */
export const runManualBackup = async (req = null) => {
  if (isBackupRunning) {
    throw new Error('عملية نسخ احتياطي أخرى جارية بالفعل، يرجى الانتظار.');
  }

  isBackupRunning = true;
  try {
    const [rows] = await pool.query(
      `SELECT backup_folder_path FROM school_settings WHERE id = 1`
    );

    const folderPath = rows[0]?.backup_folder_path?.trim();
    if (!folderPath) {
      throw new Error('يرجى تحديد مسار مجلد النسخ الاحتياطي أولاً وحفظ الإعدادات.');
    }

    const result = await createDatabaseBackupFile(folderPath);

    await pool.query(
      `UPDATE school_settings SET
         last_backup_at = NOW(),
         last_backup_status = 'SUCCESS',
         last_backup_file = ?,
         last_backup_error = NULL
       WHERE id = 1`,
      [result.relativeFilePath]
    );

    if (req) {
      logActivity(req, {
        action_type: 'BACKUP',
        data_type: 'SETTINGS',
        entity_id: 1,
        entity_name: 'قاعدة البيانات',
        details: `نسخ احتياطي يدوي فوري تم بنجاح: ${result.relativeFilePath}`
      });
    }

    return result;
  } catch (error) {
    await pool.query(
      `UPDATE school_settings SET
         last_backup_status = 'FAILED',
         last_backup_error = ?
       WHERE id = 1`,
      [error.message || 'Unknown manual backup error']
    );
    throw error;
  } finally {
    isBackupRunning = false;
  }
};

/**
 * Get current scheduler status
 */
export const getSchedulerStatus = async () => {
  const [rows] = await pool.query(
    `SELECT auto_backup_enabled, backup_folder_path, backup_interval, 
            last_backup_at, last_backup_status, last_backup_file, last_backup_error 
     FROM school_settings WHERE id = 1`
  );

  const s = rows[0] || {};
  const isEnabled = s.auto_backup_enabled === 1 || s.auto_backup_enabled === true;
  const intervalKey = s.backup_interval || '1_day';
  const intervalMs = getIntervalMs(intervalKey);

  let nextBackupAt = null;
  if (isEnabled && s.backup_folder_path) {
    if (s.last_backup_at) {
      nextBackupAt = new Date(new Date(s.last_backup_at).getTime() + intervalMs);
    } else {
      nextBackupAt = new Date(); // due immediately
    }
  }

  return {
    active: isEnabled,
    interval: intervalKey,
    intervalMs,
    folderPath: s.backup_folder_path || '',
    lastBackupAt: s.last_backup_at,
    lastBackupStatus: s.last_backup_status,
    lastBackupFile: s.last_backup_file,
    lastBackupError: s.last_backup_error,
    nextBackupAt: nextBackupAt ? nextBackupAt.toISOString() : null,
    isCurrentlyRunning: isBackupRunning
  };
};

/**
 * Start the background ticker
 */
export const startBackupScheduler = () => {
  if (tickerIntervalId) {
    clearInterval(tickerIntervalId);
  }

  console.log('[BackupScheduler] Background service started (polling every 60 seconds)...');

  // Check on startup after a small delay (10 seconds)
  setTimeout(() => {
    checkAndRunAutoBackup().catch(err => {
      console.error('[BackupScheduler] Startup check error:', err);
    });
  }, 10000);

  // Poll every 60 seconds
  tickerIntervalId = setInterval(() => {
    checkAndRunAutoBackup().catch(err => {
      console.error('[BackupScheduler] Scheduled tick error:', err);
    });
  }, 60000);
};

/**
 * Stop scheduler
 */
export const stopBackupScheduler = () => {
  if (tickerIntervalId) {
    clearInterval(tickerIntervalId);
    tickerIntervalId = null;
    console.log('[BackupScheduler] Background service stopped.');
  }
};

/**
 * Reload scheduler after settings update
 */
export const reloadScheduler = async () => {
  console.log('[BackupScheduler] Reloading scheduler settings...');
  return await checkAndRunAutoBackup();
};
