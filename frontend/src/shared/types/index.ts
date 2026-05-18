export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string | null;
  parent_id?: number | null;
}

export interface CategoriaTree {
  id: number;
  nombre: string;
  descripcion?: string | null;
  parent_id?: number | null;
  nivel: number;
  children: CategoriaTree[];
}

export interface Ingrediente {
  id: number;
  nombre: string;
  es_alergeno: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  disponible: boolean;
  imagen_url?: string | null;
  categorias: Categoria[];
  ingredientes: Ingrediente[];
  stock?: number; // Opcional, expuesto solo en vistas de administración
}

export interface ProductoFiltros {
  category_id?: number | null;
  search?: string;
  excluirAlergenos?: string; // IDs de ingredientes separados por comas
  skip?: number;
  limit?: number;
}

export interface CartItem {
  cart_item_key: string; // Clave única compuesta: producto_id-[exclusiones ordenadas]
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string | null;
  exclusiones: number[]; // Array de IDs de ingredientes excluidos
  exclusiones_nombres: string[]; // Nombres de los ingredientes excluidos para renderizado offline
}

export interface CartStore {
  items: CartItem[];
  addItem: (producto: Producto, cantidad: number, exclusiones: number[], exclusiones_nombres: string[]) => void;
  updateQuantity: (cartItemKey: string, cantidad: number) => void;
  removeItem: (cartItemKey: string) => void;
  clearCart: () => void;
  // Selectores y computados derivados
  getSubtotal: (item: CartItem) => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}


// ==================== DIRECCIONES DE ENTREGA ====================
export interface DireccionEntrega {
  id: number;
  usuario_id: number;
  alias: string;
  calle: string;
  numero: string;
  piso_depto?: string | null;
  ciudad: string;
  codigo_postal: string;
  es_principal: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DireccionEntregaCreate {
  alias: string;
  calle: string;
  numero: string;
  piso_depto?: string | null;
  ciudad: string;
  codigo_postal: string;
  es_principal: boolean;
}

// ==================== PEDIDOS Y PAGOS ====================
export interface DetallePedido {
  id: number;
  pedido_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  personalizacion?: string | null; // IDs de ingredientes excluidos separados por comas
}

export interface HistorialEstadoPedido {
  id: number;
  pedido_id: number;
  estado_origen: string;
  estado_destino: string;
  fecha_cambio: string;
  motivo?: string | null;
  operador_id: number;
  operador_email?: string | null;
}

export interface Pago {
  id: number;
  pedido_id: number;
  external_reference: string;
  payment_id?: string | null;
  status: string;
  monto: number;
  idempotency_key: string;
  preference_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'EN_PREP' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
export type TipoEntrega = 'DELIVERY' | 'TAKE_AWAY';

export interface Pedido {
  id: number;
  usuario_id: number;
  fecha_pedido: string;
  estado: EstadoPedido;
  tipo_entrega: TipoEntrega;
  direccion_snapshot?: string | null;
  costo_envio: number;
  total: number;
  detalles: DetallePedido[];
  historial?: HistorialEstadoPedido[];
  pago?: Pago | null;
}



