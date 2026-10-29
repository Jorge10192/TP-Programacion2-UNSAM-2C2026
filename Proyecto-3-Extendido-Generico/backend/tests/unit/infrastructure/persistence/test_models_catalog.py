from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.infrastructure.persistence.models import (
    ArticuloCatalogoModel,
    ArticuloImagenModel,
    AuditoriaCambioModel,
    Base,
    CategoriaModel,
)


BLOQUE1_TABLES = {
    "usuario",
    "negocio",
    "negocio_modalidad",
    "usuario_negocio",
    "invitacion_negocio",
    "categoria",
    "articulo_catalogo",
    "articulo_imagen",
    "auditoria_cambio",
}

CAPACIDAD_COLUMNS = {
    "es_comprable",
    "es_vendible",
    "controla_stock",
    "puede_usarse_en_produccion",
    "controla_vencimiento",
    "permite_descuento",
}


def constraint_names(model: type[Base]) -> set[str]:
    return {
        constraint.name
        for constraint in model.__table__.constraints
        if constraint.name is not None
    }


def check_sql(model: type[Base]) -> dict[str, str]:
    return {
        constraint.name: str(constraint.sqltext)
        for constraint in model.__table__.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name is not None
    }


def unique_constraints(model: type[Base]) -> dict[str, UniqueConstraint]:
    return {
        constraint.name: constraint
        for constraint in model.__table__.constraints
        if isinstance(constraint, UniqueConstraint) and constraint.name is not None
    }


def indexes(model: type[Base]) -> dict[str, Index]:
    return {
        index.name: index
        for index in model.__table__.indexes
        if index.name is not None
    }


def test_block1_registers_m01_m02_and_audit_tables_in_shared_metadata() -> None:
    assert BLOQUE1_TABLES <= set(Base.metadata.tables)
    assert "capacidades_articulo" not in Base.metadata.tables


def test_categoria_matches_frozen_columns_and_optimistic_locking() -> None:
    table = CategoriaModel.__table__

    assert set(table.columns.keys()) == {
        "id",
        "negocio_id",
        "nombre",
        "nombre_normalizado",
        "estado",
        "version",
        "created_at",
        "updated_at",
    }
    assert isinstance(table.c.id.type, Uuid)
    assert isinstance(table.c.nombre.type, Text)
    assert isinstance(table.c.version.type, BigInteger)
    assert table.c.created_at.type.timezone is True
    assert table.c.updated_at.type.timezone is True
    assert CategoriaModel.__mapper__.version_id_col is table.c.version


def test_categoria_has_frozen_uniqueness_checks_fk_and_index() -> None:
    table = CategoriaModel.__table__
    names = constraint_names(CategoriaModel)
    checks = check_sql(CategoriaModel)

    assert {
        "uq_categoria_negocio_nombre_normalizado",
        "uq_categoria_id_negocio",
        "ck_categoria_nombre_no_vacio",
        "ck_categoria_nombre_normalizado_no_vacio",
        "ck_categoria_estado_valido",
        "ck_categoria_version_positiva",
    } <= names
    assert checks["ck_categoria_estado_valido"] == (
        "estado IN ('ACTIVA', 'INACTIVA')"
    )

    negocio_fk = next(iter(table.c.negocio_id.foreign_keys))
    assert negocio_fk.target_fullname == "negocio.id"
    assert negocio_fk.ondelete == "RESTRICT"

    assert [
        column.name
        for column in indexes(CategoriaModel)["ix_categoria_negocio_estado"].columns
    ] == ["negocio_id", "estado"]


def test_articulo_uses_numeric_19_4_and_flattens_capabilities() -> None:
    table = ArticuloCatalogoModel.__table__

    assert CAPACIDAD_COLUMNS <= set(table.columns.keys())
    assert all(isinstance(table.c[name].type, Boolean) for name in CAPACIDAD_COLUMNS)

    for field_name in ("precio_base", "costo_referencia"):
        numeric = table.c[field_name].type
        assert isinstance(numeric, Numeric)
        assert numeric.precision == 19
        assert numeric.scale == 4

    assert isinstance(table.c.version.type, BigInteger)
    assert ArticuloCatalogoModel.__mapper__.version_id_col is table.c.version


