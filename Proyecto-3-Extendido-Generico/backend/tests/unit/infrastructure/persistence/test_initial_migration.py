import importlib.util
import io
from pathlib import Path
from types import ModuleType

from alembic.migration import MigrationContext
from alembic.operations import Operations


REVISION_PATH = (
    Path(__file__).resolve().parents[4]
    / "alembic"
    / "versions"
    / "0001_bloque1_initial.py"
)

TABLES = (
    "usuario",
    "negocio",
    "negocio_modalidad",
    "usuario_negocio",
    "invitacion_negocio",
    "categoria",
    "articulo_catalogo",
    "articulo_imagen",
    "auditoria_cambio",
)


def load_revision() -> ModuleType:
    spec = importlib.util.spec_from_file_location("initial_revision", REVISION_PATH)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def compile_postgresql_sql(direction: str) -> str:
    revision = load_revision()
    buffer = io.StringIO()
    context = MigrationContext.configure(
        dialect_name="postgresql",
        opts={
            "as_sql": True,
            "output_buffer": buffer,
        },
    )
    revision.op = Operations(context)
    getattr(revision, direction)()
    return buffer.getvalue()


def test_initial_revision_is_single_root_revision() -> None:
    revision = load_revision()

    assert revision.revision == "0001_bloque1"
    assert revision.down_revision is None
    assert revision.branch_labels is None
    assert revision.depends_on is None


def test_upgrade_compiles_all_nine_block1_tables_for_postgresql() -> None:
    sql = compile_postgresql_sql("upgrade")

    assert sql.count("CREATE TABLE") == 9
    for table_name in TABLES:
        assert f"CREATE TABLE {table_name}" in sql


def test_upgrade_preserves_postgresql_specific_integrity_contracts() -> None:
    sql = compile_postgresql_sql("upgrade")

    assert (
        "UNIQUE (articulo_id, posicion) DEFERRABLE INITIALLY DEFERRED"
        in sql
    )
    assert (
        "CREATE UNIQUE INDEX uq_articulo_sku_negocio "
        "ON articulo_catalogo (negocio_id, sku_normalizado) "
        "WHERE sku_normalizado IS NOT NULL"
        in sql
    )
    assert (
        "CREATE UNIQUE INDEX uq_articulo_imagen_principal "
        "ON articulo_imagen (articulo_id) WHERE es_principal = TRUE"
        in sql
    )
    assert (
        "CREATE UNIQUE INDEX uq_invitacion_pendiente "
        "ON invitacion_negocio (negocio_id, email_destino_normalizado) "
        "WHERE estado = 'PENDIENTE'"
        in sql
    )


def test_upgrade_preserves_tenant_safe_foreign_keys_and_delete_policies() -> None:
    sql = compile_postgresql_sql("upgrade")

    assert (
        "FOREIGN KEY(categoria_id, negocio_id) "
        "REFERENCES categoria (id, negocio_id) MATCH SIMPLE ON DELETE RESTRICT"
        in sql
    )
    assert (
        "FOREIGN KEY(articulo_id, negocio_id) "
        "REFERENCES articulo_catalogo (id, negocio_id) ON DELETE CASCADE"
        in sql
    )
    assert (
        "FOREIGN KEY(emisor_usuario_negocio_id, negocio_id) "
        "REFERENCES usuario_negocio (id, negocio_id) ON DELETE RESTRICT"
        in sql
    )


def test_upgrade_preserves_money_jsonb_and_core_check_constraints() -> None:
    sql = compile_postgresql_sql("upgrade")

    assert "precio_base NUMERIC(19, 4)" in sql
    assert "costo_referencia NUMERIC(19, 4)" in sql
    assert "cambios JSONB NOT NULL" in sql

    for check_sql in (
        "CHECK (posicion BETWEEN 1 AND 3)",
        "CHECK (precio_base IS NULL OR precio_base >= 0)",
        "CHECK (costo_referencia IS NULL OR costo_referencia >= 0)",
        "CHECK (jsonb_typeof(cambios) = 'object')",
        "CHECK (permite_descuento = FALSE OR es_vendible = TRUE)",
    ):
        assert check_sql in sql


def test_upgrade_uses_text_checks_instead_of_native_postgresql_enums() -> None:
    sql = compile_postgresql_sql("upgrade")

    assert "CREATE TYPE" not in sql
    assert "rol IN ('PROPIETARIO', 'ENCARGADO', 'TRABAJADOR')" in sql
    assert "tipo IN ('BIEN', 'SERVICIO')" in sql
    assert (
        "unidad_medida IN "
        "('UNIDAD', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'HORA')"
        in sql
    )


def test_downgrade_drops_all_tables_in_dependency_safe_reverse_order() -> None:
    sql = compile_postgresql_sql("downgrade")

    assert sql.count("DROP TABLE") == 9

    drop_order = [
        "auditoria_cambio",
        "articulo_imagen",
        "articulo_catalogo",
        "categoria",
        "invitacion_negocio",
        "usuario_negocio",
        "negocio_modalidad",
        "negocio",
        "usuario",
    ]
    positions = [sql.index(f"DROP TABLE {table_name}") for table_name in drop_order]

    assert positions == sorted(positions)
