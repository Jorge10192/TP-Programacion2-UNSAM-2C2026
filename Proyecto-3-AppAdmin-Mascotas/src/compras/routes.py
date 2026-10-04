from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.compras.models import Proveedor
from src.compras.schemas import ProveedorCreate, ProveedorResponse
from src.database.session import get_db


router = APIRouter(
    prefix="/proveedores",
    tags=["Proveedores"],
)


@router.post(
    "",
    response_model=ProveedorResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_proveedor(
    datos: ProveedorCreate,
    db: Session = Depends(get_db),
) -> Proveedor:
    proveedor = Proveedor(
        nombre=datos.nombre,
        observaciones=datos.observaciones,
    )

    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)

    return proveedor


@router.get(
    "",
    response_model=list[ProveedorResponse],
)
def listar_proveedores(
    db: Session = Depends(get_db),
) -> list[Proveedor]:
    proveedores = db.query(Proveedor).all()

    return proveedores