import sys
import os
import asyncio

# Agregar el directorio base a la ruta de búsqueda
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import engine
from app.modules.pedidos.service import PedidoService
from app.modules.pedidos.schemas import CrearPedidoRequest, ItemPedidoRequest

async def test_create():
    service = PedidoService()
    # Dirección ID 2 (creada)
    req = CrearPedidoRequest(
        items=[
            ItemPedidoRequest(producto_id=1, cantidad=1, personalizacion=[])
        ],
        forma_pago_codigo="EFECTIVO",
        direccion_id=3,
        notas="Prueba de traceback"
    )
    
    try:
        print("Intentando crear pedido a través del servicio...")
        pedido = await service.crear_pedido(usuario_id=2, data=req)
        print(f"SUCCESS: Pedido creado con ID {pedido.id}!")
    except Exception as e:
        print("--- TRACEBACK DEL ERROR 500 DETECTADO ---")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create())
