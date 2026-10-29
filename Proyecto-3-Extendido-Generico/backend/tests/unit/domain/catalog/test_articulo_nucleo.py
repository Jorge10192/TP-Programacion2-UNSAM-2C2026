from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.domain.catalog.articulo import ArticuloCatalogo
from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import EstadoArticulo, TipoArticulo, UnidadMedida
from app.domain.catalog.errors import (
    ArticuloActivoSinUsoError,
    ArticuloInvalidoError,
    CapacidadesInvalidasError,
    PrecioInvalidoError,
)
from app.domain.common.exceptions import (
    FechaInvalidaError,
    IdentificadorInvalidoError,
    NombreInvalidoError,
    VersionInvalidaError,
)

AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)


def capacidades_bien_vendible() -> CapacidadesArticulo:
    return CapacidadesArticulo(
        es_comprable=True,
        es_vendible=True,
        controla_stock=True,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=True,
    )


def capacidades_servicio_vendible() -> CapacidadesArticulo:
    return CapacidadesArticulo(
        es_comprable=False,
        es_vendible=True,
        controla_stock=False,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=True,
    )


def capacidades_sin_usos() -> CapacidadesArticulo:
    return CapacidadesArticulo(
        es_comprable=False,
        es_vendible=False,
        controla_stock=False,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )


