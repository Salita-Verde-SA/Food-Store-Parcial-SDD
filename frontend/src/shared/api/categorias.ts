import { api } from './axios';
import type { Categoria, CategoriaTree } from '../types';

export const categoriasApi = {
  getTree: async (): Promise<CategoriaTree[]> => {
    const response = await api.get<CategoriaTree[]>('/categorias');
    return response.data;
  },

  create: async (data: Omit<Categoria, 'id'>): Promise<Categoria> => {
    const response = await api.post<Categoria>('/categorias', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Omit<Categoria, 'id'>>): Promise<Categoria> => {
    const response = await api.put<Categoria>(`/categorias/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categorias/${id}`);
  },
};
