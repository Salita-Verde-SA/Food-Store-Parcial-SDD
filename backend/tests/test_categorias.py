import pytest
from sqlmodel import SQLModel, create_engine
from fastapi import HTTPException

from app.core.uow import UnitOfWork
from app.modules.categorias.model import Categoria
from app.modules.categorias.schemas import CategoriaCreate, CategoriaUpdate
from app.modules.categorias.service import CategoriaService


@pytest.fixture(name="test_db")
def test_db_fixture():
    """
    Fixture que inicializa una base de datos SQLite en memoria aislada para los tests
    y parchea el UnitOfWork para usarla.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    
    # Parcheamos temporalmente el engine de app.core.uow
    import app.core.uow
    original_engine = app.core.uow.engine
    app.core.uow.engine = engine
    
    yield engine
    
    # Restauramos el engine original
    app.core.uow.engine = original_engine


@pytest.mark.anyio
async def test_create_categoria_successfully(test_db):
    """
    Verifica que se puedan crear categorías raíz e hijas correctamente.
    """
    service = CategoriaService()
    
    # 1. Crear categoría raíz
    cat_raiz = await service.create_categoria(
        CategoriaCreate(nombre="Bebidas", descripcion="Todo tipo de bebidas")
    )
    assert cat_raiz.id is not None
    assert cat_raiz.nombre == "Bebidas"
    assert cat_raiz.parent_id is None
    
    # 2. Crear categoría hija
    cat_hija = await service.create_categoria(
        CategoriaCreate(nombre="Gaseosas", parent_id=cat_raiz.id)
    )
    assert cat_hija.id is not None
    assert cat_hija.nombre == "Gaseosas"
    assert cat_hija.parent_id == cat_raiz.id


@pytest.mark.anyio
async def test_prevent_duplicate_names_per_level(test_db):
    """
    Valida la regla de negocio de nombres únicos por nivel jerárquico.
    """
    service = CategoriaService()
    
    # Crear categoría raíz "Bebidas"
    await service.create_categoria(CategoriaCreate(nombre="Bebidas"))
    
    # Intentar crear otra categoría con el mismo nombre en la raíz
    with pytest.raises(HTTPException) as exc:
        await service.create_categoria(CategoriaCreate(nombre="Bebidas"))
    assert exc.value.status_code == 400
    assert "Ya existe una categoría con este nombre" in exc.value.detail


@pytest.mark.anyio
async def test_cycle_prevention(test_db):
    """
    Prueba que el sistema bloquee activamente dependencias circulares.
    """
    service = CategoriaService()
    
    # 1. Crear Categoría A
    cat_a = await service.create_categoria(CategoriaCreate(nombre="A"))
    # 2. Crear Categoría B hija de A
    cat_b = await service.create_categoria(CategoriaCreate(nombre="B", parent_id=cat_a.id))
    # 3. Crear Categoría C hija de B
    cat_c = await service.create_categoria(CategoriaCreate(nombre="C", parent_id=cat_b.id))
    
    # 4. Intentar asignar C como padre de A (A -> B -> C -> A)
    with pytest.raises(HTTPException) as exc:
        await service.update_categoria(
            cat_a.id,
            CategoriaUpdate(parent_id=cat_c.id)
        )
    assert exc.value.status_code == 400
    assert "dependencia circular" in exc.value.detail


@pytest.mark.anyio
async def test_soft_delete_and_detach_children(test_db):
    """
    Prueba que el soft delete desvincule a las hijas directas colocándolas como raíz.
    """
    service = CategoriaService()
    
    # 1. Crear A y B (B es hija de A)
    cat_a = await service.create_categoria(CategoriaCreate(nombre="A"))
    cat_b = await service.create_categoria(CategoriaCreate(nombre="B", parent_id=cat_a.id))
    
    # 2. Eliminar lógicamente A
    await service.delete_categoria(cat_a.id)
    
    # 3. Verificar en base de datos
    async with UnitOfWork() as uow:
        # A debe estar marcada como eliminada
        a_db = uow.session.get(Categoria, cat_a.id)
        assert a_db.deleted_at is not None
        
        # B debe seguir activa pero con parent_id = None
        b_db = uow.session.get(Categoria, cat_b.id)
        assert b_db.parent_id is None
        assert b_db.deleted_at is None
