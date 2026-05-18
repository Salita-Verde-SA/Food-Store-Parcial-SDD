from sqlmodel import Session, select
from app.core.database import engine
from app.core.config import settings
from app.modules.auth.model import Rol, Usuario, UsuarioRol
from app.modules.pedidos.model import EstadoPedido
from app.modules.pagos.model import FormaPago
from passlib.hash import bcrypt


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
            EstadoPedido(codigo="PREPARACION", descripcion="En cocina", orden=3),
            EstadoPedido(codigo="ENVIO", descripcion="En camino", orden=4),
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

        session.commit()
        print("Seed data completed successfully.")


if __name__ == "__main__":
    seed_data()
