import pytest
from sqlmodel import SQLModel, create_engine
from fastapi import HTTPException
from decimal import Decimal

from app.core.uow import UnitOfWork
from app.modules.categorias.model import Categoria
from app.modules.categorias.schemas import CategoriaCreate
from app.modules.categorias.service import CategoriaService
from app.modules.ingredientes.model import Ingrediente
from app.modules.ingredientes.schemas import IngredienteCreate
from app.modules.ingredientes.service import IngredienteService
from app.modules.productos.model import Producto
from app.modules.productos.schemas import ProductoCreate, ProductoUpdate
from app.modules.productos.service import ProductoService


@pytest.fixture(name="test_db")
def test_db_fixture():
    """
    Inicializa base de datos SQLite en memoria para aislar la suite de tests
    y parchea el UnitOfWork para usarla.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    
    import app.core.uow
    original_engine = app.core.uow.engine
    app.core.uow.engine = engine
    
    yield engine
    
    app.core.uow.engine = original_engine


@pytest.mark.anyio
async def test_create_ingrediente_successfully(test_db):
    """
    Verifica la creación exitosa de un ingrediente y sus validaciones.
    """
    service = IngredienteService()
    ing = await service.create_ingrediente(
        IngredienteCreate(nombre="Harina de Trigo", es_alergeno=True)
    )
    assert ing.id is not None
    assert ing.nombre == "Harina de Trigo"
    assert ing.es_alergeno is True


@pytest.mark.anyio
async def test_prevent_duplicate_ingrediente_names(test_db):
    """
    Prueba que el servicio rechace ingredientes con nombres idénticos.
    """
    service = IngredienteService()
    await service.create_ingrediente(IngredienteCreate(nombre="Queso"))
    
    with pytest.raises(HTTPException) as exc:
        await service.create_ingrediente(IngredienteCreate(nombre="Queso"))
    assert exc.value.status_code == 400
    assert "Ya existe un ingrediente activo" in exc.value.detail


@pytest.mark.anyio
async def test_delete_ingrediente_integrity_check(test_db):
    """
    Valida que no se pueda eliminar un ingrediente que está asignado a un producto activo.
    """
    cat_service = CategoriaService()
    ing_service = IngredienteService()
    prod_service = ProductoService()
    
    # 1. Crear prerrequisitos
    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Pizzas"))
    ing = await ing_service.create_ingrediente(IngredienteCreate(nombre="Mozzarella", es_alergeno=True))
    
    # 2. Crear producto asociado
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Pizza Margherita",
            precio=Decimal("1200.00"),
            stock=10,
            categoria_ids=[cat.id],
            ingrediente_ids=[ing.id]
        )
    )
    
    # 3. Intentar borrar ingrediente mozarella (debe fallar por integridad de alérgenos/receta)
    with pytest.raises(HTTPException) as exc:
        await ing_service.delete_ingrediente(ing.id)
    assert exc.value.status_code == 400
    assert "porque está asociado" in exc.value.detail


@pytest.mark.anyio
async def test_create_and_update_producto_successfully(test_db):
    """
    Prueba el ciclo de creación y re-asociación M2M de un producto.
    """
    cat_service = CategoriaService()
    ing_service = IngredienteService()
    prod_service = ProductoService()
    
    cat1 = await cat_service.create_categoria(CategoriaCreate(nombre="Cat 1"))
    cat2 = await cat_service.create_categoria(CategoriaCreate(nombre="Cat 2"))
    ing1 = await ing_service.create_ingrediente(IngredienteCreate(nombre="Ing 1"))
    ing2 = await ing_service.create_ingrediente(IngredienteCreate(nombre="Ing 2"))
    
    # Crear producto con Cat 1 e Ing 1
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Hamburguesa Premium",
            precio=Decimal("1500.00"),
            stock=5,
            categoria_ids=[cat1.id],
            ingrediente_ids=[ing1.id]
        )
    )
    
    assert prod.id is not None
    
    # Verificar producto inicial y relaciones M2M dentro de una transacción activa
    async with UnitOfWork() as uow:
        prod_db = uow.session.get(Producto, prod.id)
        assert prod_db.precio == Decimal("1500.00")
        assert len(prod_db.categorias) == 1
        assert prod_db.categorias[0].id == cat1.id
        assert len(prod_db.ingredientes) == 1
        assert prod_db.ingredientes[0].id == ing1.id
    
    # Actualizar producto re-asociando a Cat 2 e Ing 2
    updated = await prod_service.update_producto(
        prod.id,
        ProductoUpdate(
            categoria_ids=[cat2.id],
            ingrediente_ids=[ing2.id],
            precio=Decimal("1800.00")
        )
    )
    
    # Verificar producto modificado y relaciones M2M dentro de una transacción activa
    async with UnitOfWork() as uow:
        updated_db = uow.session.get(Producto, updated.id)
        assert updated_db.precio == Decimal("1800.00")
        assert len(updated_db.categorias) == 1
        assert updated_db.categorias[0].id == cat2.id
        assert len(updated_db.ingredientes) == 1
        assert updated_db.ingredientes[0].id == ing2.id


@pytest.mark.anyio
async def test_atomic_stock_adjustment_cannot_be_negative(test_db):
    """
    Valida la regla de negocio crítica stock >= 0 (RN-CA05) ante decrementos físicos.
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    
    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Bebidas"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Gaseosa",
            precio=Decimal("400.00"),
            stock=10,
            categoria_ids=[cat.id]
        )
    )
    
    # Ajustar stock positivamente
    adjusted = await prod_service.patch_stock(prod.id, 5)
    assert adjusted.stock == 15
    
    # Ajustar stock negativamente de forma permitida
    adjusted = await prod_service.patch_stock(prod.id, -10)
    assert adjusted.stock == 5
    
    # Intentar ajustar stock negativamente rompiendo la cota (5 - 6 = -1, prohibido)
    with pytest.raises(HTTPException) as exc:
        await prod_service.patch_stock(prod.id, -6)
    assert exc.value.status_code == 400
    assert "El stock resultante" in exc.value.detail


