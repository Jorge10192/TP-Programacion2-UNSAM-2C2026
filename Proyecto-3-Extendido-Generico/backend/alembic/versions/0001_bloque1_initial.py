"""Create the initial relational schema for Block 1.

Revision ID: 0001_bloque1
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_bloque1"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the complete Block 1 schema."""

    op.create_table(
        "usuario",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("email_normalizado", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("fecha_registro", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "btrim(nombre) <> ''",
            name="ck_usuario_usuario_nombre_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(email) <> ''",
            name="ck_usuario_usuario_email_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(email_normalizado) <> ''",
            name="ck_usuario_usuario_email_normalizado_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(password_hash) <> ''",
            name="ck_usuario_usuario_password_hash_no_vacio",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_usuario"),
        sa.UniqueConstraint(
            "email_normalizado",
            name="uq_usuario_email_normalizado",
        ),
    )

    op.create_table(
        "negocio",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("rubro", sa.Text(), nullable=True),
        sa.Column(
            "moneda_base",
            sa.String(length=3),
            server_default=sa.text("'ARS'"),
            nullable=False,
        ),
        sa.Column(
            "version",
            sa.BigInteger(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "btrim(nombre) <> ''",
            name="ck_negocio_negocio_nombre_no_vacio",
        ),
        sa.CheckConstraint(
            "rubro IS NULL OR btrim(rubro) <> ''",
            name="ck_negocio_negocio_rubro_funcional",
        ),
        sa.CheckConstraint(
            "moneda_base IN ('ARS')",
            name="ck_negocio_negocio_moneda_base_valida",
        ),
        sa.CheckConstraint(
            "version >= 1",
            name="ck_negocio_negocio_version_positiva",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_negocio"),
    )

    op.create_table(
        "negocio_modalidad",
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("modalidad", sa.String(), nullable=False),
        sa.CheckConstraint(
            "modalidad IN ('REVENTA', 'PRODUCCION', 'SERVICIOS')",
            name="ck_negocio_modalidad_negocio_modalidad_valida",
        ),
        sa.ForeignKeyConstraint(
            ["negocio_id"],
            ["negocio.id"],
            name="fk_negocio_modalidad_negocio_id_negocio",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "negocio_id",
            "modalidad",
            name="pk_negocio_modalidad",
        ),
    )

    op.create_table(
        "usuario_negocio",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("usuario_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("rol", sa.String(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column(
            "fecha_incorporacion",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "version",
            sa.BigInteger(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "rol IN ('PROPIETARIO', 'ENCARGADO', 'TRABAJADOR')",
            name="ck_usuario_negocio_usuario_negocio_rol_valido",
        ),
        sa.CheckConstraint(
            "estado IN ('ACTIVO', 'INACTIVO')",
            name="ck_usuario_negocio_usuario_negocio_estado_valido",
        ),
        sa.CheckConstraint(
            "version >= 1",
            name="ck_usuario_negocio_usuario_negocio_version_positiva",
        ),
        sa.ForeignKeyConstraint(
            ["negocio_id"],
            ["negocio.id"],
            name="fk_usuario_negocio_negocio_id_negocio",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuario.id"],
            name="fk_usuario_negocio_usuario_id_usuario",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_usuario_negocio"),
        sa.UniqueConstraint(
            "id",
            "negocio_id",
            name="uq_usuario_negocio_id_negocio",
        ),
        sa.UniqueConstraint(
            "usuario_id",
            "negocio_id",
            name="uq_usuario_negocio_usuario_negocio",
        ),
    )
    op.create_index(
        "ix_usuario_negocio_negocio_estado_rol",
        "usuario_negocio",
        ["negocio_id", "estado", "rol"],
        unique=False,
    )
    op.create_index(
        "ix_usuario_negocio_usuario_estado",
        "usuario_negocio",
        ["usuario_id", "estado"],
        unique=False,
    )

    op.create_table(
        "invitacion_negocio",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email_destino", sa.Text(), nullable=False),
        sa.Column("email_destino_normalizado", sa.Text(), nullable=False),
        sa.Column("rol_propuesto", sa.String(), nullable=False),
        sa.Column(
            "emisor_usuario_negocio_id",
            sa.Uuid(as_uuid=True),
            nullable=False,
        ),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column(
            "fecha_emision",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "fecha_expiracion",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "version",
            sa.BigInteger(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "btrim(email_destino) <> ''",
            name="ck_invitacion_negocio_invitacion_email_destino_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(email_destino_normalizado) <> ''",
            name=(
                "ck_invitacion_negocio_"
                "invitacion_email_destino_normalizado_no_vacio"
            ),
        ),
        sa.CheckConstraint(
            "btrim(token_hash) <> ''",
            name="ck_invitacion_negocio_invitacion_token_hash_no_vacio",
        ),
        sa.CheckConstraint(
            "rol_propuesto IN ('ENCARGADO', 'TRABAJADOR')",
            name="ck_invitacion_negocio_invitacion_rol_propuesto_valido",
        ),
        sa.CheckConstraint(
            "estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA')",
            name="ck_invitacion_negocio_invitacion_estado_valido",
        ),
        sa.CheckConstraint(
            "fecha_expiracion > fecha_emision",
            name="ck_invitacion_negocio_invitacion_periodo_valido",
        ),
        sa.CheckConstraint(
            "version >= 1",
            name="ck_invitacion_negocio_invitacion_version_positiva",
        ),
        sa.ForeignKeyConstraint(
            ["emisor_usuario_negocio_id", "negocio_id"],
            ["usuario_negocio.id", "usuario_negocio.negocio_id"],
            name="fk_invitacion_negocio_emisor_mismo_negocio",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["negocio_id"],
            ["negocio.id"],
            name="fk_invitacion_negocio_negocio_id_negocio",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_invitacion_negocio"),
        sa.UniqueConstraint(
            "token_hash",
            name="uq_invitacion_negocio_token_hash",
        ),
    )
    op.create_index(
        "ix_invitacion_email_estado",
        "invitacion_negocio",
        ["email_destino_normalizado", "estado"],
        unique=False,
    )
    op.create_index(
        "ix_invitacion_negocio_estado_expiracion",
        "invitacion_negocio",
        ["negocio_id", "estado", "fecha_expiracion"],
        unique=False,
    )
    op.create_index(
        "uq_invitacion_pendiente",
        "invitacion_negocio",
        ["negocio_id", "email_destino_normalizado"],
        unique=True,
        postgresql_where=sa.text("estado = 'PENDIENTE'"),
    )

    op.create_table(
        "categoria",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("nombre_normalizado", sa.Text(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column(
            "version",
            sa.BigInteger(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "btrim(nombre) <> ''",
            name="ck_categoria_nombre_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(nombre_normalizado) <> ''",
            name="ck_categoria_nombre_normalizado_no_vacio",
        ),
        sa.CheckConstraint(
            "estado IN ('ACTIVA', 'INACTIVA')",
            name="ck_categoria_estado_valido",
        ),
        sa.CheckConstraint(
            "version >= 1",
            name="ck_categoria_version_positiva",
        ),
        sa.ForeignKeyConstraint(
            ["negocio_id"],
            ["negocio.id"],
            name="fk_categoria_negocio_id_negocio",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_categoria"),
        sa.UniqueConstraint(
            "id",
            "negocio_id",
            name="uq_categoria_id_negocio",
        ),
        sa.UniqueConstraint(
            "negocio_id",
            "nombre_normalizado",
            name="uq_categoria_negocio_nombre_normalizado",
        ),
    )
    op.create_index(
        "ix_categoria_negocio_estado",
        "categoria",
        ["negocio_id", "estado"],
        unique=False,
    )

    op.create_table(
        "articulo_catalogo",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("categoria_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("nombre_normalizado", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("unidad_medida", sa.String(), nullable=False),
        sa.Column("sku", sa.Text(), nullable=True),
        sa.Column("sku_normalizado", sa.Text(), nullable=True),
        sa.Column("precio_base", sa.Numeric(19, 4), nullable=True),
        sa.Column("costo_referencia", sa.Numeric(19, 4), nullable=True),
        sa.Column("es_comprable", sa.Boolean(), nullable=False),
        sa.Column("es_vendible", sa.Boolean(), nullable=False),
        sa.Column("controla_stock", sa.Boolean(), nullable=False),
        sa.Column(
            "puede_usarse_en_produccion",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column("controla_vencimiento", sa.Boolean(), nullable=False),
        sa.Column("permite_descuento", sa.Boolean(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column(
            "version",
            sa.BigInteger(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "btrim(nombre) <> ''",
            name="ck_articulo_catalogo_nombre_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(nombre_normalizado) <> ''",
            name="ck_articulo_catalogo_nombre_normalizado_no_vacio",
        ),
        sa.CheckConstraint(
            "descripcion IS NULL OR btrim(descripcion) <> ''",
            name="ck_articulo_catalogo_descripcion_funcional",
        ),
        sa.CheckConstraint(
            "sku IS NULL OR btrim(sku) <> ''",
            name="ck_articulo_catalogo_sku_funcional",
        ),
        sa.CheckConstraint(
            "sku_normalizado IS NULL OR btrim(sku_normalizado) <> ''",
            name="ck_articulo_catalogo_sku_normalizado_funcional",
        ),
        sa.CheckConstraint(
            "(sku IS NULL) = (sku_normalizado IS NULL)",
            name="ck_articulo_catalogo_sku_presencia_coherente",
        ),
        sa.CheckConstraint(
            "tipo IN ('BIEN', 'SERVICIO')",
            name="ck_articulo_catalogo_tipo_valido",
        ),
        sa.CheckConstraint(
            "estado IN ('ACTIVO', 'INACTIVO')",
            name="ck_articulo_catalogo_estado_valido",
        ),
        sa.CheckConstraint(
            "unidad_medida IN ('UNIDAD', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'HORA')",
            name="ck_articulo_catalogo_unidad_medida_valida",
        ),
        sa.CheckConstraint(
            "precio_base IS NULL OR precio_base >= 0",
            name="ck_articulo_catalogo_precio_base_no_negativo",
        ),
        sa.CheckConstraint(
            "costo_referencia IS NULL OR costo_referencia >= 0",
            name="ck_articulo_catalogo_costo_referencia_no_negativo",
        ),
        sa.CheckConstraint(
            "version >= 1",
            name="ck_articulo_catalogo_version_positiva",
        ),
        sa.CheckConstraint(
            "tipo <> 'SERVICIO' OR "
            "(controla_stock = FALSE "
            "AND controla_vencimiento = FALSE "
            "AND puede_usarse_en_produccion = FALSE)",
            name="ck_articulo_catalogo_servicio_sin_capacidades_fisicas",
        ),
        sa.CheckConstraint(
            "controla_vencimiento = FALSE OR "
            "(tipo = 'BIEN' AND controla_stock = TRUE)",
            name="ck_articulo_catalogo_vencimiento_requiere_bien_stock",
        ),
        sa.CheckConstraint(
            "puede_usarse_en_produccion = FALSE OR "
            "(tipo = 'BIEN' AND controla_stock = TRUE)",
            name="ck_articulo_catalogo_produccion_requiere_bien_stock",
        ),
        sa.CheckConstraint(
            "permite_descuento = FALSE OR es_vendible = TRUE",
            name="ck_articulo_catalogo_descuento_requiere_vendible",
        ),
        sa.CheckConstraint(
            "estado <> 'ACTIVO' OR "
            "(es_comprable = TRUE "
            "OR es_vendible = TRUE "
            "OR puede_usarse_en_produccion = TRUE)",
            name="ck_articulo_catalogo_activo_con_uso_operativo",
        ),
        sa.CheckConstraint(
            "es_vendible = FALSE OR "
            "(precio_base IS NOT NULL AND precio_base >= 0)",
            name="ck_articulo_catalogo_vendible_con_precio",
        ),
        sa.ForeignKeyConstraint(
            ["categoria_id", "negocio_id"],
            ["categoria.id", "categoria.negocio_id"],
            name="fk_articulo_catalogo_categoria_mismo_negocio",
            ondelete="RESTRICT",
            match="SIMPLE",
        ),
        sa.ForeignKeyConstraint(
            ["negocio_id"],
            ["negocio.id"],
            name="fk_articulo_catalogo_negocio_id_negocio",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_articulo_catalogo"),
        sa.UniqueConstraint(
            "id",
            "negocio_id",
            name="uq_articulo_catalogo_id_negocio",
        ),
        sa.UniqueConstraint(
            "negocio_id",
            "nombre_normalizado",
            name="uq_articulo_catalogo_negocio_nombre_normalizado",
        ),
    )
    op.create_index(
        "ix_articulo_catalogo_negocio_categoria_estado",
        "articulo_catalogo",
        ["negocio_id", "categoria_id", "estado"],
        unique=False,
    )
    op.create_index(
        "ix_articulo_catalogo_negocio_estado",
        "articulo_catalogo",
        ["negocio_id", "estado"],
        unique=False,
    )
    op.create_index(
        "ix_articulo_catalogo_negocio_tipo_estado",
        "articulo_catalogo",
        ["negocio_id", "tipo", "estado"],
        unique=False,
    )
    op.create_index(
        "uq_articulo_sku_negocio",
        "articulo_catalogo",
        ["negocio_id", "sku_normalizado"],
        unique=True,
        postgresql_where=sa.text("sku_normalizado IS NOT NULL"),
    )

    op.create_table(
        "articulo_imagen",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("articulo_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("referencia_storage", sa.Text(), nullable=False),
        sa.Column("posicion", sa.SmallInteger(), nullable=False),
        sa.Column("es_principal", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "posicion BETWEEN 1 AND 3",
            name="ck_articulo_imagen_posicion_valida",
        ),
        sa.CheckConstraint(
            "btrim(referencia_storage) <> ''",
            name="ck_articulo_imagen_referencia_storage_no_vacia",
        ),
        sa.ForeignKeyConstraint(
            ["articulo_id", "negocio_id"],
            ["articulo_catalogo.id", "articulo_catalogo.negocio_id"],
            name="fk_articulo_imagen_articulo_mismo_negocio",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_articulo_imagen"),
        sa.UniqueConstraint(
            "articulo_id",
            "posicion",
            name="uq_articulo_imagen_articulo_posicion",
            deferrable=True,
            initially="DEFERRED",
        ),
    )
    op.create_index(
        "uq_articulo_imagen_principal",
        "articulo_imagen",
        ["articulo_id"],
        unique=True,
        postgresql_where=sa.text("es_principal = TRUE"),
    )

    op.create_table(
        "auditoria_cambio",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("negocio_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("actor_usuario_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("entidad_tipo", sa.Text(), nullable=False),
        sa.Column("entidad_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("accion", sa.Text(), nullable=False),
        sa.Column("cambios", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "ocurrido_en",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.CheckConstraint(
            "btrim(entidad_tipo) <> ''",
            name="ck_auditoria_cambio_entidad_tipo_no_vacio",
        ),
        sa.CheckConstraint(
            "btrim(accion) <> ''",
            name="ck_auditoria_cambio_accion_no_vacio",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(cambios) = 'object'",
            name="ck_auditoria_cambio_cambios_objeto",
        ),
        sa.ForeignKeyConstraint(
            ["actor_usuario_id"],
            ["usuario.id"],
            name="fk_auditoria_cambio_actor_usuario_id_usuario",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["negocio_id"],
            ["negocio.id"],
            name="fk_auditoria_cambio_negocio_id_negocio",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auditoria_cambio"),
    )
    op.create_index(
        "ix_auditoria_cambio_negocio_entidad_ocurrido",
        "auditoria_cambio",
        [
            "negocio_id",
            "entidad_tipo",
            "entidad_id",
            sa.text("ocurrido_en DESC"),
        ],
        unique=False,
    )


def downgrade() -> None:
    """Drop the complete Block 1 schema in dependency-safe reverse order."""

    op.drop_index(
        "ix_auditoria_cambio_negocio_entidad_ocurrido",
        table_name="auditoria_cambio",
    )
    op.drop_table("auditoria_cambio")

    op.drop_index(
        "uq_articulo_imagen_principal",
        table_name="articulo_imagen",
        postgresql_where=sa.text("es_principal = TRUE"),
    )
    op.drop_table("articulo_imagen")

    op.drop_index(
        "uq_articulo_sku_negocio",
        table_name="articulo_catalogo",
        postgresql_where=sa.text("sku_normalizado IS NOT NULL"),
    )
    op.drop_index(
        "ix_articulo_catalogo_negocio_tipo_estado",
        table_name="articulo_catalogo",
    )
    op.drop_index(
        "ix_articulo_catalogo_negocio_estado",
        table_name="articulo_catalogo",
    )
    op.drop_index(
        "ix_articulo_catalogo_negocio_categoria_estado",
        table_name="articulo_catalogo",
    )
    op.drop_table("articulo_catalogo")

    op.drop_index(
        "ix_categoria_negocio_estado",
        table_name="categoria",
    )
    op.drop_table("categoria")

    op.drop_index(
        "uq_invitacion_pendiente",
        table_name="invitacion_negocio",
        postgresql_where=sa.text("estado = 'PENDIENTE'"),
    )
    op.drop_index(
        "ix_invitacion_negocio_estado_expiracion",
        table_name="invitacion_negocio",
    )
    op.drop_index(
        "ix_invitacion_email_estado",
        table_name="invitacion_negocio",
    )
    op.drop_table("invitacion_negocio")

    op.drop_index(
        "ix_usuario_negocio_usuario_estado",
        table_name="usuario_negocio",
    )
    op.drop_index(
        "ix_usuario_negocio_negocio_estado_rol",
        table_name="usuario_negocio",
    )
    op.drop_table("usuario_negocio")

    op.drop_table("negocio_modalidad")
    op.drop_table("negocio")
    op.drop_table("usuario")