def test_articulo_has_only_composite_tenant_safe_category_fk() -> None:
    table = ArticuloCatalogoModel.__table__
    category_constraints = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
        and any(
            element.target_fullname.startswith("categoria.")
            for element in constraint.elements
        )
    ]

    assert len(category_constraints) == 1
    constraint = category_constraints[0]
    assert [element.parent.name for element in constraint.elements] == [
        "categoria_id",
        "negocio_id",
    ]
    assert [element.target_fullname for element in constraint.elements] == [
        "categoria.id",
        "categoria.negocio_id",
    ]
    assert constraint.ondelete == "RESTRICT"
    assert constraint.match == "SIMPLE"


def test_articulo_has_direct_business_fk_with_restrict() -> None:
    negocio_fks = [
        foreign_key
        for foreign_key in ArticuloCatalogoModel.__table__.c.negocio_id.foreign_keys
        if foreign_key.target_fullname == "negocio.id"
    ]

    assert len(negocio_fks) == 1
    assert negocio_fks[0].ondelete == "RESTRICT"


def test_articulo_has_frozen_unique_constraints_and_sku_partial_index() -> None:
    names = constraint_names(ArticuloCatalogoModel)
    article_indexes = indexes(ArticuloCatalogoModel)

    assert {
        "uq_articulo_catalogo_negocio_nombre_normalizado",
        "uq_articulo_catalogo_id_negocio",
    } <= names

    sku_index = article_indexes["uq_articulo_sku_negocio"]
    assert sku_index.unique is True
    assert [column.name for column in sku_index.columns] == [
        "negocio_id",
        "sku_normalizado",
    ]
    assert str(sku_index.dialect_options["postgresql"]["where"]) == (
        "sku_normalizado IS NOT NULL"
    )


def test_articulo_has_frozen_query_indexes() -> None:
    article_indexes = indexes(ArticuloCatalogoModel)

    expected = {
        "ix_articulo_catalogo_negocio_estado": [
            "negocio_id",
            "estado",
        ],
        "ix_articulo_catalogo_negocio_tipo_estado": [
            "negocio_id",
            "tipo",
            "estado",
        ],
        "ix_articulo_catalogo_negocio_categoria_estado": [
            "negocio_id",
            "categoria_id",
            "estado",
        ],
    }

    for index_name, expected_columns in expected.items():
        assert [
            column.name for column in article_indexes[index_name].columns
        ] == expected_columns


def test_articulo_has_all_local_and_cross_field_checks() -> None:
    checks = check_sql(ArticuloCatalogoModel)

    expected_names = {
        "ck_articulo_catalogo_nombre_no_vacio",
        "ck_articulo_catalogo_nombre_normalizado_no_vacio",
        "ck_articulo_catalogo_descripcion_funcional",
        "ck_articulo_catalogo_sku_funcional",
        "ck_articulo_catalogo_sku_normalizado_funcional",
        "ck_articulo_catalogo_sku_presencia_coherente",
        "ck_articulo_catalogo_tipo_valido",
        "ck_articulo_catalogo_estado_valido",
        "ck_articulo_catalogo_unidad_medida_valida",
        "ck_articulo_catalogo_precio_base_no_negativo",
        "ck_articulo_catalogo_costo_referencia_no_negativo",
        "ck_articulo_catalogo_version_positiva",
        "ck_articulo_catalogo_servicio_sin_capacidades_fisicas",
        "ck_articulo_catalogo_vencimiento_requiere_bien_stock",
        "ck_articulo_catalogo_produccion_requiere_bien_stock",
        "ck_articulo_catalogo_descuento_requiere_vendible",
        "ck_articulo_catalogo_activo_con_uso_operativo",
        "ck_articulo_catalogo_vendible_con_precio",
    }
    assert expected_names <= set(checks)

    assert checks["ck_articulo_catalogo_sku_presencia_coherente"] == (
        "(sku IS NULL) = (sku_normalizado IS NULL)"
    )
    assert checks["ck_articulo_catalogo_unidad_medida_valida"] == (
        "unidad_medida IN "
        "('UNIDAD', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'HORA')"
    )
    assert checks["ck_articulo_catalogo_descuento_requiere_vendible"] == (
        "permite_descuento = FALSE OR es_vendible = TRUE"
    )


def test_articulo_imagen_matches_frozen_physical_shape() -> None:
    table = ArticuloImagenModel.__table__

    assert set(table.columns.keys()) == {
        "id",
        "negocio_id",
        "articulo_id",
        "referencia_storage",
        "posicion",
        "es_principal",
        "created_at",
    }
    assert isinstance(table.c.posicion.type, SmallInteger)
    assert isinstance(table.c.referencia_storage.type, Text)
    assert table.c.created_at.type.timezone is True
    assert "version" not in table.c


