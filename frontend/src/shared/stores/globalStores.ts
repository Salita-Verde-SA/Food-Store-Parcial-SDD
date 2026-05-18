import { create } from 'zustand';

interface PaymentState {
  method: string | null;
  status: 'idle' | 'processing' | 'success' | 'failure';
  setMethod: (method: string) => void;
  setStatus: (status: PaymentState['status']) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  method: null,
  status: 'idle',
  setMethod: (method) => set({ method }),
  setStatus: (status) => set({ status }),
}));


interface UIState {
  isSidebarOpen: bool;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
