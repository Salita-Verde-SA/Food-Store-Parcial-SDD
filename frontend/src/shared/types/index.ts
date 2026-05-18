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


