import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const extractErrorMessage = (err: any): string => {
  if (!err) return 'Ocurrió un error inesperado';
  if (typeof err === 'string') return err;
  
  if (err.detail) {
    if (typeof err.detail === 'string') {
      return err.detail;
    }
    if (Array.isArray(err.detail)) {
      // Mapear errores de validación de Pydantic [ { loc: ["body", "ciudad"], msg: "..." } ]
      return err.detail
        .map((e: any) => {
          const field = e.loc ? e.loc[e.loc.length - 1] : '';
          return `${field ? `Campo "${field}": ` : ''}${e.msg}`;
        })
        .join(', ');
    }
    if (typeof err.detail === 'object') {
      return JSON.stringify(err.detail);
    }
  }

  if (err.message && typeof err.message === 'string') {
    return err.message;
  }

  return 'Error al procesar la solicitud';
};

// Interceptor para adjuntar token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores globales (RFC 7807) y Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es un 401 y no hemos reintentado ya
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          // Llamada al endpoint de refresh
          const response = await axios.post(`${API_URL}/auth/refresh?refresh_token=${refreshToken}`);
          const { access_token } = response.data;

          // Actualizar store
          useAuthStore.getState().setAccessToken(access_token);

          // Reintentar petición original con nuevo token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Si el refresh falla, desloguear
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);
