import { api } from './axios';
import type { Ingrediente } from '../types';

export const ingredientesApi = {
  getAll: async (params?: { es_alergeno?: boolean; skip?: number; limit?: number }): Promise<Ingrediente[]> => {
    const response = await api.get<Ingrediente[]>('/ingredientes', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Ingrediente> => {
    const response = await api.get<Ingrediente>(`/ingredientes/${id}`);
    return response.data;
  },

  create: async (data: Omit<Ingrediente, 'id'>): Promise<Ingrediente> => {
    const response = await api.post<Ingrediente>('/ingredientes', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Omit<Ingrediente, 'id'>>): Promise<Ingrediente> => {
    const response = await api.put<Ingrediente>(`/ingredientes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/ingredientes/${id}`);
  },
};
