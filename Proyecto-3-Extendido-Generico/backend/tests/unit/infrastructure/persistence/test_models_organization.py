from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Text,
    Uuid,
)

from app.infrastructure.persistence.models import (
    Base,
    InvitacionNegocioModel,
    NegocioModalidadModel,
    NegocioModel,
    UsuarioModel,
    UsuarioNegocioModel,
)

M01_TABLES = {
    "usuario",
    "negocio",
    "negocio_modalidad",
    "usuario_negocio",
    "invitacion_negocio",
}


def constraint_names(model: type[Base]) -> set[str]:
    return {
        constraint.name
        for constraint in model.__table__.constraints
        if constraint.name is not None
    }


def index_names(model: type[Base]) -> set[str]:
    return {index.name for index in model.__table__.indexes if index.name is not None}


def check_sql(model: type[Base]) -> dict[str, str]:
    return {
        constraint.name: str(constraint.sqltext)
        for constraint in model.__table__.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name is not None
    }


def test_m01_tables_are_registered_in_shared_metadata() -> None:
    assert M01_TABLES <= set(Base.metadata.tables)


def test_models_use_frozen_singular_table_names() -> None:
    assert UsuarioModel.__tablename__ == "usuario"
    assert NegocioModel.__tablename__ == "negocio"
    assert NegocioModalidadModel.__tablename__ == "negocio_modalidad"
    assert UsuarioNegocioModel.__tablename__ == "usuario_negocio"
    assert InvitacionNegocioModel.__tablename__ == "invitacion_negocio"


def test_usuario_matches_frozen_physical_columns() -> None:
    table = UsuarioModel.__table__

    assert set(table.columns.keys()) == {
        "id",
        "nombre",
        "email",
        "email_normalizado",
        "password_hash",
        "fecha_registro",
        "updated_at",
    }
    assert isinstance(table.c.id.type, Uuid)
    assert isinstance(table.c.nombre.type, Text)
    assert table.c.nombre.nullable is False
    assert table.c.email_normalizado.nullable is False
    assert table.c.password_hash.nullable is False
    assert table.c.fecha_registro.type.timezone is True
    assert table.c.updated_at.type.timezone is True
    assert "uq_usuario_email_normalizado" in constraint_names(UsuarioModel)


def test_usuario_does_not_invent_version_or_created_at() -> None:
    assert "version" not in UsuarioModel.__table__.c
    assert "created_at" not in UsuarioModel.__table__.c


def test_negocio_matches_nullable_rubro_bigint_version_and_optimistic_lock() -> None:
    table = NegocioModel.__table__

    assert table.c.rubro.nullable is True
    assert isinstance(table.c.version.type, BigInteger)
    assert table.c.version.nullable is False
    assert table.c.created_at.type.timezone is True
    assert table.c.updated_at.type.timezone is True
    assert NegocioModel.__mapper__.version_id_col is table.c.version
    assert {
        "ck_negocio_negocio_nombre_no_vacio",
        "ck_negocio_negocio_rubro_funcional",
        "ck_negocio_negocio_moneda_base_valida",
        "ck_negocio_negocio_version_positiva",
    } <= constraint_names(NegocioModel)


def test_negocio_modalidad_is_structural_composite_primary_key_with_cascade() -> None:
    table = NegocioModalidadModel.__table__

    assert [column.name for column in table.primary_key.columns] == [
        "negocio_id",
        "modalidad",
    ]
    assert table.c.negocio_id.foreign_keys
    negocio_fk = next(iter(table.c.negocio_id.foreign_keys))
    assert negocio_fk.target_fullname == "negocio.id"
    assert negocio_fk.ondelete == "CASCADE"
    assert "ck_negocio_modalidad_negocio_modalidad_valida" in constraint_names(
        NegocioModalidadModel
    )


def test_usuario_negocio_has_history_and_tenant_safe_alternate_keys() -> None:
    names = constraint_names(UsuarioNegocioModel)

    assert "uq_usuario_negocio_usuario_negocio" in names
    assert "uq_usuario_negocio_id_negocio" in names
    assert "ck_usuario_negocio_usuario_negocio_rol_valido" in names
    assert "ck_usuario_negocio_usuario_negocio_estado_valido" in names
    assert "ck_usuario_negocio_usuario_negocio_version_positiva" in names


def test_usuario_negocio_uses_restrict_and_bigint_optimistic_lock() -> None:
    table = UsuarioNegocioModel.__table__

    usuario_fk = next(iter(table.c.usuario_id.foreign_keys))
    negocio_fk = next(iter(table.c.negocio_id.foreign_keys))

    assert usuario_fk.target_fullname == "usuario.id"
    assert usuario_fk.ondelete == "RESTRICT"
    assert negocio_fk.target_fullname == "negocio.id"
    assert negocio_fk.ondelete == "RESTRICT"
    assert isinstance(table.c.version.type, BigInteger)
    assert UsuarioNegocioModel.__mapper__.version_id_col is table.c.version