@pytest.mark.anyio
async def test_list_products_allergens_exclusion(test_db):
    """
    Prueba que el algoritmo SQL de catálogo excluya correctamente alérgenos según el perfil del cliente (RN-CA04).
    """
    cat_service = CategoriaService()
    ing_service = IngredienteService()
    prod_service = ProductoService()
    
    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    
    # Crear alérgeno (Trigo)
    trigo = await ing_service.create_ingrediente(IngredienteCreate(nombre="Trigo", es_alergeno=True))
    # Crear ingrediente seguro (Lechuga)
    lechuga = await ing_service.create_ingrediente(IngredienteCreate(nombre="Lechuga", es_alergeno=False))
    
    # Producto A: Contiene Trigo (Alérgeno)
    await prod_service.create_producto(
        ProductoCreate(
            nombre="Pan de Ajo",
            precio=Decimal("800.00"),
            stock=20,
            categoria_ids=[cat.id],
            ingrediente_ids=[trigo.id]
        )
    )
    
    # Producto B: Contiene solo Lechuga (Seguro)
    await prod_service.create_producto(
        ProductoCreate(
            nombre="Ensalada Mix",
            precio=Decimal("900.00"),
            stock=10,
            categoria_ids=[cat.id],
            ingrediente_ids=[lechuga.id]
        )
    )
    
    # 1. Sin exclusiones: Deben retornar ambos
    items, total = await prod_service.list_products(exclude_allergens=[])
    assert total == 2
    
    # 2. Con exclusión de Trigo: Solo debe retornar la Ensalada Mix
    items, total = await prod_service.list_products(exclude_allergens=[trigo.id])
    assert total == 1
    assert items[0].nombre == "Ensalada Mix"
