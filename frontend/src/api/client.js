import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the stored JWT to every outgoing request.
// Token may be in localStorage (remember-me) or sessionStorage (session-only).
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') ?? sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clear the session only on a real 401 (expired/invalid token).
// Network errors, 500s, etc. must NOT log the user out.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      ['token', 'user'].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      // Notify AuthContext to reset React state and redirect to /login.
      // Using a custom event avoids a circular import between client.js and AuthContext.
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default client;
