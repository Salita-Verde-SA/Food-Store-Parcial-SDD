from typing import List, Dict, Any
from sqlmodel import Session, text
from app.core.repository import BaseRepository
from app.modules.categorias.model import Categoria


class CategoriaRepository(BaseRepository[Categoria]):
    def __init__(self, session: Session):
        super().__init__(Categoria, session)

    def get_hierarchical_tree(self) -> List[Dict[str, Any]]:
        """
        Retorna la jerarquía plana de categorías obtenida mediante una consulta recursiva CTE.
        Excluye categorías con deleted_at != NULL.
        """
        # Consulta recursiva estándar compatible con SQLite y PostgreSQL
        # cc.nivel < 10 previene bucles infinitos en base de datos si ocurre una corrupción manual
        query = text("""
            WITH RECURSIVE cte_categorias AS (
                -- Miembro ancla: categorías raíz
                SELECT id, nombre, descripcion, parent_id, deleted_at, 0 AS nivel
                FROM categoria
                WHERE parent_id IS NULL AND deleted_at IS NULL
                
                UNION ALL
                
                -- Miembro recursivo: subcategorías
                SELECT c.id, c.nombre, c.descripcion, c.parent_id, c.deleted_at, cc.nivel + 1
                FROM categoria c
                INNER JOIN cte_categorias cc ON c.parent_id = cc.id
                WHERE c.deleted_at IS NULL AND cc.nivel < 10
            )
            SELECT id, nombre, descripcion, parent_id, nivel 
            FROM cte_categorias 
            ORDER BY nivel, parent_id, nombre;
        """)

        result = self.session.execute(query)
        
        # Mapeamos posicionalmente a diccionarios para máxima robustez ante cualquier driver/BD
        categorias_flat = []
        for row in result:
            categorias_flat.append({
                "id": row[0],
                "nombre": row[1],
                "descripcion": row[2],
                "parent_id": row[3],
                "nivel": row[4]
            })
            
        return categorias_flat
