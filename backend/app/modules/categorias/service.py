from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlmodel import select

from app.core.uow import UnitOfWork
from app.modules.categorias.model import Categoria
from app.modules.categorias.schemas import CategoriaCreate, CategoriaUpdate


class CategoriaService:
    def __init__(self):
        pass

    async def get_tree(self) -> List[Dict[str, Any]]:
        """
        Obtiene el árbol jerárquico de categorías anidado completo.
        """
        async with UnitOfWork() as uow:
            flat_list = uow.categorias.get_hierarchical_tree()
            
            # Algoritmo de mapeo a árbol anidado O(N)
            nodes = {item["id"]: {**item, "children": []} for item in flat_list}
            tree = []
            
            for node_id, node in nodes.items():
                parent_id = node["parent_id"]
                if parent_id is None:
                    tree.append(node)
                else:
                    parent = nodes.get(parent_id)
                    if parent:
                        parent["children"].append(node)
                    else:
                        # Fallback en caso de que el padre no esté en la query (ej: eliminado)
                        tree.append(node)
            return tree

    async def create_categoria(self, data: CategoriaCreate) -> Categoria:
        """
        Crea una nueva categoría validando parent_id y unicidad de nombre.
        """
        async with UnitOfWork() as uow:
            # 1. Validar que la categoría padre exista y no esté eliminada
            if data.parent_id is not None:
                parent = uow.session.get(Categoria, data.parent_id)
                if not parent or parent.deleted_at is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="La categoría padre especificada no existe o está eliminada"
                    )

            # 2. Validar unicidad del nombre en el mismo nivel jerárquico (excluyendo eliminados)
            statement = select(Categoria).where(
                Categoria.nombre == data.nombre,
                Categoria.parent_id == data.parent_id,
                Categoria.deleted_at == None
            )
            existing = uow.session.exec(statement).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe una categoría con este nombre en este nivel jerárquico"
                )

            # 3. Crear y guardar
            nueva_cat = Categoria(
                nombre=data.nombre,
                descripcion=data.descripcion,
                parent_id=data.parent_id
            )
            created = uow.categorias.create(nueva_cat)
            return created

    async def update_categoria(self, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        """
        Actualiza una categoría existente validando ciclos, unicidad e integridad jerárquica.
        """
        async with UnitOfWork() as uow:
            # 1. Obtener categoría
            categoria = uow.session.get(Categoria, categoria_id)
            if not categoria or categoria.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Categoría no encontrada"
                )

            # 2. Validar parent_id modificado
            if data.parent_id is not None and data.parent_id != categoria.parent_id:
                # Prevenir autoreferencia directa
                if data.parent_id == categoria_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Una categoría no puede ser su propio padre"
                    )

                # Validar existencia del nuevo padre
                new_parent = uow.session.get(Categoria, data.parent_id)
                if not new_parent or new_parent.deleted_at is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="La categoría padre especificada no existe o está eliminada"
                    )

                # Validar prevención de ciclos en ancestros
                if self._check_cycle(uow.session, categoria_id, data.parent_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Operación inválida: se detectó una dependencia circular en la jerarquía"
                    )

                categoria.parent_id = data.parent_id
            elif data.parent_id is None and "parent_id" in data.model_fields_set:
                categoria.parent_id = None

            # 3. Validar nuevo nombre (si se modifica)
            nombre_a_validar = data.nombre if data.nombre is not None else categoria.nombre
            parent_id_a_validar = categoria.parent_id

            if data.nombre is not None or "parent_id" in data.model_fields_set:
                statement = select(Categoria).where(
                    Categoria.nombre == nombre_a_validar,
                    Categoria.parent_id == parent_id_a_validar,
                    Categoria.id != categoria_id,
                    Categoria.deleted_at == None
                )
                existing = uow.session.exec(statement).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ya existe una categoría con este nombre en este nivel jerárquico"
                    )

            if data.nombre is not None:
                categoria.nombre = data.nombre
            if data.descripcion is not None:
                categoria.descripcion = data.descripcion

            updated = uow.categorias.update(categoria)
            return updated

    async def delete_categoria(self, categoria_id: int) -> None:
        """
        Aplica soft delete desasociando subcategorías hijas y comprobando integridad de productos.
        """
        async with UnitOfWork() as uow:
            # 1. Obtener categoría
            categoria = uow.session.get(Categoria, categoria_id)
            if not categoria or categoria.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Categoría no encontrada"
                )

            # 2. Validar integridad de productos (RN-CA03)
            from app.modules.productos.model import Producto, ProductoCategoria
            statement_prod = select(Producto).join(ProductoCategoria).where(
                ProductoCategoria.categoria_id == categoria_id,
                Producto.deleted_at == None
            )
            product_using_it = uow.session.exec(statement_prod).first()
            if product_using_it:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede eliminar la categoría porque está asociada al producto activo '{product_using_it.nombre}'"
                )

            # 3. Desasociar categorías hijas directas (parent_id = NULL)
            statement_children = select(Categoria).where(
                Categoria.parent_id == categoria_id,
                Categoria.deleted_at == None
            )
            children = uow.session.exec(statement_children).all()
            for child in children:
                child.parent_id = None
                uow.categorias.update(child)

            # 4. Soft delete
            uow.categorias.delete(categoria, soft=True)

    def _check_cycle(self, session, categoria_id: int, new_parent_id: int) -> bool:
        """
        Algoritmo iterativo de ancestros. Retorna True si detecta un ciclo jerárquico.
        """
        current_parent_id = new_parent_id
        depth = 0
        while current_parent_id is not None:
            depth += 1
            if depth > 10:  # Límite de seguridad
                return True
            parent = session.get(Categoria, current_parent_id)
            if not parent or parent.deleted_at is not None:
                break
            if parent.parent_id == categoria_id:
                return True
            current_parent_id = parent.parent_id
        return False