def test_usuario_negocio_has_required_operational_indexes() -> None:
    assert {
        "ix_usuario_negocio_negocio_estado_rol",
        "ix_usuario_negocio_usuario_estado",
    } <= index_names(UsuarioNegocioModel)


def test_invitacion_has_tenant_safe_composite_issuer_fk() -> None:
    composite_fks = [
        constraint
        for constraint in InvitacionNegocioModel.__table__.constraints
        if isinstance(constraint, ForeignKeyConstraint)
        and len(constraint.elements) == 2
    ]

    assert len(composite_fks) == 1
    constraint = composite_fks[0]
    assert [element.parent.name for element in constraint.elements] == [
        "emisor_usuario_negocio_id",
        "negocio_id",
    ]
    assert [element.target_fullname for element in constraint.elements] == [
        "usuario_negocio.id",
        "usuario_negocio.negocio_id",
    ]
    assert constraint.ondelete == "RESTRICT"


def test_invitacion_business_fk_is_restrict_not_cascade() -> None:
    negocio_fks = [
        foreign_key
        for foreign_key in InvitacionNegocioModel.__table__.c.negocio_id.foreign_keys
        if foreign_key.target_fullname == "negocio.id"
    ]

    assert len(negocio_fks) == 1
    assert negocio_fks[0].ondelete == "RESTRICT"


def test_invitacion_restricts_role_states_period_and_version() -> None:
    names = constraint_names(InvitacionNegocioModel)
    checks = check_sql(InvitacionNegocioModel)

    assert {
        "ck_invitacion_negocio_invitacion_email_destino_no_vacio",
        "ck_invitacion_negocio_invitacion_email_destino_normalizado_no_vacio",
        "ck_invitacion_negocio_invitacion_token_hash_no_vacio",
        "ck_invitacion_negocio_invitacion_rol_propuesto_valido",
        "ck_invitacion_negocio_invitacion_estado_valido",
        "ck_invitacion_negocio_invitacion_periodo_valido",
        "ck_invitacion_negocio_invitacion_version_positiva",
        "uq_invitacion_negocio_token_hash",
    } <= names
    assert checks["ck_invitacion_negocio_invitacion_rol_propuesto_valido"] == (
        "rol_propuesto IN ('ENCARGADO', 'TRABAJADOR')"
    )
    assert checks["ck_invitacion_negocio_invitacion_estado_valido"] == (
        "estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA')"
    )
    assert checks["ck_invitacion_negocio_invitacion_periodo_valido"] == (
        "fecha_expiracion > fecha_emision"
    )
    assert isinstance(InvitacionNegocioModel.__table__.c.version.type, BigInteger)
    assert InvitacionNegocioModel.__mapper__.version_id_col is (
        InvitacionNegocioModel.__table__.c.version
    )


def test_invitacion_has_frozen_partial_unique_and_query_indexes() -> None:
    indexes = {index.name: index for index in InvitacionNegocioModel.__table__.indexes}

    pending = indexes["uq_invitacion_pendiente"]
    assert isinstance(pending, Index)
    assert pending.unique is True
    assert [column.name for column in pending.columns] == [
        "negocio_id",
        "email_destino_normalizado",
    ]
    assert str(pending.dialect_options["postgresql"]["where"]) == (
        "estado = 'PENDIENTE'"
    )

    assert {
        "ix_invitacion_negocio_estado_expiracion",
        "ix_invitacion_email_estado",
    } <= set(indexes)


def test_timestamp_columns_are_timezone_aware() -> None:
    timestamps = [
        UsuarioModel.__table__.c.fecha_registro,
        UsuarioModel.__table__.c.updated_at,
        NegocioModel.__table__.c.created_at,
        NegocioModel.__table__.c.updated_at,
        UsuarioNegocioModel.__table__.c.fecha_incorporacion,
        UsuarioNegocioModel.__table__.c.updated_at,
        InvitacionNegocioModel.__table__.c.fecha_emision,
        InvitacionNegocioModel.__table__.c.fecha_expiracion,
        InvitacionNegocioModel.__table__.c.updated_at,
    ]

    assert all(
        isinstance(column.type, DateTime) and column.type.timezone
        for column in timestamps
    )


def test_no_relationships_or_repository_behaviour_are_introduced_in_4b() -> None:
    for model in (
        UsuarioModel,
        NegocioModel,
        NegocioModalidadModel,
        UsuarioNegocioModel,
        InvitacionNegocioModel,
    ):
        assert not model.__mapper__.relationships
