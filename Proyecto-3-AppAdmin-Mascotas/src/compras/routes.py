from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.compras.models import (
    CategoriaInsumo,
    Insumo,
    Proveedor,
    UnidadMedida,
)
from src.compras.schemas import (
    CategoriaInsumoCreate,
    CategoriaInsumoResponse,
    CategoriaInsumoUpdate,
    InsumoCreate,
    InsumoResponse,
    InsumoUpdate,
    ProveedorCreate,
    ProveedorResponse,
    ProveedorUpdate,
    UnidadMedidaCreate,
    UnidadMedidaResponse,
    UnidadMedidaUpdate,
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
    nuevo_proveedor = Proveedor(
        **proveedor.model_dump(),
    )

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
    return list(
        db.scalars(
            select(Proveedor)
        ).all()
    )


@proveedores_router.get(
    "/{proveedor_id}",
    response_model=ProveedorResponse,
)
def obtener_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
):
    proveedor = db.get(
        Proveedor,
        proveedor_id,
    )

    if proveedor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado.",
        )

    return proveedor


@proveedores_router.put(
    "/{proveedor_id}",
    response_model=ProveedorResponse,
)
def actualizar_proveedor(
    proveedor_id: int,
    datos: ProveedorUpdate,
    db: Session = Depends(get_db),
):
    proveedor = db.get(
        Proveedor,
        proveedor_id,
    )

    if proveedor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado.",
        )

    proveedor.nombre = datos.nombre
    proveedor.observaciones = datos.observaciones

    db.commit()
    db.refresh(proveedor)

    return proveedor


@proveedores_router.patch(
    "/{proveedor_id}/desactivar",
    response_model=ProveedorResponse,
)
def desactivar_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
):
    proveedor = db.get(
        Proveedor,
        proveedor_id,
    )

    if proveedor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado.",
        )

    proveedor.activo = False

    db.commit()
    db.refresh(proveedor)

    return proveedor


@proveedores_router.patch(
    "/{proveedor_id}/activar",
    response_model=ProveedorResponse,
)
def activar_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
):
    proveedor = db.get(
        Proveedor,
        proveedor_id,
    )

    if proveedor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado.",
        )

    proveedor.activo = True

    db.commit()
    db.refresh(proveedor)

    return proveedor


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
    return list(
        db.scalars(
            select(CategoriaInsumo)
        ).all()
    )


@categorias_insumos_router.get(
    "/{categoria_id}",
    response_model=CategoriaInsumoResponse,
)
def obtener_categoria_insumo(
    categoria_id: int,
    db: Session = Depends(get_db),
):
    categoria = db.get(
        CategoriaInsumo,
        categoria_id,
    )

    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de insumo no encontrada.",
        )

    return categoria


@categorias_insumos_router.put(
    "/{categoria_id}",
    response_model=CategoriaInsumoResponse,
)
def actualizar_categoria_insumo(
    categoria_id: int,
    datos: CategoriaInsumoUpdate,
    db: Session = Depends(get_db),
):
    categoria = db.get(
        CategoriaInsumo,
        categoria_id,
    )

    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de insumo no encontrada.",
        )

    categoria_con_mismo_nombre = db.scalar(
        select(CategoriaInsumo).where(
            CategoriaInsumo.nombre == datos.nombre,
            CategoriaInsumo.id != categoria_id,
        )
    )

    if categoria_con_mismo_nombre is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe otra categoría de insumo con ese nombre.",
        )

    categoria.nombre = datos.nombre
    categoria.descripcion = datos.descripcion

    db.commit()
    db.refresh(categoria)

    return categoria


@categorias_insumos_router.patch(
    "/{categoria_id}/desactivar",
    response_model=CategoriaInsumoResponse,
)
def desactivar_categoria_insumo(
    categoria_id: int,
    db: Session = Depends(get_db),
):
    categoria = db.get(
        CategoriaInsumo,
        categoria_id,
    )

    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de insumo no encontrada.",
        )

    categoria.activa = False

    db.commit()
    db.refresh(categoria)

    return categoria


@categorias_insumos_router.patch(
    "/{categoria_id}/activar",
    response_model=CategoriaInsumoResponse,
)
def activar_categoria_insumo(
    categoria_id: int,
    db: Session = Depends(get_db),
):
    categoria = db.get(
        CategoriaInsumo,
        categoria_id,
    )

    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de insumo no encontrada.",
        )

    categoria.activa = True

    db.commit()
    db.refresh(categoria)

    return categoria


# ---------------------------------------------------------------------------
# Unidades de medida
# ---------------------------------------------------------------------------

unidades_medida_router = APIRouter(
    prefix="/unidades-medida",
    tags=["Unidades de medida"],
)


@unidades_medida_router.post(
    "",
    response_model=UnidadMedidaResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_unidad_medida(
    unidad: UnidadMedidaCreate,
    db: Session = Depends(get_db),
):
    unidad_existente = db.scalar(
        select(UnidadMedida).where(
            UnidadMedida.nombre == unidad.nombre
        )
    )

    if unidad_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una unidad de medida con ese nombre.",
        )

    nueva_unidad = UnidadMedida(
        **unidad.model_dump(),
    )

    db.add(nueva_unidad)
    db.commit()
    db.refresh(nueva_unidad)

    return nueva_unidad


