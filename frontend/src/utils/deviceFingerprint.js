/**
 * Device Fingerprinting and Persistent Key Management Utility
 */

const KEY_STORAGE_KEY = 'qafgo_device_key';
const POSTE_STORAGE_KEY = 'qafgo_poste_name';
const COOKIE_MAX_AGE = 315360000; // 10 years

// Allowed characters: Uppercase letters & numbers, excluding ambiguous chars (0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Helper to read cookie
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Helper to set cookie
 */
function setCookie(name, value, maxAge = COOKIE_MAX_AGE) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Generates a clean 6-character uppercase alphanumeric key (between 5 and 8 chars)
 */
export function generateDeviceKey() {
  let key = '';
  const array = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (let i = 0; i < 6; i++) {
      key += CHARSET[array[i] % CHARSET.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      key += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
  }
  return key;
}

/**
 * Retrieves the stored device key from localStorage or persistent cookie
 */
export function getStoredDeviceKey() {
  let key = null;
  try {
    key = localStorage.getItem(KEY_STORAGE_KEY);
  } catch {}

  if (!key) {
    key = getCookie(KEY_STORAGE_KEY);
    if (key) {
      try {
        localStorage.setItem(KEY_STORAGE_KEY, key);
      } catch {}
    }
  }

  // Validate format (5 to 8 uppercase alphanumeric)
  if (key && /^[A-Z0-9]{5,8}$/.test(key.trim().toUpperCase())) {
    return key.trim().toUpperCase();
  }
  return null;
}

/**
 * Retrieves the stored device name / workstation name
 */
export function getStoredDeviceName() {
  let name = null;
  try {
    name = localStorage.getItem(POSTE_STORAGE_KEY);
  } catch {}

  if (!name) {
    name = getCookie(POSTE_STORAGE_KEY);
    if (name) {
      try {
        localStorage.setItem(POSTE_STORAGE_KEY, name);
      } catch {}
    }
  }

  return name ? name.trim() : null;
}

/**
 * Persists the device key and friendly name to both localStorage and Cookie
 */
export function persistDevice(key, name) {
  if (key) {
    const cleanKey = String(key).trim().toUpperCase();
    try {
      localStorage.setItem(KEY_STORAGE_KEY, cleanKey);
    } catch {}
    setCookie(KEY_STORAGE_KEY, cleanKey);
  }

  if (name) {
    const cleanName = String(name).trim();
    try {
      localStorage.setItem(POSTE_STORAGE_KEY, cleanName);
    } catch {}
    setCookie(POSTE_STORAGE_KEY, cleanName);
  }
}

/**
 * Simple 32-bit FNV-1a hash
 */
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generates a stable hardware fingerprint of the physical device
 * Works across different browsers on the same machine
 */
export async function getHardwareFingerprint() {
  const components = [];

  // 1. Screen resolution & color depth (physical monitor)
  if (typeof window !== 'undefined' && window.screen) {
    components.push(`scr:${screen.width}x${screen.height}x${screen.colorDepth}`);
  }

  // 2. Hardware concurrency (CPU cores)
  if (typeof navigator !== 'undefined') {
    components.push(`cpu:${navigator.hardwareConcurrency || 4}`);
    components.push(`mem:${navigator.deviceMemory || 4}`);
    components.push(`plat:${navigator.platform || navigator.userAgentData?.platform || 'pc'}`);
  }

  // 3. Timezone (system level)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    components.push(`tz:${tz}`);
  } catch {}

  // 4. WebGL GPU renderer & vendor (physical GPU)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`gpu:${vendor}~${renderer}`);
      }
    }
  } catch {}

  const rawString = components.join('|');
  const hash = fnv1a(rawString);
  return `qaf_${hash}`;
}
