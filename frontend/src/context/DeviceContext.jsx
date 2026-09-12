import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  getStoredDeviceKey,
  getStoredDeviceName,
  generateDeviceKey,
  persistDevice,
  getHardwareFingerprint
} from '../utils/deviceFingerprint';

const DeviceContext = createContext();

export const DeviceProvider = ({ children }) => {
  const [deviceKey, setDeviceKey] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize and verify device key on app launch
  const initDevice = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Hardware fingerprint
      const fp = await getHardwareFingerprint();
      setFingerprint(fp);

      // 2. Check local/cookie storage
      let key = getStoredDeviceKey();
      let name = getStoredDeviceName() || '';

      if (key) {
        // Verify key against DB
        try {
          const res = await api.get(`/devices/check/${key}`);
          if (res.success && res.exists) {
            setDeviceKey(res.device.device_key);
            setDeviceName(res.device.device_name);
            setIsRegistered(true);
            persistDevice(res.device.device_key, res.device.device_name);
            setLoading(false);
            return;
          }
        } catch {
          // If offline or check fails, keep key
        }
      } else {
        // Cross-browser recovery: Try to find existing device on same machine via fingerprint
        try {
          const lookupRes = await api.get(`/devices/lookup?fingerprint=${encodeURIComponent(fp)}`);
          if (lookupRes.success && lookupRes.found && lookupRes.device) {
            const matchedKey = lookupRes.device.device_key;
            const matchedName = lookupRes.device.device_name;
            setDeviceKey(matchedKey);
            setDeviceName(matchedName);
            setIsRegistered(true);
            persistDevice(matchedKey, matchedName);
            setLoading(false);
            return;
          }
        } catch {
          // Lookup failure non-blocking
        }
      }

      // If no valid key was found, generate a fresh unique key (between 5 and 8 chars, 6 chars)
      if (!key) {
        key = generateDeviceKey();
        persistDevice(key, name);
      }

      setDeviceKey(key);
      setDeviceName(name);
      setIsRegistered(false);
    } catch (err) {
      console.error('Device initialization error:', err);
      // Fallback
      const fallbackKey = generateDeviceKey();
      setDeviceKey(fallbackKey);
      persistDevice(fallbackKey, '');
      setIsRegistered(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initDevice();
  }, [initDevice]);

  /**
   * Register or claim the device name
   */
  const registerCurrentDevice = async (name, customKey = null) => {
    const keyToRegister = (customKey || deviceKey || generateDeviceKey()).trim().toUpperCase();
    const cleanName = String(name).trim();

    const res = await api.post('/devices/register', {
      device_key: keyToRegister,
      device_name: cleanName,
      fingerprint
    });

    if (res.success) {
      persistDevice(keyToRegister, cleanName);
      setDeviceKey(keyToRegister);
      setDeviceName(cleanName);
      setIsRegistered(true);
      return res;
    }

    throw new Error(res.message || 'فشل تسجيل الجهاز');
  };

  return (
    <DeviceContext.Provider
      value={{
        deviceKey,
        deviceName,
        fingerprint,
        isRegistered,
        loading,
        registerDevice: registerCurrentDevice,
        refreshDevice: initDevice
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
