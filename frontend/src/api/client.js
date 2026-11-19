import axios from 'axios';

// Backend origin, e.g. https://transitops-api.example.com (no trailing slash).
// Set VITE_API_URL in frontend/.env for local dev and as a CI variable for builds.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

const client = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('transitops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('transitops_token');
      localStorage.removeItem('transitops_user');
      // BASE_URL is '/transitops/' — a bare '/login' would leave the app on Pages
      window.location.href = `${import.meta.env.BASE_URL}login`;
    }
    return Promise.reject(err);
  }
);

export default client;
