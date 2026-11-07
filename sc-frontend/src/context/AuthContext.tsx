import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { BrotherProfile } from '../types';

interface AuthContextType {
  user: BrotherProfile | null;
  loading: boolean;
  token: string | null;
  loginWithDiscord: () => void;
  devLogin: (roleOrHandle: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<BrotherProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<BrotherProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ancalagon_token'));
  const [loading, setLoading] = useState(true);

  // Set default axios baseURL and credentials
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || '/api';
  axios.defaults.withCredentials = true;

  // Interceptor to always attach token if available
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const storedToken = localStorage.getItem('ancalagon_token');
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Check URL token upon redirect from Discord OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('ancalagon_token', urlToken);
      setToken(urlToken);
      // Clean query parameter from URL cleanly without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('ancalagon_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Error fetching current user:', err);
      // If token is invalid or expired
      localStorage.removeItem('ancalagon_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const loginWithDiscord = () => {
    window.location.href = '/api/auth/discord';
  };

  const devLogin = async (role: string) => {
    setLoading(true);
    try {
      const res = await axios.post('/auth/dev-login', { role });
      if (res.data.token) {
        localStorage.setItem('ancalagon_token', res.data.token);
        setToken(res.data.token);
        await refreshUser();
      }
    } catch (err) {
      console.error('Dev login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch {
      // Continue cleanup anyway
    }
    localStorage.removeItem('ancalagon_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<BrotherProfile>) => {
    await axios.patch('/auth/me', data);
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        loginWithDiscord,
        devLogin,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
