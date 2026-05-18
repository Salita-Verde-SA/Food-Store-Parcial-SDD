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

