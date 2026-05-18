from sqlmodel import Session, select
from app.core.database import engine
from app.modules.auth.model import Usuario, UsuarioRol, Rol
from passlib.hash import bcrypt

def create_client():
    with Session(engine) as session:
        # Asegurar de que exista el rol CLIENTE
        cliente_rol = session.get(Rol, "CLIENTE")
        if not cliente_rol:
            session.add(Rol(codigo="CLIENTE", descripcion="Cliente final"))
            session.flush()
            
        client_email = "cliente@foodstore.com"
        existing_client = session.exec(select(Usuario).where(Usuario.email == client_email)).first()
        if not existing_client:
            client = Usuario(
                nombre="Juan",
                apellido="Perez",
                email=client_email,
                password_hash=bcrypt.hash("Cliente1234!"),
                activo=True
            )
            session.add(client)
            session.flush()
            
            session.add(UsuarioRol(usuario_id=client.id, rol_codigo="CLIENTE"))
            session.commit()
            print("SUCCESS: Dedicated client user 'cliente@foodstore.com' created successfully!")
        else:
            print("INFO: Client user 'cliente@foodstore.com' already exists!")

if __name__ == "__main__":
    create_client()
