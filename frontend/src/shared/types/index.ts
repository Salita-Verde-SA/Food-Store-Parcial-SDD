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
