import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campuseats_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('campuseats_token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch fresh profile on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          localStorage.setItem('campuseats_user', JSON.stringify(res.data.data.user));
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('campuseats_token', newToken);
    localStorage.setItem('campuseats_user', JSON.stringify(newUser));
    return newUser;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('campuseats_token', newToken);
    localStorage.setItem('campuseats_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campuseats_token');
    localStorage.removeItem('campuseats_user');
  };

  const reloadProfile = async () => {
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data.user);
        localStorage.setItem('campuseats_user', JSON.stringify(res.data.data.user));
      } catch (err) {
        console.error('Failed to reload profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
