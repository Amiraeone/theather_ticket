import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithOtp: (mobile: string, code: string, name?: string) => Promise<void>;
  loginWithPassword: (mobile: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithOtp: async () => {},
  loginWithPassword: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success && res.authenticated && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        setStoredToken(null);
      }
    } catch (err) {
      setUser(null);
      setStoredToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithOtp = async (mobile: string, code: string, name?: string) => {
    const res = await api.verifyOtp(mobile, code, name);
    if (res.success && res.token) {
      setStoredToken(res.token);
      setUser(res.user);
    }
  };

  const loginWithPassword = async (mobile: string, pass: string) => {
    const res = await api.loginPassword(mobile, pass);
    if (res.success && res.token) {
      setStoredToken(res.token);
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setStoredToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithOtp, loginWithPassword, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
