from dataclasses import FrozenInstanceError
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from app.domain.catalog.articulo import ArticuloCatalogo
from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import EstadoArticulo, TipoArticulo, UnidadMedida
from app.domain.catalog.errors import (
    ArticuloActivoSinUsoError,
    ArticuloInvalidoError,
    ArticuloYaActivoError,
    ArticuloYaInactivoError,
    CapacidadesInvalidasError,
    PrecioInvalidoError,
)
from app.domain.catalog.propuesta import PropuestaEdicionPreparada
from app.domain.common.exceptions import FechaInvalidaError, NombreInvalidoError

AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)
DESPUES = datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def capacidades_vendible() -> CapacidadesArticulo:
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
        permite_descuento=False,
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
        "nombre": "Snack",
        "descripcion": "Original",
        "tipo": TipoArticulo.BIEN,
        "unidad_medida": UnidadMedida.UNIDAD,
        "sku": "SKU-1",
        "precio_base": Decimal("1500.0000"),
        "costo_referencia": Decimal("800.0000"),
        "capacidades": capacidades_vendible(),
        "estado": EstadoArticulo.ACTIVO,
        "version": 4,
        "created_at": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return ArticuloCatalogo(**data)  # type: ignore[arg-type]


def propuesta_desde(
    articulo: ArticuloCatalogo,
    **overrides: object,
) -> PropuestaEdicionPreparada:
    data: dict[str, object] = {
        "nombre": articulo.nombre,
        "descripcion": articulo.descripcion,
        "categoria_id": articulo.categoria_id,
        "sku": articulo.sku,
        "unidad_medida": articulo.unidad_medida,
        "precio_base": articulo.precio_base,
        "costo_referencia": articulo.costo_referencia,
        "capacidades": articulo.capacidades,
    }
    data.update(overrides)
    return PropuestaEdicionPreparada(**data)  # type: ignore[arg-type]


def snapshot(articulo: ArticuloCatalogo) -> tuple[object, ...]:
    return (
        articulo.nombre,
        articulo.descripcion,
        articulo.categoria_id,
        articulo.sku,
        articulo.unidad_medida,
        articulo.precio_base,
        articulo.costo_referencia,
        articulo.capacidades,
        articulo.estado,
        articulo.version,
        articulo.updated_at,
    )


def test_propuesta_preparada_es_inmutable() -> None:
    articulo = crear_articulo()
    propuesta = propuesta_desde(articulo)

    with pytest.raises(FrozenInstanceError):
        propuesta.nombre = "Otro"  # type: ignore[misc]


def test_propuesta_no_expone_tipo_ni_estado_editables() -> None:
    articulo = crear_articulo()
    propuesta = propuesta_desde(articulo)

    assert not hasattr(propuesta, "tipo")
    assert not hasattr(propuesta, "estado")


def test_edicion_valida_activo_aplica_todos_los_campos_y_conserva_estado() -> None:
    articulo = crear_articulo()
    categoria_id = uuid4()
    nuevas_capacidades = CapacidadesArticulo(
        es_comprable=False,
        es_vendible=True,
        controla_stock=False,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )
    propuesta = propuesta_desde(
        articulo,
        nombre="  Servicio asociado  ",
        descripcion=None,
        categoria_id=categoria_id,
        sku=None,
        unidad_medida=UnidadMedida.HORA,
        precio_base=Decimal("2500.0000"),
        costo_referencia=None,
        capacidades=nuevas_capacidades,
    )

    articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert articulo.nombre == "Servicio asociado"
    assert articulo.descripcion is None
    assert articulo.categoria_id == categoria_id
    assert articulo.sku is None
    assert articulo.unidad_medida is UnidadMedida.HORA
    assert articulo.precio_base == Decimal("2500.0000")
    assert articulo.costo_referencia is None
    assert articulo.capacidades is nuevas_capacidades
    assert articulo.estado is EstadoArticulo.ACTIVO
    assert articulo.tipo is TipoArticulo.BIEN
    assert articulo.version == 4
    assert articulo.updated_at == DESPUES


