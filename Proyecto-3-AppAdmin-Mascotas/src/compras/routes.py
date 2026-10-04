from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.compras.models import CategoriaInsumo, Insumo, Proveedor
from src.compras.schemas import (
    CategoriaInsumoCreate,
    CategoriaInsumoResponse,
    InsumoCreate,
    InsumoResponse,
    ProveedorCreate,
    ProveedorResponse,
)
from src.database.session import get_db


# ---------------------------------------------------------------------------
# Proveedores
# ---------------------------------------------------------------------------

proveedores_router = APIRouter(
    prefix="/proveedores",
    tags=["Proveedores"],
)


@proveedores_router.post(
    "",
    response_model=ProveedorResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_proveedor(
    proveedor: ProveedorCreate,
    db: Session = Depends(get_db),
):
    nuevo_proveedor = Proveedor(**proveedor.model_dump())

    db.add(nuevo_proveedor)
    db.commit()
    db.refresh(nuevo_proveedor)

    return nuevo_proveedor


@proveedores_router.get(
    "",
    response_model=list[ProveedorResponse],
)
def listar_proveedores(
    db: Session = Depends(get_db),
):
    return list(db.scalars(select(Proveedor)).all())


# ---------------------------------------------------------------------------
# Categorías de insumos
# ---------------------------------------------------------------------------

categorias_insumos_router = APIRouter(
    prefix="/categorias-insumos",
    tags=["Categorías de insumos"],
)


@categorias_insumos_router.post(
    "",
    response_model=CategoriaInsumoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_categoria_insumo(
    categoria: CategoriaInsumoCreate,
    db: Session = Depends(get_db),
):
    categoria_existente = db.scalar(
        select(CategoriaInsumo).where(
            CategoriaInsumo.nombre == categoria.nombre
        )
    )

    if categoria_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría de insumo con ese nombre.",
        )

    nueva_categoria = CategoriaInsumo(
        **categoria.model_dump(),
        es_sistema=False,
    )

    db.add(nueva_categoria)
    db.commit()
    db.refresh(nueva_categoria)

    return nueva_categoria


@categorias_insumos_router.get(
    "",
    response_model=list[CategoriaInsumoResponse],
)
def listar_categorias_insumo(
    db: Session = Depends(get_db),
):
    return list(db.scalars(select(CategoriaInsumo)).all())


# ---------------------------------------------------------------------------
# Insumos
# ---------------------------------------------------------------------------

insumos_router = APIRouter(
    prefix="/insumos",
    tags=["Insumos"],
)


@insumos_router.post(
    "",
    response_model=InsumoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_insumo(
    insumo: InsumoCreate,
    db: Session = Depends(get_db),
):
    categoria = db.get(CategoriaInsumo, insumo.categoria_id)

    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La categoría de insumo indicada no existe.",
        )

    if not categoria.activa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede asociar un insumo a una categoría inactiva.",
        )

    nuevo_insumo = Insumo(**insumo.model_dump())

    db.add(nuevo_insumo)
    db.commit()
    db.refresh(nuevo_insumo)

    return nuevo_insumo


@insumos_router.get(
    "",
    response_model=list[InsumoResponse],
)
def listar_insumos(
    db: Session = Depends(get_db),
):
    return list(db.scalars(select(Insumo)).all())
