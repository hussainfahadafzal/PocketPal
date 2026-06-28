import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const AuthContext = createContext(null);

// Session data — wiped on logout and at the start of every login/register.
const SESSION_KEYS = ['token', 'user'];
const SS_KEYS = ['pocketpal_lastStreak'];

// Device preferences — survive logout (they belong to the device, not the account).
const REMEMBER_ME_KEY = 'pocketpal_rememberMe';
const SAVED_EMAIL_KEY = 'pocketpal_savedEmail';

function _isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // malformed token → treat as expired
  }
}

// Token may be in localStorage (remember-me on) or sessionStorage (remember-me off).
function _getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token');
}

// Returns whichever storage is currently holding the token.
function _getTokenStorage() {
  return localStorage.getItem('token') ? localStorage : sessionStorage;
}

function _readStoredUser() {
  try {
    const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _getInitialUser() {
  const token = _getToken();
  if (!token || _isTokenExpired(token)) return null;
  const cachedUser = _readStoredUser();
  return cachedUser ?? { id: 'cached', name: '', email: '' };
}

function _writeStoredUser(user, storage = localStorage) {
  if (user) {
    storage.setItem('user', JSON.stringify(user));
  } else {
    storage.removeItem('user');
  }
}

/**
 * Wipe every piece of per-user state so the next account starts completely
 * empty — React user object, JWT, and all sessionStorage keys this app writes.
 * Device preferences (remember-me choice, saved email) are intentionally kept.
 */
function _clearSession(setUser) {
  SESSION_KEYS.forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  SS_KEYS.forEach((k) => sessionStorage.removeItem(k));
  setUser(null);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => _getInitialUser());
  const [loading, setLoading] = useState(true);
  const [hasStoredSession, setHasStoredSession] = useState(() => {
    const token = _getToken();
    return Boolean(token && !_isTokenExpired(token));
  });
  const navigate = useNavigate();

  // Rehydrate session from the stored token on first load.
  useEffect(() => {
    const token = _getToken();

    if (!token || _isTokenExpired(token)) {
      _clearSession(setUser);
      setHasStoredSession(false);
      setLoading(false);
      return;
    }

    const cachedUser = _readStoredUser();
    setUser(cachedUser ?? { id: 'cached', name: '', email: '' });
    setHasStoredSession(true);
    setLoading(false);

    client
      .get('/auth/me')
      .then((res) => {
        const nextUser = res.data;
        _writeStoredUser(nextUser, _getTokenStorage());
        setUser(nextUser);
      })
      .catch((err) => {
        // 401: the axios interceptor already cleared storage and dispatched
        // auth:logout — the event listener below handles state + redirect.
        // For network/500 errors, keep the cached user so the app works offline.
        if (err.response?.status !== 401 && cachedUser) {
          setUser(cachedUser);
        }
      });
  }, []);

  // Handle 401s from any API call (dispatched by the axios response interceptor).
  useEffect(() => {
    const handleAuthLogout = () => {
      _clearSession(setUser);
      setHasStoredSession(false);
      navigate('/login');
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [navigate]);

  // After a successful auth, check whether the wallet is configured and route accordingly.
  const redirectAfterAuth = async () => {
    try {
      await client.get('/wallet');
      navigate('/dashboard');
    } catch (err) {
      navigate(err.response?.status === 404 ? '/onboarding' : '/dashboard');
    }
  };

  // rememberMe=true  → token in localStorage (survives app close, 7-day expiry)
  // rememberMe=false → token in sessionStorage (cleared when tab/app fully closes)
  const login = async (email, password, rememberMe = true) => {
    _clearSession(setUser);
    const res = await client.post('/auth/login', { email, password });

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', res.data.access_token);

    // Save device preferences — these are not session data so they survive logout.
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0');
    if (rememberMe) {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    const me = await client.get('/auth/me');
    const nextUser = me.data;
    _writeStoredUser(nextUser, storage);
    setUser(nextUser);
    await redirectAfterAuth();
  };

  const register = async (name, email, password) => {
    _clearSession(setUser);
    await client.post('/auth/register', { name, email, password });
    // Fresh account — wallet can't exist yet, go straight to onboarding.
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    const me = await client.get('/auth/me');
    const nextUser = me.data;
    _writeStoredUser(nextUser, localStorage);
    setUser(nextUser);
    navigate('/onboarding');
  };

  const logout = useCallback(() => {
    _clearSession(setUser);
    setHasStoredSession(false);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, hasStoredSession, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Exported so Login.jsx can read device preferences without importing storage keys directly.
export { REMEMBER_ME_KEY, SAVED_EMAIL_KEY };
