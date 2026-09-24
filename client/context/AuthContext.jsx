import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadSession = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/users/profile');
      // Merge any locally-stored avatar (client-side upload) into the user
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      let localUser = null;
      try { localUser = stored ? JSON.parse(stored) : null; } catch (e) { localUser = null; }
      const merged = { ...data.data.user, ...(localUser && localUser.avatarUrl ? { avatarUrl: localUser.avatarUrl } : {}) };
      setUser(merged);
      // persist merged user locally so avatar survives reloads
      localStorage.setItem('user', JSON.stringify(merged));
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let localUser = null;
    try { localUser = stored ? JSON.parse(stored) : null; } catch (e) { localUser = null; }
    const merged = { ...data.data.user, ...(localUser && localUser.avatarUrl ? { avatarUrl: localUser.avatarUrl } : {}) };
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
    toast.success(`Welcome back, ${data.data.user.fullName.split(' ')[0]}!`);
    router.push(data.data.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    return data.data.user;
  };

  const register = async (payload) => {
    // NOTE: signup no longer auto-logs in — the account must be verified first.
    const { data } = await api.post('/auth/register', payload);
    toast.success(data?.message || 'Account created! Check your email for the verification code.');
    router.push(`/verify-email?email=${encodeURIComponent(data?.data?.email || payload.email || '')}`);
    return data?.data;
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let localUser = null;
    try { localUser = stored ? JSON.parse(stored) : null; } catch (e) { localUser = null; }
    const merged = { ...data.data.user, ...(localUser && localUser.avatarUrl ? { avatarUrl: localUser.avatarUrl } : {}) };
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
    toast.success(data?.message || 'Email verified — welcome!');
    router.push(merged.role === 'ADMIN' ? '/admin' : '/dashboard');
    return merged;
  };

  const resendVerification = async (email) => {
    const { data } = await api.post('/auth/resend-verification', { email });
    toast.success(data?.message || 'Verification code sent — check your email');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // also remove any persisted avatar
    localStorage.removeItem('avatar');
    setUser(null);
    toast.success('Logged out');
    router.push('/login');
  };

  const refreshUser = async () => {
    const { data } = await api.get('/users/profile');
    // preserve any locally stored avatar
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let localUser = null;
    try { localUser = stored ? JSON.parse(stored) : null; } catch (e) { localUser = null; }
    const merged = { ...data.data.user, ...(localUser && localUser.avatarUrl ? { avatarUrl: localUser.avatarUrl } : {}) };
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
  };

  // Client-side avatar handling (stores image data URL locally)
  const setAvatar = (dataUrl) => {
    if (!dataUrl) return;
    // persist to server so avatar is available across devices
    (async () => {
      try {
        const { data } = await api.put('/users/profile', { avatarDataUrl: dataUrl });
        const updated = { ...(data.data.user || {}), avatarUrl: data.data.user.avatarUrl };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (err) {
        // fallback to local-only avatar
        const updated = { ...(user || {}), avatarUrl: dataUrl };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    })();
  };

  const removeAvatar = () => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.put('/users/profile', { avatarAction: 'remove' });
        const updated = { ...(data.data.user || {}) };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (err) {
        const updated = { ...user };
        delete updated.avatarUrl;
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    })();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, resendVerification, logout, refreshUser, setUser, setAvatar, removeAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
