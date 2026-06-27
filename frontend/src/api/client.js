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

// Keep the current session intact unless the user explicitly logs out.
// Transient auth or network issues should not clear the saved session.
client.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default client;
