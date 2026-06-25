import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Rehydrate session from the stored token on first load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
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
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    const me = await client.get('/auth/me');
    setUser(me.data);
    await redirectAfterAuth();
  };

  const register = async (name, email, password) => {
    await client.post('/auth/register', { name, email, password });
    // Fresh account — wallet can't exist yet, go straight to onboarding
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    const me = await client.get('/auth/me');
    setUser(me.data);
    navigate('/onboarding');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