def test_edicion_vendible_sin_precio_es_atomica() -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)
    propuesta = propuesta_desde(
        articulo,
        nombre="Nombre que no debe quedar",
        precio_base=None,
    )

    with pytest.raises(PrecioInvalidoError):
        articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert snapshot(articulo) == antes


def test_edicion_activo_sin_usos_es_atomica_y_no_desactiva() -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)
    propuesta = propuesta_desde(
        articulo,
        nombre="No persistir",
        capacidades=capacidades_sin_usos(),
        precio_base=None,
    )

    with pytest.raises(ArticuloActivoSinUsoError):
        articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert snapshot(articulo) == antes
    assert articulo.estado is EstadoArticulo.ACTIVO


def test_deshabilitar_venta_coherentemente_conserva_precio() -> None:
    articulo = crear_articulo()
    capacidades_sin_venta = CapacidadesArticulo(
        es_comprable=True,
        es_vendible=False,
        controla_stock=True,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )
    propuesta = propuesta_desde(
        articulo,
        capacidades=capacidades_sin_venta,
    )

    articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert articulo.capacidades.es_vendible is False
    assert articulo.capacidades.permite_descuento is False
    assert articulo.precio_base == Decimal("1500.0000")
    assert articulo.estado is EstadoArticulo.ACTIVO


def test_deshabilitar_venta_no_auto_corrige_descuento_incoherente() -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)

    with pytest.raises(CapacidadesInvalidasError):
        CapacidadesArticulo(
            es_comprable=True,
            es_vendible=False,
            controla_stock=True,
            puede_usarse_en_produccion=False,
            controla_vencimiento=False,
            permite_descuento=True,
        )

    assert snapshot(articulo) == antes


def test_edicion_inactivo_permite_cero_usos_y_no_reactiva() -> None:
    articulo = crear_articulo(estado=EstadoArticulo.INACTIVO)
    propuesta = propuesta_desde(
        articulo,
        nombre="Preparado pero inactivo",
        capacidades=capacidades_sin_usos(),
        precio_base=None,
        costo_referencia=None,
    )

    articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert articulo.nombre == "Preparado pero inactivo"
    assert articulo.capacidades.tiene_al_menos_un_uso_operativo() is False
    assert articulo.precio_base is None
    assert articulo.estado is EstadoArticulo.INACTIVO
    assert articulo.updated_at == DESPUES


def test_edicion_incompatible_con_tipo_es_atomica() -> None:
    articulo = crear_articulo(
        tipo=TipoArticulo.SERVICIO,
        unidad_medida=UnidadMedida.HORA,
        capacidades=capacidades_servicio_vendible(),
    )
    capacidades_stock = CapacidadesArticulo(
        es_comprable=True,
        es_vendible=False,
        controla_stock=True,
        puede_usarse_en_produccion=False,
        controla_vencimiento=False,
        permite_descuento=False,
    )
    antes = snapshot(articulo)
    propuesta = propuesta_desde(
        articulo,
        capacidades=capacidades_stock,
        precio_base=None,
    )

    with pytest.raises(CapacidadesInvalidasError):
        articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert snapshot(articulo) == antes


@pytest.mark.parametrize(
    ("field_name", "value", "error"),
    [
        ("nombre", "   ", NombreInvalidoError),
        ("descripcion", "   ", ArticuloInvalidoError),
        ("sku", "   ", ArticuloInvalidoError),
        ("unidad_medida", "UNIDAD", ArticuloInvalidoError),
        ("precio_base", 100.0, PrecioInvalidoError),
        ("costo_referencia", Decimal("-1"), PrecioInvalidoError),
        ("capacidades", object(), ArticuloInvalidoError),
    ],
)
def test_edicion_invalida_no_muta_ningun_campo(
    field_name: str,
    value: object,
    error: type[Exception],
) -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)
    propuesta = propuesta_desde(articulo, **{field_name: value})

    with pytest.raises(error):
        articulo.aplicar_edicion(propuesta, actualizado_en=DESPUES)

    assert snapshot(articulo) == antes


