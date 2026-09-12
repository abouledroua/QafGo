import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qafgo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const lang = localStorage.getItem('qafgo_lang') || 'ar';
  config.headers['Accept-Language'] = lang;

  const posteName = localStorage.getItem('qafgo_poste_name');
  if (posteName) {
    config.headers['X-Poste-Name'] = encodeURIComponent(posteName);
  }

  const deviceKey = localStorage.getItem('qafgo_device_key');
  if (deviceKey) {
    config.headers['X-Device-Key'] = deviceKey.trim().toUpperCase();
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qafgo_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    const currentLang = localStorage.getItem('qafgo_lang') || 'ar';
    const fallbackMessage = currentLang === 'fr'
      ? 'Une erreur de connexion au serveur est survenue'
      : currentLang === 'en'
        ? 'A server connection error occurred'
        : 'حدث خطأ في الاتصال بالخادم';
    const message = error.response?.data?.message || fallbackMessage;
    return Promise.reject(new Error(message));
  }
);

export default api;
