import argparse
import getpass

from src.auth.models import Usuario
from src.auth.routes import UsuarioCreate
from src.auth.security import hash_password
from src.database.session import SessionLocal


def main():
    parser = argparse.ArgumentParser(description="Crear el administrador inicial de WALOS")
    parser.add_argument("nombre")
    args = parser.parse_args()
    with SessionLocal() as db:
        if db.query(Usuario).filter_by(rol="administrador", activo=True).first():
            parser.exit(1, "Ya existe un administrador. Use /auth/usuarios.\n")
        password = getpass.getpass("Contraseña (mínimo 12 caracteres): ")
        if password != getpass.getpass("Repetir contraseña: "):
            parser.exit(1, "Las contraseñas no coinciden.\n")
        data = UsuarioCreate(nombre=args.nombre, password=password, rol="administrador")
        db.add(Usuario(nombre=data.nombre, password_hash=hash_password(data.password), rol=data.rol))
        db.commit()
    print("Administrador creado.")


if __name__ == "__main__":
    main()