def test_edicion_rechaza_propuesta_que_no_es_parameter_object() -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)

    with pytest.raises(ArticuloInvalidoError):
        articulo.aplicar_edicion(  # type: ignore[arg-type]
            object(),
            actualizado_en=DESPUES,
        )

    assert snapshot(articulo) == antes


def test_edicion_rechaza_timestamp_naive_sin_mutar() -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)
    propuesta = propuesta_desde(articulo, nombre="No debe quedar")

    with pytest.raises(FechaInvalidaError):
        articulo.aplicar_edicion(
            propuesta,
            actualizado_en=datetime(2026, 10, 29, 13, 0),
        )

    assert snapshot(articulo) == antes


def test_edicion_normaliza_updated_at_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    instante = datetime(2026, 10, 29, 10, 0, tzinfo=buenos_aires)
    articulo = crear_articulo()
    propuesta = propuesta_desde(articulo, nombre="Editado")

    articulo.aplicar_edicion(propuesta, actualizado_en=instante)

    assert articulo.updated_at == DESPUES


def test_desactivar_activo_conserva_configuracion_y_version() -> None:
    articulo = crear_articulo()
    configuracion = snapshot(articulo)[:-3]

    articulo.desactivar(actualizado_en=DESPUES)

    assert articulo.estado is EstadoArticulo.INACTIVO
    assert snapshot(articulo)[:-3] == configuracion
    assert articulo.version == 4
    assert articulo.updated_at == DESPUES


def test_desactivar_inactivo_rechaza_sin_mutar() -> None:
    articulo = crear_articulo(estado=EstadoArticulo.INACTIVO)
    antes = snapshot(articulo)

    with pytest.raises(ArticuloYaInactivoError):
        articulo.desactivar(actualizado_en=DESPUES)

    assert snapshot(articulo) == antes


def test_reactivar_inactivo_con_configuracion_valida() -> None:
    articulo = crear_articulo(estado=EstadoArticulo.INACTIVO)
    configuracion = snapshot(articulo)[:-3]

    articulo.reactivar(actualizado_en=DESPUES)

    assert articulo.estado is EstadoArticulo.ACTIVO
    assert snapshot(articulo)[:-3] == configuracion
    assert articulo.version == 4
    assert articulo.updated_at == DESPUES


def test_reactivar_sin_usos_rechaza_y_permanece_inactivo() -> None:
    articulo = crear_articulo(
        estado=EstadoArticulo.INACTIVO,
        capacidades=capacidades_sin_usos(),
        precio_base=None,
        costo_referencia=None,
    )
    antes = snapshot(articulo)

    with pytest.raises(ArticuloActivoSinUsoError):
        articulo.reactivar(actualizado_en=DESPUES)

    assert snapshot(articulo) == antes


def test_reactivar_activo_rechaza_sin_mutar() -> None:
    articulo = crear_articulo()
    antes = snapshot(articulo)

    with pytest.raises(ArticuloYaActivoError):
        articulo.reactivar(actualizado_en=DESPUES)

    assert snapshot(articulo) == antes


@pytest.mark.parametrize("operacion", ["desactivar", "reactivar"])
def test_transicion_de_estado_rechaza_timestamp_naive_sin_mutar(
    operacion: str,
) -> None:
    estado = (
        EstadoArticulo.ACTIVO
        if operacion == "desactivar"
        else EstadoArticulo.INACTIVO
    )
    articulo = crear_articulo(estado=estado)
    antes = snapshot(articulo)

    with pytest.raises(FechaInvalidaError):
        getattr(articulo, operacion)(
            actualizado_en=datetime(2026, 10, 29, 13, 0),
        )

    assert snapshot(articulo) == antes
