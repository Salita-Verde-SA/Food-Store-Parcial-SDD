import { create } from 'zustand';

interface ConfigState {
  costoEnvio: number;
  estadoLocal: 'abierto' | 'cerrado';
  setConfigs: (costo: number, estado: 'abierto' | 'cerrado') => void;
  setCostoEnvio: (costo: number) => void;
  setEstadoLocal: (estado: 'abierto' | 'cerrado') => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  costoEnvio: 150.00, // Valor base inicializado
  estadoLocal: 'abierto', // Valor base inicializado
  setConfigs: (costo, estado) => set({ costoEnvio: costo, estadoLocal: estado }),
  setCostoEnvio: (costo) => set({ costoEnvio: costo }),
  setEstadoLocal: (estado) => set({ estadoLocal: estado }),
}));
