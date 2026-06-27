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

// Keep the current session intact unless the auth check itself says the token is invalid.
// This prevents transient API failures from unintentionally logging users out.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('pocketpal_lastStreak');
    }
    return Promise.reject(error);
  }
);

export default client;