def crear_articulo(**overrides: object) -> ArticuloCatalogo:
    data: dict[str, object] = {
        "id": uuid4(),
        "negocio_id": uuid4(),
        "categoria_id": None,
        "nombre": "Snack de pollo",
        "descripcion": None,
        "tipo": TipoArticulo.BIEN,
        "unidad_medida": UnidadMedida.UNIDAD,
        "sku": None,
        "precio_base": Decimal("1500.0000"),
        "costo_referencia": Decimal("800.0000"),
        "capacidades": capacidades_bien_vendible(),
        "estado": EstadoArticulo.ACTIVO,
        "version": 1,
        "created_at": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return ArticuloCatalogo(**data)  # type: ignore[arg-type]


def test_crear_articulo_nuevo_nace_activo_version_uno() -> None:
    articulo_id = uuid4()
    negocio_id = uuid4()
    categoria_id = uuid4()
    capacidades = capacidades_bien_vendible()

    articulo = ArticuloCatalogo.crear(
        id=articulo_id,
        negocio_id=negocio_id,
        categoria_id=categoria_id,
        nombre="  Snack de pollo  ",
        descripcion="Bolsa de 100 g",
        tipo=TipoArticulo.BIEN,
        unidad_medida=UnidadMedida.UNIDAD,
        sku="snack-001",
        precio_base=Decimal("1500.0000"),
        costo_referencia=Decimal("800.0000"),
        capacidades=capacidades,
        creado_en=AHORA,
    )

    assert articulo.id == articulo_id
    assert articulo.negocio_id == negocio_id
    assert articulo.categoria_id == categoria_id
    assert articulo.nombre == "Snack de pollo"
    assert articulo.descripcion == "Bolsa de 100 g"
    assert articulo.tipo is TipoArticulo.BIEN
    assert articulo.unidad_medida is UnidadMedida.UNIDAD
    assert articulo.sku == "snack-001"
    assert articulo.precio_base == Decimal("1500.0000")
    assert articulo.costo_referencia == Decimal("800.0000")
    assert articulo.capacidades is capacidades
    assert articulo.estado is EstadoArticulo.ACTIVO
    assert articulo.version == 1
    assert articulo.created_at == AHORA
    assert articulo.updated_at == AHORA
    assert articulo.esta_activo() is True


def test_crear_servicio_vendible_valido() -> None:
    articulo = ArticuloCatalogo.crear(
        id=uuid4(),
        negocio_id=uuid4(),
        categoria_id=None,
        nombre="Asesoramiento",
        descripcion=None,
        tipo=TipoArticulo.SERVICIO,
        unidad_medida=UnidadMedida.HORA,
        sku=None,
        precio_base=Decimal("5000.0000"),
        costo_referencia=None,
        capacidades=capacidades_servicio_vendible(),
        creado_en=AHORA,
    )

    assert articulo.tipo is TipoArticulo.SERVICIO
    assert articulo.unidad_medida is UnidadMedida.HORA
    assert articulo.capacidades.controla_stock is False
    assert articulo.esta_activo() is True


def test_constructor_permite_rehidratar_inactivo_sin_usos_operativos() -> None:
    articulo = crear_articulo(
        estado=EstadoArticulo.INACTIVO,
        capacidades=capacidades_sin_usos(),
        precio_base=None,
        costo_referencia=None,
        version=7,
    )

    assert articulo.estado is EstadoArticulo.INACTIVO
    assert articulo.esta_activo() is False
    assert articulo.version == 7


def test_activo_sin_uso_operativo_rechaza() -> None:
    with pytest.raises(ArticuloActivoSinUsoError):
        crear_articulo(
            capacidades=capacidades_sin_usos(),
            precio_base=None,
            costo_referencia=None,
        )


def test_servicio_con_capacidades_de_stock_rechaza() -> None:
    capacidades = CapacidadesArticulo(
        es_comprable=True,
        es_vendible=False,
        controla_stock=True,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )

    with pytest.raises(CapacidadesInvalidasError):
        crear_articulo(
            tipo=TipoArticulo.SERVICIO,
            capacidades=capacidades,
            precio_base=None,
        )


def test_vendible_sin_precio_rechaza() -> None:
    with pytest.raises(PrecioInvalidoError):
        crear_articulo(precio_base=None)


def test_no_vendible_puede_conservar_precio_referencial() -> None:
    capacidades = CapacidadesArticulo(
        es_comprable=True,
        es_vendible=False,
        controla_stock=True,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )

    articulo = crear_articulo(
        capacidades=capacidades,
        precio_base=Decimal("1000.0000"),
    )

    assert articulo.precio_base == Decimal("1000.0000")
    assert articulo.capacidades.es_vendible is False


def test_precio_cero_es_valido_para_articulo_vendible() -> None:
    articulo = crear_articulo(precio_base=Decimal("0"))

    assert articulo.precio_base == Decimal("0")


@pytest.mark.parametrize("field_name", ["precio_base", "costo_referencia"])
@pytest.mark.parametrize(
    "value",
    [1500.0, 1500, "1500.0000", True],
)
def test_valores_economicos_rechazan_tipos_que_no_son_decimal(
    field_name: str,
    value: object,
) -> None:
    with pytest.raises(PrecioInvalidoError):
        crear_articulo(**{field_name: value})


@pytest.mark.parametrize("field_name", ["precio_base", "costo_referencia"])
def test_valores_economicos_rechazan_negativos(field_name: str) -> None:
    with pytest.raises(PrecioInvalidoError):
        crear_articulo(**{field_name: Decimal("-0.0001")})


@pytest.mark.parametrize(
    "value",
    [
        Decimal("NaN"),
        Decimal("Infinity"),
        Decimal("-Infinity"),
    ],
)
def test_valores_economicos_rechazan_decimales_no_finitos(value: Decimal) -> None:
    with pytest.raises(PrecioInvalidoError):
        crear_articulo(precio_base=value)


@pytest.mark.parametrize("field_name", ["id", "negocio_id", "categoria_id"])
def test_articulo_rechaza_identificadores_que_no_son_uuid4(
    field_name: str,
) -> None:
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_articulo(**{field_name: uuid_v1})


def test_articulo_permite_categoria_ausente() -> None:
    articulo = crear_articulo(categoria_id=None)

    assert articulo.categoria_id is None


@pytest.mark.parametrize("nombre", ["", "   ", 123])
def test_articulo_rechaza_nombre_invalido(nombre: object) -> None:
    with pytest.raises(NombreInvalidoError):
        crear_articulo(nombre=nombre)


def test_articulo_nombre_aplica_normalizacion_local_de_espacios_externos() -> None:
    articulo = crear_articulo(nombre="  Harina  ")

    assert articulo.nombre == "Harina"


@pytest.mark.parametrize("field_name", ["descripcion", "sku"])
@pytest.mark.parametrize("value", ["", "   ", 123])
def test_textos_opcionales_requieren_none_o_texto_funcional(
    field_name: str,
    value: object,
) -> None:
    with pytest.raises(ArticuloInvalidoError):
        crear_articulo(**{field_name: value})


def test_sku_visible_no_inventa_normalizacion_de_mayusculas() -> None:
    articulo = crear_articulo(sku="prod-001-A")

    assert articulo.sku == "prod-001-A"


def test_descripcion_y_sku_none_representan_ausencia_canonica() -> None:
    articulo = crear_articulo(descripcion=None, sku=None)

    assert articulo.descripcion is None
    assert articulo.sku is None


@pytest.mark.parametrize(
    ("field_name", "value"),
    [
        ("tipo", "BIEN"),
        ("unidad_medida", "UNIDAD"),
        ("estado", "ACTIVO"),
        ("capacidades", object()),
    ],
)
def test_articulo_rechaza_tipos_de_dominio_fuera_de_su_contrato(
    field_name: str,
    value: object,
) -> None:
    with pytest.raises(ArticuloInvalidoError):
        crear_articulo(**{field_name: value})


@pytest.mark.parametrize("version", [0, -1, True])
def test_articulo_rechaza_version_invalida(version: object) -> None:
    with pytest.raises(VersionInvalidaError):
        crear_articulo(version=version)


@pytest.mark.parametrize("field_name", ["created_at", "updated_at"])
def test_articulo_rechaza_timestamps_sin_zona_horaria(field_name: str) -> None:
    with pytest.raises(FechaInvalidaError):
        crear_articulo(**{field_name: datetime(2026, 10, 29, 12, 0)})


def test_articulo_normaliza_timestamps_con_offset_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    instante = datetime(2026, 10, 29, 9, 0, tzinfo=buenos_aires)

    articulo = crear_articulo(created_at=instante, updated_at=instante)

    assert articulo.created_at == AHORA
    assert articulo.updated_at == AHORA


def test_tipo_articulo_no_tiene_setter_publico() -> None:
    articulo = crear_articulo(tipo=TipoArticulo.BIEN)

    with pytest.raises(AttributeError):
        articulo.tipo = TipoArticulo.SERVICIO  # type: ignore[misc]

    assert articulo.tipo is TipoArticulo.BIEN


def test_identidad_y_tenant_no_tienen_setters_publicos() -> None:
    articulo = crear_articulo()

    with pytest.raises(AttributeError):
        articulo.id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        articulo.negocio_id = uuid4()  # type: ignore[misc]


def test_3c_no_expone_mutaciones_de_edicion_estado_o_imagenes() -> None:
    articulo = crear_articulo()

    assert not hasattr(articulo, "aplicar_edicion")
    assert not hasattr(articulo, "desactivar")
    assert not hasattr(articulo, "reactivar")
    assert not hasattr(articulo, "reemplazar_imagenes")
