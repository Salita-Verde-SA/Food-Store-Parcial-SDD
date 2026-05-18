import { api } from './axios';
import type { DireccionEntrega, DireccionEntregaCreate } from '../types';

export const direccionesApi = {
  getDirecciones: async (): Promise<DireccionEntrega[]> => {
    const response = await api.get<DireccionEntrega[]>('/direcciones');
    return response.data;
  },

  crearDireccion: async (direccion: DireccionEntregaCreate): Promise<DireccionEntrega> => {
    const response = await api.post<DireccionEntrega>('/direcciones', direccion);
    return response.data;
  },

  actualizarDireccion: async (id: number, direccion: Partial<DireccionEntregaCreate>): Promise<DireccionEntrega> => {
    const response = await api.put<DireccionEntrega>(`/direcciones/${id}`, direccion);
    return response.data;
  },

  eliminarDireccion: async (id: number): Promise<void> => {
    await api.delete(`/direcciones/${id}`);
  },

  establecerPrincipal: async (id: number): Promise<DireccionEntrega> => {
    const response = await api.patch<DireccionEntrega>(`/direcciones/${id}/principal`);
    return response.data;
  },
};
