from datetime import timedelta
import secrets
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.models import Sesion, Usuario
from src.auth.security import administrador, ahora, bearer, hash_password, hash_token, usuario_actual, verificar_password
from src.database.session import get_db

NombreUsuario = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=80, pattern=r"^[a-z0-9_.-]+$")]


class Login(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nombre: NombreUsuario
    password: str = Field(min_length=1, max_length=128)


class UsuarioCreate(Login):
    password: str = Field(min_length=12, max_length=128)
    rol: Literal["administrador", "operador"] = "operador"


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    rol: str
    activo: bool


router = APIRouter(prefix="/auth", tags=["Acceso"])


@router.post("/login")
def login(datos: Login, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter_by(nombre=datos.nombre).first()
    if user is None or not user.activo or (user.bloqueo_hasta and user.bloqueo_hasta > ahora()):
        raise HTTPException(401, "Credenciales inválidas")
    if not verificar_password(datos.password, user.password_hash):
        db.execute(update(Usuario).where(Usuario.id == user.id).values(intentos=Usuario.intentos + 1))
        db.refresh(user)
        if user.intentos >= 5:
            user.bloqueo_hasta = ahora() + timedelta(minutes=15)
        db.commit()
        raise HTTPException(401, "Credenciales inválidas")
    user.intentos = 0
    user.bloqueo_hasta = None
    token = secrets.token_urlsafe(32)
    db.add(Sesion(token_hash=hash_token(token), usuario_id=user.id, vence=ahora() + timedelta(hours=8)))
    db.commit()
    return {"access_token": token, "token_type": "bearer", "expires_in": 28_800}


@router.get("/me", response_model=UsuarioResponse)
def me(user: Usuario = Depends(usuario_actual)):
    return user


@router.post("/logout", status_code=204)
def logout(user: Usuario = Depends(usuario_actual), credentials=Depends(bearer), db: Session = Depends(get_db)):
    db.delete(db.get(Sesion, hash_token(credentials.credentials)))
    db.commit()


@router.post("/usuarios", response_model=UsuarioResponse, status_code=201)
def crear_usuario(datos: UsuarioCreate, _=Depends(administrador), db: Session = Depends(get_db)):
    user = Usuario(nombre=datos.nombre, password_hash=hash_password(datos.password), rol=datos.rol)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Usuario existente")
    return user


@router.patch("/usuarios/{usuario_id}/desactivar", response_model=UsuarioResponse)
def desactivar_usuario(usuario_id: int, admin=Depends(administrador), db: Session = Depends(get_db)):
    user = db.get(Usuario, usuario_id)
    if user is None:
        raise HTTPException(404, "Usuario inexistente")
    if user.id == admin.id:
        raise HTTPException(409, "No puede desactivar su propia cuenta")
    user.activo = False
    db.commit()
    return user
