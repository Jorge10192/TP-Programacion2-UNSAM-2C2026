from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.domain.organization.email import Email
from app.domain.organization.enums import (
    EstadoMembresia,
    ModalidadOperativa,
    Moneda,
    Rol,
)
from app.domain.organization.errors import (
    IdentificadorNuevaMembresiaRequeridoError,
    MembresiaInactivaError,
    MembresiaNoPerteneceNegocioError,
    MembresiaNoPerteneceUsuarioError,
    MembresiaYaActivaError,
    MembresiaYaInactivaError,
    RolIncorporacionInvalidoError,
    RolSinCambiosError,
    UltimoPropietarioError,
)
from app.domain.organization.membresia import UsuarioNegocio
from app.domain.organization.negocio import Negocio
from app.domain.organization.usuario import Usuario

AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)
DESPUES = datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def crear_negocio(**overrides: object) -> Negocio:
    data: dict[str, object] = {
        "id": uuid4(),
        "nombre": "Negocio",
        "rubro": None,
        "moneda_base": Moneda.ARS,
        "modalidades": {ModalidadOperativa.REVENTA},
        "version": 3,
        "created_at": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return Negocio(**data)  # type: ignore[arg-type]


def crear_usuario(**overrides: object) -> Usuario:
    data: dict[str, object] = {
        "id": uuid4(),
        "email": Email("usuario@example.com"),
        "nombre": "Usuario",
        "fecha_registro": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return Usuario(**data)  # type: ignore[arg-type]


def crear_membresia(
    negocio: Negocio,
    **overrides: object,
) -> UsuarioNegocio:
    data: dict[str, object] = {
        "id": uuid4(),
        "usuario_id": uuid4(),
        "negocio_id": negocio.id,
        "rol": Rol.TRABAJADOR,
        "estado": EstadoMembresia.ACTIVO,
        "fecha_incorporacion": AHORA,
        "version": 1,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return UsuarioNegocio(**data)  # type: ignore[arg-type]


@pytest.mark.parametrize("rol", [Rol.ENCARGADO, Rol.TRABAJADOR])
def test_incorporar_usuario_nuevo_crea_membresia_activa_con_rol_permitido(
    rol: Rol,
) -> None:
    negocio = crear_negocio()
    usuario = crear_usuario()
    membresia_id = uuid4()

    membresia = negocio.incorporar_o_reactivar_miembro(
        usuario=usuario,
        rol_inicial=rol,
        membresia_historica=None,
        nueva_membresia_id=membresia_id,
        actualizado_en=DESPUES,
    )

    assert membresia.id == membresia_id
    assert membresia.usuario_id == usuario.id
    assert membresia.negocio_id == negocio.id
    assert membresia.rol is rol
    assert membresia.estado is EstadoMembresia.ACTIVO
    assert membresia.fecha_incorporacion == DESPUES
    assert membresia.version == 1


def test_incorporar_usuario_nuevo_requiere_id_suministrado_por_application() -> None:
    negocio = crear_negocio()
    usuario = crear_usuario()

    with pytest.raises(IdentificadorNuevaMembresiaRequeridoError):
        negocio.incorporar_o_reactivar_miembro(
            usuario=usuario,
            rol_inicial=Rol.TRABAJADOR,
            membresia_historica=None,
            nueva_membresia_id=None,
            actualizado_en=DESPUES,
        )


def test_incorporacion_normal_no_admite_propietario() -> None:
    negocio = crear_negocio()
    usuario = crear_usuario()

    with pytest.raises(RolIncorporacionInvalidoError):
        negocio.incorporar_o_reactivar_miembro(
            usuario=usuario,
            rol_inicial=Rol.PROPIETARIO,
            membresia_historica=None,
            nueva_membresia_id=uuid4(),
            actualizado_en=DESPUES,
        )


def test_reactivar_membresia_historica_reutiliza_misma_identidad() -> None:
    negocio = crear_negocio()
    usuario = crear_usuario()
    historica = crear_membresia(
        negocio,
        usuario_id=usuario.id,
        rol=Rol.PROPIETARIO,
        estado=EstadoMembresia.INACTIVO,
        fecha_incorporacion=AHORA,
        version=8,
    )

    resultado = negocio.incorporar_o_reactivar_miembro(
        usuario=usuario,
        rol_inicial=Rol.TRABAJADOR,
        membresia_historica=historica,
        nueva_membresia_id=None,
        actualizado_en=DESPUES,
    )

    assert resultado is historica
    assert resultado.estado is EstadoMembresia.ACTIVO
    assert resultado.rol is Rol.TRABAJADOR
    assert resultado.fecha_incorporacion == AHORA
    assert resultado.version == 8
    assert resultado.updated_at == DESPUES


def test_reactivar_membresia_ya_activa_rechaza_sin_cambiar_rol() -> None:
    negocio = crear_negocio()
    usuario = crear_usuario()
    historica = crear_membresia(
        negocio,
        usuario_id=usuario.id,
        rol=Rol.ENCARGADO,
    )

    with pytest.raises(MembresiaYaActivaError):
        negocio.incorporar_o_reactivar_miembro(
            usuario=usuario,
            rol_inicial=Rol.TRABAJADOR,
            membresia_historica=historica,
            nueva_membresia_id=None,
            actualizado_en=DESPUES,
        )

    assert historica.rol is Rol.ENCARGADO
    assert historica.estado is EstadoMembresia.ACTIVO
    assert historica.updated_at == AHORA


def test_reactivar_rechaza_membresia_historica_de_otro_negocio() -> None:
    negocio = crear_negocio()
    otro_negocio = crear_negocio()
    usuario = crear_usuario()
    historica = crear_membresia(
        otro_negocio,
        usuario_id=usuario.id,
        estado=EstadoMembresia.INACTIVO,
    )

    with pytest.raises(MembresiaNoPerteneceNegocioError):
        negocio.incorporar_o_reactivar_miembro(
            usuario=usuario,
            rol_inicial=Rol.TRABAJADOR,
            membresia_historica=historica,
            nueva_membresia_id=None,
            actualizado_en=DESPUES,
        )


def test_reactivar_rechaza_membresia_historica_de_otro_usuario() -> None:
    negocio = crear_negocio()
    usuario = crear_usuario()
    historica = crear_membresia(
        negocio,
        usuario_id=uuid4(),
        estado=EstadoMembresia.INACTIVO,
    )

    with pytest.raises(MembresiaNoPerteneceUsuarioError):
        negocio.incorporar_o_reactivar_miembro(
            usuario=usuario,
            rol_inicial=Rol.ENCARGADO,
            membresia_historica=historica,
            nueva_membresia_id=None,
            actualizado_en=DESPUES,
        )


def test_tiene_propietario_activo_considera_solo_mismo_negocio_y_activos() -> None:
    negocio = crear_negocio()
    otro_negocio = crear_negocio()
    propietario_inactivo = crear_membresia(
        negocio,
        rol=Rol.PROPIETARIO,
        estado=EstadoMembresia.INACTIVO,
    )
    propietario_ajeno = crear_membresia(
        otro_negocio,
        rol=Rol.PROPIETARIO,
    )

    assert (
        negocio.tiene_propietario_activo(
            [propietario_inactivo, propietario_ajeno],
        )
        is False
    )

    propietario_local = crear_membresia(negocio, rol=Rol.PROPIETARIO)
    assert negocio.tiene_propietario_activo([propietario_local]) is True


@pytest.mark.parametrize("rol", [Rol.ENCARGADO, Rol.TRABAJADOR])
def test_desactivar_miembro_regular_pasa_a_inactivo_y_conserva_rol(
    rol: Rol,
) -> None:
    negocio = crear_negocio()
    miembro = crear_membresia(negocio, rol=rol)

    negocio.desactivar_miembro(
        miembro,
        membresias_contexto=[miembro],
        actualizado_en=DESPUES,
    )

    assert miembro.estado is EstadoMembresia.INACTIVO
    assert miembro.rol is rol
    assert miembro.updated_at == DESPUES


def test_desactivar_miembro_ya_inactivo_rechaza_sin_mutar() -> None:
    negocio = crear_negocio()
    miembro = crear_membresia(
        negocio,
        rol=Rol.TRABAJADOR,
        estado=EstadoMembresia.INACTIVO,
    )

    with pytest.raises(MembresiaYaInactivaError):
        negocio.desactivar_miembro(
            miembro,
            membresias_contexto=[miembro],
            actualizado_en=DESPUES,
        )

    assert miembro.updated_at == AHORA


def test_desactivar_unico_propietario_activo_rechaza_sin_mutar() -> None:
    negocio = crear_negocio()
    propietario = crear_membresia(negocio, rol=Rol.PROPIETARIO)

    with pytest.raises(UltimoPropietarioError):
        negocio.desactivar_miembro(
            propietario,
            membresias_contexto=[propietario],
            actualizado_en=DESPUES,
        )

    assert propietario.estado is EstadoMembresia.ACTIVO
    assert propietario.updated_at == AHORA


def test_propietario_inactivo_no_cuenta_como_respaldo_del_ultimo_propietario() -> None:
    negocio = crear_negocio()
    objetivo = crear_membresia(negocio, rol=Rol.PROPIETARIO)
    otro = crear_membresia(
        negocio,
        rol=Rol.PROPIETARIO,
        estado=EstadoMembresia.INACTIVO,
    )

    with pytest.raises(UltimoPropietarioError):
        negocio.desactivar_miembro(
            objetivo,
            membresias_contexto=[objetivo, otro],
            actualizado_en=DESPUES,
        )


def test_propietario_de_otro_negocio_no_cuenta_como_respaldo() -> None:
    negocio = crear_negocio()
    otro_negocio = crear_negocio()
    objetivo = crear_membresia(negocio, rol=Rol.PROPIETARIO)
    propietario_ajeno = crear_membresia(otro_negocio, rol=Rol.PROPIETARIO)

    with pytest.raises(UltimoPropietarioError):
        negocio.desactivar_miembro(
            objetivo,
            membresias_contexto=[objetivo, propietario_ajeno],
            actualizado_en=DESPUES,
        )


def test_desactivar_propietario_con_otro_propietario_activo_permite_operacion() -> None:
    negocio = crear_negocio()
    objetivo = crear_membresia(negocio, rol=Rol.PROPIETARIO)
    otro = crear_membresia(negocio, rol=Rol.PROPIETARIO)

    negocio.desactivar_miembro(
        objetivo,
        membresias_contexto=[objetivo, otro],
        actualizado_en=DESPUES,
    )

    assert objetivo.estado is EstadoMembresia.INACTIVO
    assert otro.estado is EstadoMembresia.ACTIVO


def test_desactivar_membresia_de_otro_negocio_rechaza() -> None:
    negocio = crear_negocio()
    otro_negocio = crear_negocio()
    miembro_ajeno = crear_membresia(otro_negocio)

    with pytest.raises(MembresiaNoPerteneceNegocioError):
        negocio.desactivar_miembro(
            miembro_ajeno,
            membresias_contexto=[miembro_ajeno],
            actualizado_en=DESPUES,
        )


def test_cambiar_rol_miembro_activo_cambia_solo_el_rol() -> None:
    negocio = crear_negocio()
    miembro = crear_membresia(negocio, rol=Rol.TRABAJADOR)

    negocio.cambiar_rol_miembro(
        miembro,
        Rol.ENCARGADO,
        membresias_contexto=[miembro],
        actualizado_en=DESPUES,
    )

    assert miembro.rol is Rol.ENCARGADO
    assert miembro.estado is EstadoMembresia.ACTIVO
    assert miembro.updated_at == DESPUES


def test_promocion_explicita_a_propietario_es_valida() -> None:
    negocio = crear_negocio()
    miembro = crear_membresia(negocio, rol=Rol.TRABAJADOR)

    negocio.cambiar_rol_miembro(
        miembro,
        Rol.PROPIETARIO,
        membresias_contexto=[miembro],
        actualizado_en=DESPUES,
    )

    assert miembro.rol is Rol.PROPIETARIO
    assert miembro.estado is EstadoMembresia.ACTIVO


@pytest.mark.parametrize("nuevo_rol", [Rol.ENCARGADO, Rol.TRABAJADOR])
def test_degradar_unico_propietario_activo_rechaza(
    nuevo_rol: Rol,
) -> None:
    negocio = crear_negocio()
    propietario = crear_membresia(negocio, rol=Rol.PROPIETARIO)

    with pytest.raises(UltimoPropietarioError):
        negocio.cambiar_rol_miembro(
            propietario,
            nuevo_rol,
            membresias_contexto=[propietario],
            actualizado_en=DESPUES,
        )

    assert propietario.rol is Rol.PROPIETARIO
    assert propietario.updated_at == AHORA


def test_degradar_propietario_con_otro_activo_permite_operacion() -> None:
    negocio = crear_negocio()
    objetivo = crear_membresia(negocio, rol=Rol.PROPIETARIO)
    otro = crear_membresia(negocio, rol=Rol.PROPIETARIO)

    negocio.cambiar_rol_miembro(
        objetivo,
        Rol.ENCARGADO,
        membresias_contexto=[objetivo, otro],
        actualizado_en=DESPUES,
    )

    assert objetivo.rol is Rol.ENCARGADO
    assert objetivo.estado is EstadoMembresia.ACTIVO
    assert otro.rol is Rol.PROPIETARIO


def test_cambiar_rol_de_membresia_inactiva_rechaza() -> None:
    negocio = crear_negocio()
    miembro = crear_membresia(
        negocio,
        rol=Rol.TRABAJADOR,
        estado=EstadoMembresia.INACTIVO,
    )

    with pytest.raises(MembresiaInactivaError):
        negocio.cambiar_rol_miembro(
            miembro,
            Rol.ENCARGADO,
            membresias_contexto=[miembro],
            actualizado_en=DESPUES,
        )


def test_cambiar_rol_al_mismo_valor_rechaza_no_op() -> None:
    negocio = crear_negocio()
    miembro = crear_membresia(negocio, rol=Rol.ENCARGADO)

    with pytest.raises(RolSinCambiosError):
        negocio.cambiar_rol_miembro(
            miembro,
            Rol.ENCARGADO,
            membresias_contexto=[miembro],
            actualizado_en=DESPUES,
        )


def test_cambiar_rol_de_membresia_de_otro_negocio_rechaza() -> None:
    negocio = crear_negocio()
    otro_negocio = crear_negocio()
    miembro_ajeno = crear_membresia(otro_negocio)

    with pytest.raises(MembresiaNoPerteneceNegocioError):
        negocio.cambiar_rol_miembro(
            miembro_ajeno,
            Rol.ENCARGADO,
            membresias_contexto=[miembro_ajeno],
            actualizado_en=DESPUES,
        )


def test_operaciones_de_membresia_no_modifican_version_ni_updated_at_del_negocio() -> None:
    negocio = crear_negocio(version=9, updated_at=AHORA)
    miembro = crear_membresia(negocio, rol=Rol.TRABAJADOR)

    negocio.cambiar_rol_miembro(
        miembro,
        Rol.ENCARGADO,
        membresias_contexto=[miembro],
        actualizado_en=DESPUES,
    )

    assert negocio.version == 9
    assert negocio.updated_at == AHORA
