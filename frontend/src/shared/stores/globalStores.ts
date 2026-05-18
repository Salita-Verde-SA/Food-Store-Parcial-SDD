import { create } from 'zustand';

interface PaymentState {
  method: string | null;
  status: 'idle' | 'processing' | 'success' | 'failure';
  mpPaymentId: string | null;
  setMethod: (method: string | null) => void;
  setStatus: (status: PaymentState['status']) => void;
  setMpPaymentId: (id: string | null) => void;
  resetPayment: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  method: null,
  status: 'idle',
  mpPaymentId: null,
  setMethod: (method) => set({ method }),
  setStatus: (status) => set({ status }),
  setMpPaymentId: (id) => set({ mpPaymentId: id }),
  resetPayment: () => set({ method: null, status: 'idle', mpPaymentId: null }),
}));


interface UIState {
  isSidebarOpen: boolean;
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

