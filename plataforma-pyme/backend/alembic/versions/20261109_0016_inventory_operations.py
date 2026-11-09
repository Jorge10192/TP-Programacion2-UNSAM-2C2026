"""E2-5 A: operaciones de inventario y movimientos de origen explícito.

Revision ID: e25a_inventory_ops
Revises: e24e_receipt_stock
Create Date: 2026-11-09

Migración aditiva sobre datos existentes: no reescribe recepciones confirmadas.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e25a_inventory_ops"
down_revision: str | None = "e24e_receipt_stock"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inventory_operations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_sha256", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=24), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("unit_snapshot", sa.String(length=16), nullable=False),
        sa.Column("quantity_milli", sa.BigInteger(), nullable=False),
        sa.Column("source_location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("destination_location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("actor_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"],
            name="fk_inventory_operations_business", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "catalog_item_id"],
            ["catalog_items.business_id", "catalog_items.id"],
            name="fk_inventory_operations_catalog_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "source_location_id"],
            ["locations.business_id", "locations.id"],
            name="fk_inventory_operations_source_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "destination_location_id"],
            ["locations.business_id", "locations.id"],
            name="fk_inventory_operations_destination_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "actor_id"],
            ["memberships.business_id", "memberships.user_id"],
            name="fk_inventory_operations_actor_tenant", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "business_id", "id", name="uq_inventory_operations_business_id_id",
        ),
        sa.UniqueConstraint(
            "business_id", "id", "kind", name="uq_inventory_operations_business_id_kind",
        ),
        sa.UniqueConstraint(
            "business_id", "request_id",
            name="uq_inventory_operations_business_request",
        ),
        sa.CheckConstraint(
            "kind IN ('TRASLADO','AJUSTE_ENTRADA','AJUSTE_SALIDA','STOCK_INICIAL')",
            name="ck_inventory_operations_kind",
        ),
        sa.CheckConstraint(
            "quantity_milli BETWEEN 1 AND 999999999",
            name="ck_inventory_operations_quantity",
        ),
        sa.CheckConstraint(
            "unit_snapshot IN ('UNIDAD','GRAMO','KILOGRAMO','MILILITRO','LITRO','PAQUETE','CAJA')",
            name="ck_inventory_operations_physical_unit",
        ),
        sa.CheckConstraint(
            "unit_snapshot NOT IN ('UNIDAD','PAQUETE','CAJA') OR quantity_milli % 1000 = 0",
            name="ck_inventory_operations_discrete_quantity",
        ),
        sa.CheckConstraint(
            "length(request_sha256) = 64", name="ck_inventory_operations_digest",
        ),
        sa.CheckConstraint(
            "length(btrim(reason)) BETWEEN 3 AND 500", name="ck_inventory_operations_reason",
        ),
        sa.CheckConstraint(
            "("
            "kind = 'TRASLADO' AND source_location_id IS NOT NULL "
            "AND destination_location_id IS NOT NULL "
            "AND source_location_id <> destination_location_id"
            ") OR ("
            "kind = 'AJUSTE_SALIDA' AND source_location_id IS NOT NULL "
            "AND destination_location_id IS NULL"
            ") OR ("
            "kind IN ('AJUSTE_ENTRADA','STOCK_INICIAL') "
            "AND source_location_id IS NULL AND destination_location_id IS NOT NULL"
            ")",
            name="ck_inventory_operations_direction_locations",
        ),
    )

    # El registro histórico de E2-4 E debe seguir siendo válido, sin reescritura
    # de UUID, idempotencia, actor, importes ni deltas existentes.
    op.add_column(
        "stock_movements",
        sa.Column("inventory_operation_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.add_column(
        "stock_movements",
        sa.Column("operation_kind", sa.String(length=24), nullable=True),
    )
    op.alter_column("stock_movements", "receipt_id", existing_type=sa.Uuid(as_uuid=True), nullable=True)
    op.alter_column(
        "stock_movements", "purchase_line_id",
        existing_type=sa.Uuid(as_uuid=True), nullable=True,
    )
    op.drop_constraint("ck_stock_movements_positive_entry", "stock_movements", type_="check")
    op.drop_constraint("ck_stock_movements_receipt_only", "stock_movements", type_="check")
    op.create_foreign_key(
        "fk_stock_movements_operation_kind_tenant", "stock_movements",
        "inventory_operations",
        ["business_id", "inventory_operation_id", "operation_kind"],
        ["business_id", "id", "kind"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_stock_movements_operation_event", "stock_movements",
        ["business_id", "inventory_operation_id", "event_type"],
    )
    op.create_check_constraint(
        "ck_stock_movements_origin_and_sign", "stock_movements",
        "("
        "event_type = 'COMPRA_RECEPCION' AND receipt_id IS NOT NULL "
        "AND purchase_line_id IS NOT NULL AND inventory_operation_id IS NULL "
        "AND operation_kind IS NULL AND delta_milli BETWEEN 1 AND 999999999"
        ") OR ("
        "event_type = 'TRASLADO_ENTRADA' AND receipt_id IS NULL "
        "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
        "AND operation_kind IS NOT NULL AND operation_kind = 'TRASLADO' "
        "AND delta_milli BETWEEN 1 AND 999999999"
        ") OR ("
        "event_type = 'TRASLADO_SALIDA' AND receipt_id IS NULL "
        "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
        "AND operation_kind IS NOT NULL AND operation_kind = 'TRASLADO' "
        "AND delta_milli BETWEEN -999999999 AND -1"
        ") OR ("
        "event_type = 'AJUSTE_ENTRADA' AND receipt_id IS NULL "
        "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
        "AND operation_kind IS NOT NULL AND operation_kind = 'AJUSTE_ENTRADA' "
        "AND delta_milli BETWEEN 1 AND 999999999"
        ") OR ("
        "event_type = 'AJUSTE_SALIDA' AND receipt_id IS NULL "
        "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
        "AND operation_kind IS NOT NULL AND operation_kind = 'AJUSTE_SALIDA' "
        "AND delta_milli BETWEEN -999999999 AND -1"
        ") OR ("
        "event_type = 'STOCK_INICIAL' AND receipt_id IS NULL "
        "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
        "AND operation_kind IS NOT NULL AND operation_kind = 'STOCK_INICIAL' "
        "AND delta_milli BETWEEN 1 AND 999999999"
        ")",
    )


def downgrade() -> None:
    # Ninguna migración de producción debe destruir transferencias ya registradas.
    db = op.get_bind()
    count = db.execute(sa.text("SELECT count(*) FROM inventory_operations")).scalar_one()
    if count:
        raise RuntimeError(
            "No se permite revertir e25a_inventory_ops con operaciones de stock registradas"
        )
    op.drop_constraint("ck_stock_movements_origin_and_sign", "stock_movements", type_="check")
    op.drop_constraint(
        "uq_stock_movements_operation_event", "stock_movements", type_="unique",
    )
    op.drop_constraint(
        "fk_stock_movements_operation_kind_tenant", "stock_movements", type_="foreignkey",
    )
    op.alter_column(
        "stock_movements", "receipt_id",
        existing_type=sa.Uuid(as_uuid=True), nullable=False,
    )
    op.alter_column(
        "stock_movements", "purchase_line_id",
        existing_type=sa.Uuid(as_uuid=True), nullable=False,
    )
    op.drop_column("stock_movements", "operation_kind")
    op.drop_column("stock_movements", "inventory_operation_id")
    op.create_check_constraint(
        "ck_stock_movements_positive_entry", "stock_movements",
        "delta_milli BETWEEN 1 AND 999999999",
    )
    op.create_check_constraint(
        "ck_stock_movements_receipt_only", "stock_movements",
        "event_type = 'COMPRA_RECEPCION'",
    )
    op.drop_table("inventory_operations")
