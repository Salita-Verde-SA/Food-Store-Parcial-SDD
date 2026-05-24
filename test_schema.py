import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.modules.pedidos.schemas import CrearPedidoRequest

try:
    data = {
        "items": [
            {
                "producto_id": 1,
                "cantidad": 1,
                "personalizacion": "7"
            }
        ],
        "forma_pago_codigo": "EFECTIVO",
        "direccion_id": None,
        "notas": None
    }
    obj = CrearPedidoRequest(**data)
    print("SUCCESS with string:", obj)
except Exception as e:
    print("ERROR with string:", e)

try:
    data2 = {
        "items": [
            {
                "producto_id": 1,
                "cantidad": 1,
                "personalizacion": ["7"]
            }
        ],
        "forma_pago_codigo": "EFECTIVO",
        "direccion_id": None,
        "notas": None
    }
    obj2 = CrearPedidoRequest(**data2)
    print("SUCCESS with list of strings:", obj2)
except Exception as e:
    print("ERROR with list of strings:", e)