@unidades_medida_router.get(
    "",
    response_model=list[UnidadMedidaResponse],
)
def listar_unidades_medida(
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(UnidadMedida)
        ).all()
    )

@unidades_medida_router.get(
    "/{unidad_id}",
    response_model=UnidadMedidaResponse,
)
def obtener_unidad_medida(
    unidad_id: int,
    db: Session = Depends(get_db),
):
    unidad = db.get(
        UnidadMedida,
        unidad_id,
    )

    if unidad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidad de medida no encontrada.",
        )

    return unidad


@unidades_medida_router.put(
    "/{unidad_id}",
    response_model=UnidadMedidaResponse,
)
def actualizar_unidad_medida(
    unidad_id: int,
    datos: UnidadMedidaUpdate,
    db: Session = Depends(get_db),
):
    unidad = db.get(
        UnidadMedida,
        unidad_id,
    )

    if unidad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidad de medida no encontrada.",
        )

    unidad_con_mismo_nombre = db.scalar(
        select(UnidadMedida).where(
            UnidadMedida.nombre == datos.nombre,
            UnidadMedida.id != unidad_id,
        )
    )

    if unidad_con_mismo_nombre is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe otra unidad de medida con ese nombre.",
        )

    unidad.nombre = datos.nombre
    unidad.simbolo = datos.simbolo

    db.commit()
    db.refresh(unidad)

    return unidad


@unidades_medida_router.patch(
    "/{unidad_id}/desactivar",
    response_model=UnidadMedidaResponse,
)
def desactivar_unidad_medida(
    unidad_id: int,
    db: Session = Depends(get_db),
):
    unidad = db.get(
        UnidadMedida,
        unidad_id,
    )

    if unidad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidad de medida no encontrada.",
        )

    unidad.activa = False

    db.commit()
    db.refresh(unidad)

    return unidad


@unidades_medida_router.patch(
    "/{unidad_id}/activar",
    response_model=UnidadMedidaResponse,
)
def activar_unidad_medida(
    unidad_id: int,
    db: Session = Depends(get_db),
):
    unidad = db.get(
        UnidadMedida,
        unidad_id,
    )

    if unidad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidad de medida no encontrada.",
        )

    unidad.activa = True

    db.commit()
    db.refresh(unidad)

    return unidad

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
    categoria = db.get(
        CategoriaInsumo,
        insumo.categoria_id,
    )

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

    unidad_stock = db.get(
        UnidadMedida,
        insumo.unidad_stock_id,
    )

    if unidad_stock is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La unidad de stock indicada no existe.",
        )

    if not unidad_stock.activa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede asociar un insumo a una unidad inactiva.",
        )

    nuevo_insumo = Insumo(
        **insumo.model_dump(),
    )

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
    return list(
        db.scalars(
            select(Insumo)
        ).all()
    )

@insumos_router.get(
    "/{insumo_id}",
    response_model=InsumoResponse,
)
def obtener_insumo(
    insumo_id: int,
    db: Session = Depends(get_db),
):
    insumo = db.get(
        Insumo,
        insumo_id,
    )

    if insumo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado.",
        )

    return insumo


@insumos_router.put(
    "/{insumo_id}",
    response_model=InsumoResponse,
)
def actualizar_insumo(
    insumo_id: int,
    datos: InsumoUpdate,
    db: Session = Depends(get_db),
):
    insumo = db.get(
        Insumo,
        insumo_id,
    )

    if insumo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado.",
        )

    categoria = db.get(
        CategoriaInsumo,
        datos.categoria_id,
    )

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

    unidad_stock = db.get(
        UnidadMedida,
        datos.unidad_stock_id,
    )

    if unidad_stock is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La unidad de stock indicada no existe.",
        )

    if not unidad_stock.activa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede asociar un insumo a una unidad inactiva.",
        )

    insumo.nombre = datos.nombre
    insumo.categoria_id = datos.categoria_id
    insumo.unidad_stock_id = datos.unidad_stock_id

    db.commit()
    db.refresh(insumo)

    return insumo


@insumos_router.patch(
    "/{insumo_id}/desactivar",
    response_model=InsumoResponse,
)
def desactivar_insumo(
    insumo_id: int,
    db: Session = Depends(get_db),
):
    insumo = db.get(
        Insumo,
        insumo_id,
    )

    if insumo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado.",
        )

    insumo.activo = False

    db.commit()
    db.refresh(insumo)

    return insumo


@insumos_router.patch(
    "/{insumo_id}/activar",
    response_model=InsumoResponse,
)
def activar_insumo(
    insumo_id: int,
    db: Session = Depends(get_db),
):
    insumo = db.get(
        Insumo,
        insumo_id,
    )

    if insumo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado.",
        )

    insumo.activo = True

    db.commit()
    db.refresh(insumo)

    return insumo
