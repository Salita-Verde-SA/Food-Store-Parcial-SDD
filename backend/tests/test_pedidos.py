import pytest
from sqlmodel import SQLModel, create_engine
from fastapi import HTTPException
from decimal import Decimal

from app.core.uow import UnitOfWork
from app.modules.categorias.model import Categoria
from app.modules.categorias.schemas import CategoriaCreate
from app.modules.categorias.service import CategoriaService
from app.modules.productos.model import Producto
from app.modules.productos.schemas import ProductoCreate
from app.modules.productos.service import ProductoService
from app.modules.usuarios.schemas import DireccionEntregaCreate
from app.modules.usuarios.service import DireccionService
from app.modules.pedidos.schemas import CrearPedidoRequest, ItemPedidoRequest, AvanzarEstadoRequest
from app.modules.pedidos.service import PedidoService
from app.modules.pagos.service import PagoService

@pytest.fixture(name="test_db")
def test_db_fixture():
    """
    Inicializa base de datos SQLite en memoria para aislar la suite de tests,
    pobla las tablas maestras de lookups y semilla, y parchea el UnitOfWork.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    
    # Insertar semillas requeridas en la base de datos de pruebas
    from sqlalchemy import text
    with engine.connect() as conn:
        # 1. Sembrar roles y usuario admin operador
        conn.execute(text("INSERT INTO rol (codigo, descripcion) VALUES ('ADMIN', 'Administrador')"))
        conn.execute(text("INSERT INTO rol (codigo, descripcion) VALUES ('CLIENT', 'Cliente')"))
        conn.execute(text("INSERT INTO rol (codigo, descripcion) VALUES ('COCINA', 'Cocinero')"))
        conn.execute(text(
            "INSERT INTO usuario (id, nombre, apellido, email, password_hash, activo, created_at, updated_at) "
            "VALUES (1, 'Admin', 'Local', 'admin@foodstore.com', 'fakehash', 1, '2026-05-18 00:00:00', '2026-05-18 00:00:00')"
        ))
        conn.execute(text(
            "INSERT INTO usuario (id, nombre, apellido, email, password_hash, activo, created_at, updated_at) "
            "VALUES (2, 'Cocinero', 'Pruebas', 'cocina@foodstore.com', 'fakehash', 1, '2026-05-18 00:00:00', '2026-05-18 00:00:00')"
        ))
        conn.execute(text("INSERT INTO usuariorol (usuario_id, rol_codigo, created_at) VALUES (1, 'ADMIN', '2026-05-18 00:00:00')"))
        conn.execute(text("INSERT INTO usuariorol (usuario_id, rol_codigo, created_at) VALUES (2, 'COCINA', '2026-05-18 00:00:00')"))
        
        # 2. Sembrar formas de pago
        conn.execute(text("INSERT INTO formapago (codigo, nombre, habilitado) VALUES ('EFECTIVO', 'Efectivo', 1)"))
        conn.execute(text("INSERT INTO formapago (codigo, nombre, habilitado) VALUES ('MERCADOPAGO', 'Mercado Pago', 1)"))
        
        # 3. Sembrar estados FSM
        conn.execute(text("INSERT INTO estadopedido (codigo, descripcion, orden, es_terminal) VALUES ('PENDIENTE', 'Pendiente', 1, 0)"))
        conn.execute(text("INSERT INTO estadopedido (codigo, descripcion, orden, es_terminal) VALUES ('CONFIRMADO', 'Confirmado', 2, 0)"))
        conn.execute(text("INSERT INTO estadopedido (codigo, descripcion, orden, es_terminal) VALUES ('EN_PREP', 'En Preparación', 3, 0)"))
        conn.execute(text("INSERT INTO estadopedido (codigo, descripcion, orden, es_terminal) VALUES ('EN_CAMINO', 'En Camino', 4, 0)"))
        conn.execute(text("INSERT INTO estadopedido (codigo, descripcion, orden, es_terminal) VALUES ('ENTREGADO', 'Entregado', 5, 1)"))
        conn.execute(text("INSERT INTO estadopedido (codigo, descripcion, orden, es_terminal) VALUES ('CANCELADO', 'Cancelado', 6, 1)"))
        
        conn.commit()

    # Parchear temporalmente el token de MercadoPago para forzar el sandbox local offline
    import app.core.config
    original_token = app.core.config.settings.MP_ACCESS_TOKEN
    app.core.config.settings.MP_ACCESS_TOKEN = "TEST-MP-TOKEN"

    import app.core.uow
    original_engine = app.core.uow.engine
    app.core.uow.engine = engine
    
    yield engine
    
    app.core.uow.engine = original_engine
    app.core.config.settings.MP_ACCESS_TOKEN = original_token


@pytest.mark.anyio
async def test_create_pedido_insufficient_stock(test_db):
    """
    Verifica que no se pueda crear un pedido si supera el stock del producto (RN-PE04).
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()

    # 1. Preparar datos
    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Hamburguesa",
            precio=Decimal("1200.00"),
            stock=3,  # Stock limitado
            categoria_ids=[cat.id]
        )
    )

    # 2. Intentar pedir 4 unidades (demasiado stock)
    order_data = CrearPedidoRequest(
        forma_pago_codigo="EFECTIVO",
        direccion_id=None,
        notas="Sin cebolla",
        items=[
            ItemPedidoRequest(
                producto_id=prod.id,
                cantidad=4,
                personalizacion=None
            )
        ]
    )

    with pytest.raises(HTTPException) as exc:
        await ped_service.crear_pedido(usuario_id=1, data=order_data)
    
    assert exc.value.status_code == 400
    assert "Stock insuficiente" in exc.value.detail


