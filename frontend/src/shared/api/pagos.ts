import { api } from './axios';
import type { Pago } from '../types';

export interface CrearPagoResponse {
  id: number;
  pedido_id: number;
  external_reference: string;
  payment_id: string | null;
  status: string;
  monto: number;
  idempotency_key: string;
  preference_id: string; // La ID de preferencia para el SDK de MercadoPago
  created_at: string;
  updated_at: string;
}

export const pagosApi = {
  crearPago: async (pedido_id: number): Promise<CrearPagoResponse> => {
    const response = await api.post<CrearPagoResponse>('/pagos/crear', { pedido_id });
    return response.data;
  },

  consultarPago: async (pedido_id: number): Promise<Pago> => {
    const response = await api.get<Pago>(`/pagos/${pedido_id}`);
    return response.data;
  },

  // Simulación de Webhook para testing en desarrollo local (útil para pruebas ágiles)
  simularWebhook: async (payment_id: string, status: string, external_reference: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>('/pagos/webhook', {
      type: 'payment',
      status,
      external_reference,
      data: {
        id: payment_id
      }
    });
    return response.data;
  }
};
