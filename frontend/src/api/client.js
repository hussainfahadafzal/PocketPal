import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the stored JWT to every outgoing request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 (expired/invalid token), clear ALL per-user state then hard-redirect.
// Skip auth endpoints — a 401 there means wrong password, not a session expiry.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      // sessionStorage survives window.location.href redirects in the same tab,
      // so we must clear it explicitly here too.
      sessionStorage.removeItem('pocketpal_lastStreak');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
