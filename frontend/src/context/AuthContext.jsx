import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const sanitizeDeviceAccounts = () => {
  try {
    const key = 'drivora_device_accounts';
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (acc) =>
            acc &&
            acc.email &&
            !acc.email.toLowerCase().includes('test.com') &&
            !acc.email.toLowerCase().includes('example') &&
            !acc.name?.toLowerCase().includes('cloud user') &&
            !acc.badge?.toLowerCase().includes('linked drive')
        );
        localStorage.setItem(key, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch (e) {}
  return [];
};

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

    sanitizeDeviceAccounts();
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
    if (user?.email) {
      try {
        const key = 'drivora_device_accounts';
        const raw = localStorage.getItem(key);
        const existing = raw ? JSON.parse(raw) : [];
        const cleaned = Array.isArray(existing)
          ? existing.filter(
              (a) =>
                a &&
                a.email &&
                !a.email.toLowerCase().includes('test.com') &&
                !a.email.toLowerCase().includes('example') &&
                !a.name?.toLowerCase().includes('cloud user') &&
                !a.badge?.toLowerCase().includes('linked drive') &&
                a.email.toLowerCase() !== user.email.toLowerCase()
            )
          : [];

        const updated = [
          {
            email: user.email.toLowerCase(),
            name: user.name || user.email.split('@')[0],
            avatar:
              user.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name || user.email
              )}&background=2563eb&color=fff&bold=true`,
            status: 'Signed out',
            lastLogout: Date.now(),
          },
          ...cleaned,
        ].slice(0, 5);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not record logged out account:', err);
      }
    }
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
