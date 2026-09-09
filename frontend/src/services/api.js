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
    const message = error.response?.data?.message || 'حدث خطأ في الاتصال بالخادم';
    return Promise.reject(new Error(message));
  }
);

export default api;
