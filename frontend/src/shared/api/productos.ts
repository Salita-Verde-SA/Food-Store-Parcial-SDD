import { api } from './axios';
import type { Producto, ProductoFiltros } from '../types';

export interface PaginatedProductos {
  items: Producto[];
  total: number;
  skip: number;
  limit: number;
}

export const productosApi = {
  // Catálogo público
  getCatalog: async (filters?: ProductoFiltros): Promise<PaginatedProductos> => {
    const params = {
      skip: filters?.skip ?? 0,
      limit: filters?.limit ?? 12,
      category_id: filters?.category_id || undefined,
      search: filters?.search || undefined,
      excluirAlergenos: filters?.excluirAlergenos || undefined,
    };
    const response = await api.get<PaginatedProductos>('/productos', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Producto> => {
    const response = await api.get<Producto>(`/productos/${id}`);
    return response.data;
  },

  // Panel de administración de stock
  listAdmin: async (params?: { include_deleted?: boolean }): Promise<Producto[]> => {
    const response = await api.get<Producto[]>('/productos/admin/all', { params });
    return response.data;
  },

  getByIdAdmin: async (id: number): Promise<Producto> => {
    const response = await api.get<Producto>(`/productos/${id}/admin`);
    return response.data;
  },

  create: async (
    data: Omit<Producto, 'id' | 'categorias' | 'ingredientes' | 'stock'> & {
      stock: number;
      categoria_ids: number[];
      ingrediente_ids: number[];
    }
  ): Promise<Producto> => {
    const response = await api.post<Producto>('/productos', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<Omit<Producto, 'id' | 'categorias' | 'ingredientes' | 'stock'>> & {
      stock?: number;
      categoria_ids?: number[];
      ingrediente_ids?: number[];
    }
  ): Promise<Producto> => {
    const response = await api.put<Producto>(`/productos/${id}`, data);
    return response.data;
  },

  patchStock: async (id: number, cantidad: number): Promise<Producto> => {
    const response = await api.patch<Producto>(`/productos/${id}/stock`, { cantidad });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/productos/${id}`);
  },
};
