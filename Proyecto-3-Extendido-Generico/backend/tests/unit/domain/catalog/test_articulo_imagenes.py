from dataclasses import FrozenInstanceError
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.domain.catalog.articulo import ArticuloCatalogo
from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import EstadoArticulo, TipoArticulo, UnidadMedida
from app.domain.catalog.errors import ImagenesInvalidasError
from app.domain.catalog.imagen import ArticuloImagen
from app.domain.catalog.propuesta import PropuestaEdicionPreparada
from app.domain.common.exceptions import FechaInvalidaError, IdentificadorInvalidoError

AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)
DESPUES = datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def capacidades() -> CapacidadesArticulo:
    return CapacidadesArticulo(
        es_comprable=True,
        es_vendible=True,
        controla_stock=True,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )


def crear_articulo(**overrides: object) -> ArticuloCatalogo:
    data: dict[str, object] = {
        "id": uuid4(),
        "negocio_id": uuid4(),
        "categoria_id": None,
        "nombre": "Snack",
        "descripcion": None,
        "tipo": TipoArticulo.BIEN,
        "unidad_medida": UnidadMedida.UNIDAD,
        "sku": None,
        "precio_base": Decimal("1500.0000"),
        "costo_referencia": Decimal("800.0000"),
        "capacidades": capacidades(),
        "estado": EstadoArticulo.ACTIVO,
        "version": 3,
        "created_at": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return ArticuloCatalogo(**data)  # type: ignore[arg-type]


def crear_imagen(
    articulo: ArticuloCatalogo,
    *,
    posicion: int = 1,
    es_principal: bool = True,
    referencia_storage: str = "catalogo/imagen-1.webp",
    id: UUID | None = None,
    articulo_id: UUID | None = None,
    negocio_id: UUID | None = None,
    created_at: datetime = AHORA,
) -> ArticuloImagen:
    return ArticuloImagen(
        id=id or uuid4(),
        negocio_id=negocio_id or articulo.negocio_id,
        articulo_id=articulo_id or articulo.id,
        referencia_storage=referencia_storage,
        posicion=posicion,
        es_principal=es_principal,
        created_at=created_at,
    )


def propuesta_desde(
    articulo: ArticuloCatalogo,
    *,
    imagenes: tuple[ArticuloImagen, ...],
    nombre: str | None = None,
) -> PropuestaEdicionPreparada:
    return PropuestaEdicionPreparada(
        nombre=nombre or articulo.nombre,
        descripcion=articulo.descripcion,
        categoria_id=articulo.categoria_id,
        sku=articulo.sku,
        unidad_medida=articulo.unidad_medida,
        precio_base=articulo.precio_base,
        costo_referencia=articulo.costo_referencia,
        capacidades=articulo.capacidades,
        imagenes=imagenes,
    )


@pytest.mark.parametrize("posicion", [1, 2, 3])
def test_articulo_imagen_valida_es_inmutable(posicion: int) -> None:
    articulo = crear_articulo()
    imagen = crear_imagen(articulo, posicion=posicion)

    assert imagen.posicion == posicion
    assert imagen.referencia_storage == "catalogo/imagen-1.webp"

    with pytest.raises(FrozenInstanceError):
        imagen.posicion = 2  # type: ignore[misc]


@pytest.mark.parametrize("field_name", ["id", "negocio_id", "articulo_id"])
def test_articulo_imagen_rechaza_uuid_que_no_es_v4(field_name: str) -> None:
    articulo = crear_articulo()
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_imagen(articulo, **{field_name: uuid_v1})


@pytest.mark.parametrize("referencia", ["", "   ", 123])
def test_articulo_imagen_rechaza_referencia_storage_invalida(
    referencia: object,
) -> None:
    articulo = crear_articulo()

    with pytest.raises(ImagenesInvalidasError):
        crear_imagen(
            articulo,
            referencia_storage=referencia,  # type: ignore[arg-type]
        )


def test_referencia_storage_opaca_no_se_modifica_silenciosamente() -> None:
    articulo = crear_articulo()
    referencia = "  provider:key/con espacios  "

    imagen = crear_imagen(articulo, referencia_storage=referencia)

    assert imagen.referencia_storage == referencia


@pytest.mark.parametrize("posicion", [0, 4, -1, True, 1.5])
def test_articulo_imagen_rechaza_posicion_fuera_del_contrato(
    posicion: object,
) -> None:
    articulo = crear_articulo()

    with pytest.raises(ImagenesInvalidasError):
        crear_imagen(articulo, posicion=posicion)  # type: ignore[arg-type]


def test_articulo_imagen_rechaza_principal_que_no_es_booleano() -> None:
    articulo = crear_articulo()

    with pytest.raises(ImagenesInvalidasError):
        crear_imagen(
            articulo,
            es_principal=1,  # type: ignore[arg-type]
        )


def test_articulo_imagen_normaliza_created_at_a_utc() -> None:
    articulo = crear_articulo()
    buenos_aires = timezone(timedelta(hours=-3))
    instante = datetime(2026, 10, 29, 9, 0, tzinfo=buenos_aires)

    imagen = crear_imagen(articulo, created_at=instante)

    assert imagen.created_at == AHORA


def test_articulo_imagen_rechaza_created_at_naive() -> None:
    articulo = crear_articulo()

    with pytest.raises(FechaInvalidaError):
        crear_imagen(
            articulo,
            created_at=datetime(2026, 10, 29, 12, 0),
        )


def test_articulo_nace_sin_imagenes_por_default() -> None:
    articulo = crear_articulo()

    assert articulo.imagenes == ()


def test_factory_puede_crear_articulo_con_imagen_valida() -> None:
    articulo_id = uuid4()
    negocio_id = uuid4()
    imagen = ArticuloImagen(
        id=uuid4(),
        negocio_id=negocio_id,
        articulo_id=articulo_id,
        referencia_storage="catalogo/principal.webp",
        posicion=1,
        es_principal=True,
        created_at=AHORA,
    )

    articulo = ArticuloCatalogo.crear(
        id=articulo_id,
        negocio_id=negocio_id,
        categoria_id=None,
        nombre="Snack",
        descripcion=None,
        tipo=TipoArticulo.BIEN,
        unidad_medida=UnidadMedida.UNIDAD,
        sku=None,
        precio_base=Decimal("1500.0000"),
        costo_referencia=None,
        capacidades=capacidades(),
        creado_en=AHORA,
        imagenes=(imagen,),
    )

    assert articulo.imagenes == (imagen,)


@pytest.mark.parametrize("cantidad", [1, 2, 3])
def test_reemplazo_valido_acepta_una_a_tres_imagenes(cantidad: int) -> None:
    articulo = crear_articulo()
    imagenes = tuple(
        crear_imagen(
            articulo,
            posicion=posicion,
            es_principal=posicion == 1,
            referencia_storage=f"catalogo/{posicion}.webp",
        )
        for posicion in range(1, cantidad + 1)
    )

    articulo.reemplazar_imagenes(imagenes, actualizado_en=DESPUES)

    assert articulo.imagenes == imagenes
    assert articulo.updated_at == DESPUES
    assert articulo.version == 3


def test_reemplazar_por_coleccion_vacia_es_valido() -> None:
    articulo = crear_articulo()
    inicial = (crear_imagen(articulo),)
    articulo.reemplazar_imagenes(inicial, actualizado_en=DESPUES)

    articulo.reemplazar_imagenes((), actualizado_en=DESPUES)

    assert articulo.imagenes == ()


def test_reemplazo_rechaza_mas_de_tres_imagenes_sin_mutar() -> None:
    articulo = crear_articulo()
    inicial = (crear_imagen(articulo),)
    articulo.reemplazar_imagenes(inicial, actualizado_en=DESPUES)
    antes = articulo.imagenes
    cuatro = (
        crear_imagen(articulo, posicion=1, es_principal=True),
        crear_imagen(articulo, posicion=2, es_principal=False),
        crear_imagen(articulo, posicion=3, es_principal=False),
        crear_imagen(articulo, posicion=1, es_principal=False),
    )

    with pytest.raises(ImagenesInvalidasError):
        articulo.reemplazar_imagenes(cuatro, actualizado_en=DESPUES)

    assert articulo.imagenes == antes


@pytest.mark.parametrize(
    "principales",
    [
        (False, False),
        (True, True),
    ],
)
def test_reemplazo_exige_exactamente_una_principal(
    principales: tuple[bool, bool],
) -> None:
    articulo = crear_articulo()
    imagenes = (
        crear_imagen(
            articulo,
            posicion=1,
            es_principal=principales[0],
        ),
        crear_imagen(
            articulo,
            posicion=2,
            es_principal=principales[1],
        ),
    )

    with pytest.raises(ImagenesInvalidasError):
        articulo.reemplazar_imagenes(imagenes, actualizado_en=DESPUES)

    assert articulo.imagenes == ()


def test_reemplazo_rechaza_posiciones_duplicadas() -> None:
    articulo = crear_articulo()
    imagenes = (
        crear_imagen(articulo, posicion=1, es_principal=True),
        crear_imagen(articulo, posicion=1, es_principal=False),
    )

    with pytest.raises(ImagenesInvalidasError):
        articulo.reemplazar_imagenes(imagenes, actualizado_en=DESPUES)


def test_reemplazo_rechaza_imagen_de_otro_articulo() -> None:
    articulo = crear_articulo()
    imagen = crear_imagen(articulo, articulo_id=uuid4())

    with pytest.raises(ImagenesInvalidasError):
        articulo.reemplazar_imagenes((imagen,), actualizado_en=DESPUES)


def test_reemplazo_rechaza_imagen_de_otro_negocio() -> None:
    articulo = crear_articulo()
    imagen = crear_imagen(articulo, negocio_id=uuid4())

    with pytest.raises(ImagenesInvalidasError):
        articulo.reemplazar_imagenes((imagen,), actualizado_en=DESPUES)


def test_reemplazo_rechaza_elemento_que_no_es_articulo_imagen() -> None:
    articulo = crear_articulo()

    with pytest.raises(ImagenesInvalidasError):
        articulo.reemplazar_imagenes(  # type: ignore[arg-type]
            (object(),),
            actualizado_en=DESPUES,
        )


def test_reemplazo_rechaza_timestamp_naive_sin_mutar() -> None:
    articulo = crear_articulo()
    inicial = (crear_imagen(articulo),)
    articulo.reemplazar_imagenes(inicial, actualizado_en=DESPUES)
    antes = articulo.imagenes
    nueva = (
        crear_imagen(
            articulo,
            posicion=1,
            referencia_storage="catalogo/nueva.webp",
        ),
    )

    with pytest.raises(FechaInvalidaError):
        articulo.reemplazar_imagenes(
            nueva,
            actualizado_en=datetime(2026, 10, 29, 14, 0),
        )

    assert articulo.imagenes == antes
    assert articulo.updated_at == DESPUES


def test_edicion_compuesta_incluye_imagenes_en_la_atomicidad() -> None:
    articulo = crear_articulo()
    inicial = (crear_imagen(articulo),)
    articulo.reemplazar_imagenes(inicial, actualizado_en=AHORA)
    antes_nombre = articulo.nombre
    antes_imagenes = articulo.imagenes
    invalidas = (
        crear_imagen(articulo, posicion=1, es_principal=True),
        crear_imagen(articulo, posicion=1, es_principal=False),
    )
    propuesta = propuesta_desde(
        articulo,
        nombre="Nombre que no debe quedar",
        imagenes=invalidas,
    )

    with pytest.raises(ImagenesInvalidasError):
        articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert articulo.nombre == antes_nombre
    assert articulo.imagenes == antes_imagenes
    assert articulo.updated_at == AHORA


def test_edicion_compuesta_reemplaza_imagenes_y_otros_campos_juntos() -> None:
    articulo = crear_articulo()
    nuevas = (
        crear_imagen(
            articulo,
            posicion=1,
            es_principal=False,
            referencia_storage="catalogo/secundaria.webp",
        ),
        crear_imagen(
            articulo,
            posicion=2,
            es_principal=True,
            referencia_storage="catalogo/principal.webp",
        ),
    )
    propuesta = propuesta_desde(
        articulo,
        nombre="Snack actualizado",
        imagenes=nuevas,
    )

    articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert articulo.nombre == "Snack actualizado"
    assert articulo.imagenes == nuevas
    assert articulo.updated_at == DESPUES


def test_desactivar_y_reactivar_conservan_imagenes() -> None:
    articulo = crear_articulo()
    imagenes = (crear_imagen(articulo),)
    articulo.reemplazar_imagenes(imagenes, actualizado_en=AHORA)

    articulo.desactivar(actualizado_en=DESPUES)
    articulo.reactivar(actualizado_en=DESPUES)

    assert articulo.imagenes == imagenes