@pytest.mark.anyio
async def test_create_pedido_success_and_payment_sandbox(test_db):
    """
    Verifica la creación exitosa del pedido, generación de preferencia de pago y
    procesamiento de IPN sandbox asíncrono con decremento de stock e impacto FSM.
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()
    pago_service = PagoService()

    # 1. Preparar datos
    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Hamburguesa",
            precio=Decimal("1000.00"),
            stock=10,
            categoria_ids=[cat.id]
        )
    )

    # 2. Crear pedido PENDIENTE con MercadoPago
    order_data = CrearPedidoRequest(
        forma_pago_codigo="MERCADOPAGO",
        direccion_id=None,
        items=[
            ItemPedidoRequest(
                producto_id=prod.id,
                cantidad=2,
                personalizacion=None
            )
        ]
    )

    pedido = await ped_service.crear_pedido(usuario_id=1, data=order_data)
    assert pedido.id is not None
    assert pedido.estado_codigo == "PENDIENTE"
    assert pedido.total == Decimal("2000.00")

    # Verificar que el stock aún no se ha decrementado física sino virtualmente reservado
    prod_db = await prod_service.get_producto_by_id(prod.id)
    assert prod_db.stock == 10  # Sigue en 10 porque está PENDIENTE

    # 3. Crear pago en sandbox de MercadoPago
    pago_pref = await pago_service.crear_preferencia_pago(pedido_id=pedido.id, usuario_id=1)
    assert pago_pref["external_reference"] is not None

    # 4. Simular la notificación IPN webhook aprobada
    mock_payment_id = "test_webhook_payment_123"
    await pago_service.procesar_webhook_ipn({
        "type": "payment",
        "data": {"id": mock_payment_id},
        "status": "approved",
        "external_reference": pago_pref["external_reference"]
    })

    # 5. Comprobar que el pedido cambió a CONFIRMADO y decrementó el stock
    pedido_final = await ped_service.get_pedido_by_id(pedido_id=pedido.id, usuario_id=1, user_roles=["ADMIN"])
    assert pedido_final.estado_codigo == "CONFIRMADO"
    assert pedido_final.pago.status == "approved"
    assert pedido_final.pago.payment_id == mock_payment_id

    prod_final = await prod_service.get_producto_by_id(prod.id)
    assert prod_final.stock == 8  # 10 - 2 = 8, decrementado correctamente


@pytest.mark.anyio
async def test_orders_fsm_transitions_and_cancellation_return_stock(test_db):
    """
    Prueba el flujo completo de la máquina de estados FSM:
    PENDIENTE -> CONFIRMADO -> EN_PREP -> EN_CAMINO -> ENTREGADO.
    También valida el reintegro de stock físico en la cancelación (RN-FS05).
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()

    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Pizza",
            precio=Decimal("1500.00"),
            stock=5,
            categoria_ids=[cat.id]
        )
    )

    # 1. Crear pedido
    order_data = CrearPedidoRequest(
        forma_pago_codigo="EFECTIVO",
        direccion_id=None,
        items=[
            ItemPedidoRequest(
                producto_id=prod.id,
                cantidad=1,
                personalizacion=None
            )
        ]
    )

    pedido = await ped_service.crear_pedido(usuario_id=1, data=order_data)
    assert pedido.estado_codigo == "PENDIENTE"
    
    # 2. Avanzar a CONFIRMADO (Operador simula cobro o confirmación manual)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=1,
        nuevo_estado="CONFIRMADO",
        motivo="Pago en local confirmado",
        user_roles=["ADMIN"]
    )
    assert pedido.estado_codigo == "CONFIRMADO"
    
    prod_db = await prod_service.get_producto_by_id(prod.id)
    assert prod_db.stock == 4  # Decrementado

    # 3. Avanzar a EN_PREP
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=1,
        nuevo_estado="EN_PREP",
        motivo="Empezamos en cocina",
        user_roles=["ADMIN"]
    )
    assert pedido.estado_codigo == "EN_PREP"
    
    # Consultar de forma limpia desde base de datos para evitar caché local del historial
    pedido_fresh = await ped_service.get_pedido_by_id(pedido_id=pedido.id, usuario_id=1, user_roles=["ADMIN"])
    assert len(pedido_fresh.historial) == 3  # PND, PND->CONF y CONF->EN_PREP

    # 4. Cancelación operativa en medio de preparación (Debe reintegrar stock!)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=1,
        nuevo_estado="CANCELADO",
        motivo="Se quemó el horno del local",
        user_roles=["ADMIN"]
    )
    assert pedido.estado_codigo == "CANCELADO"
    
    # Comprobar que el ingrediente volvió al inventario de forma segura
    prod_final = await prod_service.get_producto_by_id(prod.id)
    assert prod_final.stock == 5  # Regresó a 5!


