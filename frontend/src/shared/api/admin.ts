import { api } from './axios';

export interface TopProducto {
  id: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export interface EvolucionVenta {
  fecha: string;
  pedidos: number;
  ventas: number;
}

export interface DashboardMetrics {
  ingresos_totales: number;
  pedidos_por_estado: Record<string, number>;
  top_productos: TopProducto[];
  evolucion_ventas: EvolucionVenta[];
}

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  created_at: string;
  roles: string[];
}

export interface PaginatedUsuarios {
  items: UsuarioAdmin[];
  total: number;
  page: number;
  limit: number;
}

export interface UsuarioUpdatePayload {
  rol_codigo?: string;
  activo?: boolean;
}

export interface Configuracion {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

const mapBackendUserToFrontend = (user: any): UsuarioAdmin => {
  if (!user) return user;
  return {
    ...user,
    roles: Array.isArray(user.roles) 
      ? user.roles.map((r: any) => typeof r === 'string' ? r : r.codigo)
      : []
  };
};

export const adminApi = {
  getDashboard: async (): Promise<DashboardMetrics> => {
    const response = await api.get<DashboardMetrics>('/admin/dashboard');
    return response.data;
  },

  getUsuarios: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    rol?: string;
    active?: boolean;
  }): Promise<PaginatedUsuarios> => {
    const response = await api.get<any>('/usuarios', { params });
    const rawData = response.data;
    return {
      ...rawData,
      items: (rawData.items || []).map(mapBackendUserToFrontend)
    };
  },

  updateUsuario: async (id: number, data: UsuarioUpdatePayload): Promise<UsuarioAdmin> => {
    const response = await api.put<any>(`/usuarios/${id}`, data);
    return mapBackendUserToFrontend(response.data);
  },

  getConfiguraciones: async (): Promise<Configuracion[]> => {
    const response = await api.get<Configuracion[]>('/admin/configuracion');
    return response.data;
  },

  updateConfiguracion: async (key: string, value: string): Promise<Configuracion> => {
    const response = await api.put<Configuracion>(`/admin/configuracion/${key}`, { value });
    return response.data;
  },
};
export default adminApi;
