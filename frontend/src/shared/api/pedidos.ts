import { api } from './axios';
import type { Pedido, EstadoPedido } from '../types';

export interface CrearPedidoRequest {
  items: {
    producto_id: number;
    amount?: number;
    cantidad: number;
    personalizacion?: number[] | null; // IDs de ingredientes excluidos
  }[];
  forma_pago_codigo: string;
  direccion_id?: number | null;
  notas?: string | null;
}

export interface AvanzarEstadoRequest {
  nuevo_estado: EstadoPedido;
  motivo?: string;
}

const mapBackendPedidoToFrontend = (ped: any): Pedido => {
  if (!ped) return ped;
  return {
    id: ped.id,
    usuario_id: ped.usuario_id,
    fecha_pedido: ped.created_at,
    estado: ped.estado_codigo,
    tipo_entrega: ped.direccion_id ? 'DELIVERY' : 'TAKE_AWAY',
    direccion_snapshot: ped.direccion_snapshot,
    costo_envio: Number(ped.costo_envio || 0),
    total: Number(ped.total || 0),
    detalles: (ped.items || []).map((d: any) => ({
      id: d.id,
      pedido_id: ped.id,
      producto_id: d.producto_id,
      producto_nombre: d.nombre_snapshot,
      cantidad: d.cantidad,
      precio_unitario: Number(d.precio_snapshot || 0),
      subtotal: Number(d.precio_snapshot || 0) * d.cantidad,
      personalizacion: d.personalizacion ? d.personalizacion.join(',') : null
    })),
    historial: (ped.historial || []).map((h: any) => ({
      id: h.id,
      pedido_id: ped.id,
      estado_origen: h.estado_desde || 'CREADO',
      estado_destino: h.estado_hasta,
      fecha_change: h.created_at,
      fecha_cambio: h.created_at,
      motivo: h.motivo,
      operador_id: h.usuario_id || 0,
      operador_email: h.usuario_id === ped.usuario_id ? 'Cliente' : 'Operador/Sistema'
    })),
    pago: ped.pago ? {
      id: ped.pago.id,
      pedido_id: ped.id,
      external_reference: ped.pago.external_reference,
      payment_id: ped.pago.mp_payment_id ? String(ped.pago.mp_payment_id) : null,
      status: ped.pago.mp_status,
      monto: Number(ped.total || 0),
      idempotency_key: ped.pago.idempotency_key,
      preference_id: ped.pago.preference_id,
      created_at: ped.pago.created_at,
      updated_at: ped.pago.created_at
    } : null
  };
};

export const pedidosApi = {
  getPedidos: async (): Promise<any> => {
    const response = await api.get<any>('/pedidos');
    const rawData = response.data;
    if (Array.isArray(rawData)) {
      return rawData.map(mapBackendPedidoToFrontend);
    }
    if (rawData && Array.isArray(rawData.items)) {
      return {
        ...rawData,
        items: rawData.items.map(mapBackendPedidoToFrontend)
      };
    }
    return rawData;
  },

  getPedido: async (id: number): Promise<Pedido> => {
    const response = await api.get<any>(`/pedidos/${id}`);
    return mapBackendPedidoToFrontend(response.data);
  },

  crearPedido: async (pedido: CrearPedidoRequest): Promise<Pedido> => {
    const response = await api.post<any>('/pedidos', pedido);
    return mapBackendPedidoToFrontend(response.data);
  },

  avanzarEstado: async (id: number, data: AvanzarEstadoRequest): Promise<Pedido> => {
    const response = await api.post<any>(`/pedidos/${id}/avanzar`, data);
    return mapBackendPedidoToFrontend(response.data);
  },

  cancelarPedido: async (id: number, motivo: string): Promise<Pedido> => {
    const response = await api.delete<any>(`/pedidos/${id}`, {
      data: { motivo },
    });
    return mapBackendPedidoToFrontend(response.data);
  },
};
