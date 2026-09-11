import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Verify token and fetch latest user info on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/users/me');
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const signup = async (email, password) => {
    const res = await api.post('/auth/signup', { email, password });
    const { token: newToken, user: userData } = res.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = async (googlePayload) => {
    const res = await api.post('/auth/google', googlePayload);
    const { token: newToken, user: userData } = res.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUserStorage = (usedStorageBytes, quotaBytes) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        usedStorageBytes: Number(usedStorageBytes),
        quotaBytes: quotaBytes !== undefined ? Number(quotaBytes) : prev.quotaBytes || 16106127360,
      };
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error('Failed to refresh user stats:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        signup,
        loginWithGoogle,
        logout,
        refreshUser,
        updateUserStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
