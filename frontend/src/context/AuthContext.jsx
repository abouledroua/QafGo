import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('qafgo_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.success) {
            setUser(res.user);
          } else {
            localStorage.removeItem('qafgo_token');
          }
        } catch (e) {
          localStorage.removeItem('qafgo_token');
        }
      } else {
        // Auto-login default admin for smooth demo experience
        try {
          const res = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
          if (res.success) {
            localStorage.setItem('qafgo_token', res.token);
            setUser(res.user);
          }
        } catch (err) {
          console.warn('Auto-login notice:', err);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success) {
      localStorage.setItem('qafgo_token', res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'فشل تسجيل الدخول');
  };

  const logout = () => {
    localStorage.removeItem('qafgo_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
