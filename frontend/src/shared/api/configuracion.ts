import { api } from './axios';

export interface ConfiguracionPublica {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export const configuracionApi = {
  getPublicConfiguraciones: async (): Promise<ConfiguracionPublica[]> => {
    const response = await api.get<ConfiguracionPublica[]>('/configuracion');
    return response.data;
  },
};

export default configuracionApi;