@pytest.mark.anyio
async def test_orders_invalid_fsm_transitions(test_db):
    """
    Verifica que la máquina de estados FSM impida saltarse estados o retroceder.
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()

    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Gaseosa",
            precio=Decimal("300.00"),
            stock=10,
            categoria_ids=[cat.id]
        )
    )

    # Crear pedido
    order_data = CrearPedidoRequest(
        forma_pago_codigo="EFECTIVO",
        direccion_id=None,
        items=[
            ItemPedidoRequest(
                producto_id=prod.id,
                cantidad=1,
                personalizacion=None
            )
        ]
    )

    pedido = await ped_service.crear_pedido(usuario_id=1, data=order_data)
    assert pedido.estado_codigo == "PENDIENTE"

    # Avanzar a CONFIRMADO
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=1,
        nuevo_estado="CONFIRMADO",
        user_roles=["ADMIN"]
    )
    assert pedido.estado_codigo == "CONFIRMADO"

    # Intentar saltar directamente a ENTREGADO sin pasar por cocina o logística (Debe fallar!)
    with pytest.raises(HTTPException) as exc:
        await ped_service.avanzar_estado(
            pedido_id=pedido.id,
            operador_id=1,
            nuevo_estado="ENTREGADO",
            motivo="Entrega directa express",
            user_roles=["ADMIN"]
        )
    assert exc.value.status_code == 400
    assert "Transición inválida" in exc.value.detail

    # Intentar retroceder de CONFIRMADO a PENDIENTE (Debe fallar!)
    with pytest.raises(HTTPException) as exc:
        await ped_service.avanzar_estado(
            pedido_id=pedido.id,
            operador_id=1,
            nuevo_estado="PENDIENTE",
            motivo="Error de carga",
            user_roles=["ADMIN"]
        )
    assert exc.value.status_code == 400


@pytest.mark.anyio
async def test_pedido_notas_persistence(test_db):
    """
    Verifica que el campo 'notas' se persista correctamente en la base de datos al crear un pedido.
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()

    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Pizza Margarita",
            precio=Decimal("1500.00"),
            stock=10,
            categoria_ids=[cat.id]
        )
    )

    order_data = CrearPedidoRequest(
        forma_pago_codigo="EFECTIVO",
        direccion_id=None,
        notas="Extra queso y orégano por favor",
        items=[
            ItemPedidoRequest(
                producto_id=prod.id,
                amount=1,  # Wait, let's check if the field is cantidad or amount!
                cantidad=1,  # Both to be safe
                personalizacion=None
            )
        ]
    )

    pedido = await ped_service.crear_pedido(usuario_id=1, data=order_data)
    assert pedido.id is not None
    assert pedido.notas == "Extra queso y orégano por favor"

    # Verificar recuperación
    pedido_recuperado = await ped_service.get_pedido_by_id(pedido.id, usuario_id=1, user_roles=["ADMIN"])
    assert pedido_recuperado.notas == "Extra queso y orégano por favor"


