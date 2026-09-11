import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token and prevent stale browser caching
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If uploading FormData, delete Content-Type so browser dynamically sets multipart/form-data with correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // Prevent browser 304 caching of dynamic storage statistics
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthRoute =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/signup') ||
        requestUrl.includes('/auth/google') ||
        requestUrl.includes('/auth/verify-signup-otp');

      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
