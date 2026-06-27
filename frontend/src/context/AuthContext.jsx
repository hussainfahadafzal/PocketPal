import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const AuthContext = createContext(null);

// Keys that must be wiped between users.
const LS_KEYS = ['token', 'user'];
const SS_KEYS = ['pocketpal_lastStreak'];

function _readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _writeStoredUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

/**
 * Wipe every piece of per-user state so the next account starts completely
 * empty — React user object, JWT, and all sessionStorage keys this app writes.
 * Called at the START of login/register (before any API calls) and in logout.
 */
function _clearSession(setUser) {
  LS_KEYS.forEach((k) => localStorage.removeItem(k));
  SS_KEYS.forEach((k) => sessionStorage.removeItem(k));
  setUser(null);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => _readStoredUser());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Rehydrate session from the stored token on first load.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = _readStoredUser();

    if (!token) {
      setLoading(false);
      return;
    }

    if (cachedUser) {
      setUser(cachedUser);
    }

    client
      .get('/auth/me')
      .then((res) => {
        const nextUser = res.data;
        _writeStoredUser(nextUser);
        setUser(nextUser);
      })
      .catch((err) => {
        // Only purge on a real 401 (expired/invalid token).
        // Network issues should not force a logout when a valid cached session exists.
        if (err.response?.status === 401) {
          _clearSession(setUser);
        } else if (cachedUser) {
          setUser(cachedUser);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // After a successful auth, check whether the wallet is configured and route accordingly
  const redirectAfterAuth = async () => {
    try {
      await client.get('/wallet');
      navigate('/dashboard');
    } catch (err) {
      navigate(err.response?.status === 404 ? '/onboarding' : '/dashboard');
    }
  };

  const login = async (email, password) => {
    // Wipe any existing session BEFORE the first API call so no old token
    // is attached to the login request and React state is immediately clean.
    _clearSession(setUser);
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    const me = await client.get('/auth/me');
    const nextUser = me.data;
    _writeStoredUser(nextUser);
    setUser(nextUser);
    await redirectAfterAuth();
  };

  const register = async (name, email, password) => {
    // Same: clear any previous session before touching auth endpoints.
    _clearSession(setUser);
    await client.post('/auth/register', { name, email, password });
    // Fresh account — wallet can't exist yet, go straight to onboarding
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    const me = await client.get('/auth/me');
    const nextUser = me.data;
    _writeStoredUser(nextUser);
    setUser(nextUser);
    navigate('/onboarding');
  };

  const logout = useCallback(() => {
    _clearSession(setUser);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