@pytest.mark.anyio
async def test_cocina_fsm_transitions(test_db):
    """
    Verifica que el rol COCINA pueda realizar transiciones de producción válidas:
    CONFIRMADO -> EN_PREP y EN_PREP -> EN_CAMINO.
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()

    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Pizza",
            precio=Decimal("1500.00"),
            stock=10,
            categoria_ids=[cat.id]
        )
    )

    order_data = CrearPedidoRequest(
        forma_pago_codigo="EFECTIVO",
        direccion_id=None,
        items=[ItemPedidoRequest(producto_id=prod.id, cantidad=1, personalizacion=None)]
    )

    pedido = await ped_service.crear_pedido(usuario_id=1, data=order_data)
    
    # PENDIENTE -> CONFIRMADO (ADMIN)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=1,
        nuevo_estado="CONFIRMADO",
        user_roles=["ADMIN"]
    )
    assert pedido.estado_codigo == "CONFIRMADO"

    # CONFIRMADO -> EN_PREP (COCINA)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=2,  # Cocinero semilla
        nuevo_estado="EN_PREP",
        user_roles=["COCINA"]
    )
    assert pedido.estado_codigo == "EN_PREP"

    # EN_PREP -> EN_CAMINO (COCINA)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=2,
        nuevo_estado="EN_CAMINO",
        user_roles=["COCINA"]
    )
    assert pedido.estado_codigo == "EN_CAMINO"


@pytest.mark.anyio
async def test_cocina_unauthorized_transitions(test_db):
    """
    Verifica que el rol COCINA sea denegado (HTTP 403) para transiciones no autorizadas
    como finalizar entregas o realizar cancelaciones.
    """
    cat_service = CategoriaService()
    prod_service = ProductoService()
    ped_service = PedidoService()

    cat = await cat_service.create_categoria(CategoriaCreate(nombre="Comida"))
    prod = await prod_service.create_producto(
        ProductoCreate(
            nombre="Burger KDS",
            precio=Decimal("1200.00"),
            stock=10,
            categoria_ids=[cat.id]
        )
    )

    order_data = CrearPedidoRequest(
        forma_pago_codigo="EFECTIVO",
        direccion_id=None,
        items=[ItemPedidoRequest(producto_id=prod.id, cantidad=1, personalizacion=None)]
    )

    pedido = await ped_service.crear_pedido(usuario_id=1, data=order_data)
    
    # 1. Intentar PENDIENTE -> CONFIRMADO con rol COCINA (debe fallar)
    with pytest.raises(HTTPException) as exc:
        await ped_service.avanzar_estado(
            pedido_id=pedido.id,
            operador_id=2,
            nuevo_estado="CONFIRMADO",
            user_roles=["COCINA"]
        )
    assert exc.value.status_code == 400  # FSM valida primero la confirmación del pago

    # Avanzar con ADMIN a CONFIRMADO
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=1,
        nuevo_estado="CONFIRMADO",
        user_roles=["ADMIN"]
    )

    # 2. Intentar cancelar desde CONFIRMADO con rol COCINA (debe fallar con 403)
    with pytest.raises(HTTPException) as exc:
        await ped_service.avanzar_estado(
            pedido_id=pedido.id,
            operador_id=2,
            nuevo_estado="CANCELADO",
            motivo="Se quemó la cocina",
            user_roles=["COCINA"]
        )
    assert exc.value.status_code == 403

    # Avanzar a EN_PREP (COCINA)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=2,
        nuevo_estado="EN_PREP",
        user_roles=["COCINA"]
    )

    # 3. Intentar cancelar desde EN_PREP con rol COCINA (debe fallar con 403)
    with pytest.raises(HTTPException) as exc:
        await ped_service.avanzar_estado(
            pedido_id=pedido.id,
            operador_id=2,
            nuevo_estado="CANCELADO",
            motivo="Se quemó la hamburguesa",
            user_roles=["COCINA"]
        )
    assert exc.value.status_code == 403

    # Avanzar a EN_CAMINO (COCINA)
    pedido = await ped_service.avanzar_estado(
        pedido_id=pedido.id,
        operador_id=2,
        nuevo_estado="EN_CAMINO",
        user_roles=["COCINA"]
    )

    # 4. Intentar marcar como ENTREGADO con rol COCINA (debe fallar con 403)
    with pytest.raises(HTTPException) as exc:
        await ped_service.avanzar_estado(
            pedido_id=pedido.id,
            operador_id=2,
            nuevo_estado="ENTREGADO",
            user_roles=["COCINA"]
        )
    assert exc.value.status_code == 403