def test_articulo_imagen_has_only_tenant_safe_parent_fk_with_cascade() -> None:
    table = ArticuloImagenModel.__table__
    foreign_keys = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    ]

    assert len(foreign_keys) == 1
    constraint = foreign_keys[0]
    assert [element.parent.name for element in constraint.elements] == [
        "articulo_id",
        "negocio_id",
    ]
    assert [element.target_fullname for element in constraint.elements] == [
        "articulo_catalogo.id",
        "articulo_catalogo.negocio_id",
    ]
    assert constraint.ondelete == "CASCADE"
    assert not any(
        foreign_key.target_fullname == "negocio.id"
        for foreign_key in table.c.negocio_id.foreign_keys
    )


def test_articulo_imagen_position_unique_is_deferred_and_principal_is_partial() -> None:
    uniques = unique_constraints(ArticuloImagenModel)
    position_unique = uniques["uq_articulo_imagen_articulo_posicion"]

    assert [column.name for column in position_unique.columns] == [
        "articulo_id",
        "posicion",
    ]
    assert position_unique.deferrable is True
    assert position_unique.initially == "DEFERRED"

    principal = indexes(ArticuloImagenModel)["uq_articulo_imagen_principal"]
    assert principal.unique is True
    assert [column.name for column in principal.columns] == ["articulo_id"]
    assert str(principal.dialect_options["postgresql"]["where"]) == (
        "es_principal = TRUE"
    )


def test_articulo_imagen_checks_position_and_opaque_storage_reference() -> None:
    checks = check_sql(ArticuloImagenModel)

    assert checks["ck_articulo_imagen_posicion_valida"] == (
        "posicion BETWEEN 1 AND 3"
    )
    assert checks["ck_articulo_imagen_referencia_storage_no_vacia"] == (
        "btrim(referencia_storage) <> ''"
    )


def test_auditoria_matches_append_only_frozen_shape() -> None:
    table = AuditoriaCambioModel.__table__

    assert set(table.columns.keys()) == {
        "id",
        "negocio_id",
        "actor_usuario_id",
        "entidad_tipo",
        "entidad_id",
        "accion",
        "cambios",
        "ocurrido_en",
    }
    assert table.c.negocio_id.nullable is False
    assert table.c.actor_usuario_id.nullable is False
    assert isinstance(table.c.cambios.type, JSONB)
    assert table.c.cambios.nullable is False
    assert isinstance(table.c.ocurrido_en.type, DateTime)
    assert table.c.ocurrido_en.type.timezone is True
    assert "version" not in table.c


def test_auditoria_restricts_actor_and_tenant_but_not_polymorphic_entity() -> None:
    table = AuditoriaCambioModel.__table__

    negocio_fk = next(iter(table.c.negocio_id.foreign_keys))
    actor_fk = next(iter(table.c.actor_usuario_id.foreign_keys))

    assert negocio_fk.target_fullname == "negocio.id"
    assert negocio_fk.ondelete == "RESTRICT"
    assert actor_fk.target_fullname == "usuario.id"
    assert actor_fk.ondelete == "RESTRICT"
    assert not table.c.entidad_id.foreign_keys


def test_auditoria_checks_json_object_and_non_blank_descriptors() -> None:
    checks = check_sql(AuditoriaCambioModel)

    assert checks["ck_auditoria_cambio_entidad_tipo_no_vacio"] == (
        "btrim(entidad_tipo) <> ''"
    )
    assert checks["ck_auditoria_cambio_accion_no_vacio"] == "btrim(accion) <> ''"
    assert checks["ck_auditoria_cambio_cambios_objeto"] == (
        "jsonb_typeof(cambios) = 'object'"
    )


def test_auditoria_has_single_frozen_history_index_with_descending_time() -> None:
    audit_indexes = indexes(AuditoriaCambioModel)

    assert set(audit_indexes) == {
        "ix_auditoria_cambio_negocio_entidad_ocurrido",
    }
    index = audit_indexes["ix_auditoria_cambio_negocio_entidad_ocurrido"]
    assert [expression.name for expression in index.expressions[:3]] == [
        "negocio_id",
        "entidad_tipo",
        "entidad_id",
    ]
    assert str(index.expressions[-1]) == "auditoria_cambio.ocurrido_en DESC"


def test_m02_and_audit_models_do_not_introduce_relationships() -> None:
    for model in (
        CategoriaModel,
        ArticuloCatalogoModel,
        ArticuloImagenModel,
        AuditoriaCambioModel,
    ):
        assert not model.__mapper__.relationships
