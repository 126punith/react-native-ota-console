import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (email, password) => 
    api.post('/auth/register', { email, password })
};

// APK API
export const apkAPI = {
  upload: (formData) => 
    api.post('/apks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  
  list: (appId) => 
    api.get('/apks', { params: { appId } }),
  
  get: (id) => 
    api.get(`/apks/${id}`),
  
  download: (id) => 
    api.get(`/apks/${id}/download`, { responseType: 'blob' }),
  
  delete: (id, deleteFiles = false) => 
    api.delete(`/apks/${id}`, { params: { deleteFiles } })
};

export default api;

