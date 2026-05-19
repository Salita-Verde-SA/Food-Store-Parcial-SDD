from sqlmodel import Session, select
from app.core.database import engine
from app.core.config import settings
from app.modules.auth.model import Rol, Usuario, UsuarioRol
from app.modules.pedidos.model import EstadoPedido
from app.modules.pagos.model import FormaPago
from app.modules.categorias.model import Categoria
from app.modules.ingredientes.model import Ingrediente
from app.modules.productos.model import Producto
from passlib.hash import bcrypt
from decimal import Decimal


def seed_data():
    with Session(engine) as session:
        # 1. ROLES
        roles = [
            Rol(codigo="ADMIN", descripcion="Administrador total"),
            Rol(codigo="STOCK", descripcion="Gestor de productos e ingredientes"),
            Rol(codigo="PEDIDOS", descripcion="Gestor de despacho de pedidos"),
            Rol(codigo="CLIENTE", descripcion="Cliente final"),
        ]
        for rol in roles:
            if not session.get(Rol, rol.codigo):
                session.add(rol)

        # 2. ESTADOS PEDIDO
        estados = [
            EstadoPedido(codigo="PENDIENTE", descripcion="Esperando pago/confirmación", orden=1),
            EstadoPedido(codigo="CONFIRMADO", descripcion="Pago recibido, listo para cocina", orden=2),
            EstadoPedido(codigo="EN_PREP", descripcion="En cocina", orden=3),
            EstadoPedido(codigo="EN_CAMINO", descripcion="En camino", orden=4),
            EstadoPedido(codigo="ENTREGADO", descripcion="Recibido por cliente", orden=5, es_terminal=True),
            EstadoPedido(codigo="CANCELADO", descripcion="Pedido anulado", orden=6, es_terminal=True),
        ]
        for estado in estados:
            if not session.get(EstadoPedido, estado.codigo):
                session.add(estado)

        # 3. FORMAS DE PAGO
        formas = [
            FormaPago(codigo="MP", nombre="Mercado Pago"),
            FormaPago(codigo="EFECTIVO", nombre="Efectivo / Contraentrega"),
        ]
        for forma in formas:
            if not session.get(FormaPago, forma.codigo):
                session.add(forma)

        # 4. ADMIN USER
        admin_email = settings.ADMIN_EMAIL
        existing_admin = session.exec(select(Usuario).where(Usuario.email == admin_email)).first()
        if not existing_admin:
            admin = Usuario(
                nombre="Admin",
                apellido="Sistema",
                email=admin_email,
                password_hash=bcrypt.hash(settings.ADMIN_PASSWORD),
                activo=True
            )
            session.add(admin)
            session.flush()
            
            # Asignar rol ADMIN
            session.add(UsuarioRol(usuario_id=admin.id, rol_codigo="ADMIN"))

        # 5. CATEGORIAS BASICAS
        pizza_cat = session.exec(select(Categoria).where(Categoria.nombre == "Pizzas")).first()
        if not pizza_cat:
            pizza_cat = Categoria(nombre="Pizzas", descripcion="Pizzas artesanales al horno de barro")
            session.add(pizza_cat)
        
        burger_cat = session.exec(select(Categoria).where(Categoria.nombre == "Hamburguesas")).first()
        if not burger_cat:
            burger_cat = Categoria(nombre="Hamburguesas", descripcion="Hamburguesas caseras de carne vacuna premium")
            session.add(burger_cat)
            
        bebidas_cat = session.exec(select(Categoria).where(Categoria.nombre == "Bebidas")).first()
        if not bebidas_cat:
            bebidas_cat = Categoria(nombre="Bebidas", descripcion="Bebidas frías y gaseosas")
            session.add(bebidas_cat)

        session.flush()  # Para obtener los IDs de las categorías

        # 6. INGREDIENTES BASICOS
        ingredients_data = [
            ("Harina de Trigo", True),
            ("Queso Mozzarella", True),
            ("Salsa de Tomate", False),
            ("Carne Vacuna", False),
            ("Huevo", True),
            ("Tomate", False),
            ("Lechuga", False),
        ]
        ingredients_map = {}
        for name, es_alergeno in ingredients_data:
            ing = session.exec(select(Ingrediente).where(Ingrediente.nombre == name)).first()
            if not ing:
                ing = Ingrediente(nombre=name, es_alergeno=es_alergeno)
                session.add(ing)
                session.flush()
            ingredients_map[name] = ing

        # 7. PRODUCTOS Y SUS RELACIONES M2M
        # Pizza Margherita
        pizza_prod = session.exec(select(Producto).where(Producto.nombre == "Pizza Margherita")).first()
        if not pizza_prod:
            pizza_prod = Producto(
                nombre="Pizza Margherita",
                descripcion="Clásica pizza italiana con salsa de tomate casera y mozzarella premium.",
                precio=Decimal("1200.00"),
                stock=20,
                disponible=True,
                imagen_url="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500"
            )
            pizza_prod.categorias.append(pizza_cat)
            pizza_prod.ingredientes.extend([
                ingredients_map["Salsa de Tomate"],
                ingredients_map["Queso Mozzarella"],
                ingredients_map["Harina de Trigo"]
            ])
            session.add(pizza_prod)

        # Hamburguesa Clásica
        burger_prod = session.exec(select(Producto).where(Producto.nombre == "Hamburguesa Clásica")).first()
        if not burger_prod:
            burger_prod = Producto(
                nombre="Hamburguesa Clásica",
                descripcion="Hamburguesa con 180g de carne de res premium, lechuga fresca y tomate.",
                precio=Decimal("1500.00"),
                stock=15,
                disponible=True,
                imagen_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500"
            )
            burger_prod.categorias.append(burger_cat)
            burger_prod.ingredientes.extend([
                ingredients_map["Carne Vacuna"],
                ingredients_map["Lechuga"],
                ingredients_map["Tomate"]
            ])
            session.add(burger_prod)

        # Gaseosa Cola
        cola_prod = session.exec(select(Producto).where(Producto.nombre == "Gaseosa Cola")).first()
        if not cola_prod:
            cola_prod = Producto(
                nombre="Gaseosa Cola",
                descripcion="Gaseosa sabor Cola helada de 500ml.",
                precio=Decimal("500.00"),
                stock=50,
                disponible=True,
                imagen_url="https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500"
            )
            cola_prod.categorias.append(bebidas_cat)
            session.add(cola_prod)

        # 8. CONFIGURACIONES GLOBALES
        from app.modules.configuracion.model import Configuracion
        configuraciones = [
            Configuracion(key="costo_envio", value="150.00", description="Costo operativo de envío a domicilio"),
            Configuracion(key="estado_local", value="abierto", description="Estado operativo del local (abierto/cerrado)")
        ]
        for cfg in configuraciones:
            if not session.get(Configuracion, cfg.key):
                session.add(cfg)

        session.commit()
        print("Seed data completed successfully.")


if __name__ == "__main__":
    seed_data()
