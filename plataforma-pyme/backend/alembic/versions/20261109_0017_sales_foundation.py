"""E2-6 A: persistencia de Ventas y origen físico VENTA_SALIDA.

Revision ID: e26a_sales_foundation
Revises: e25a_inventory_ops
Create Date: 2026-11-09

Migración aditiva: las recepciones y operaciones de E2-4/E2-5 existentes
mantienen sus IDs y signos. Los comandos HTTP de ventas vienen en B/C.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e26a_sales_foundation"
down_revision: str | None = "e25a_inventory_ops"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def _origin_check(*, with_sales: bool) -> str:
    """Misma regla para la creación y para restaurar el estado previo."""
    without_sale = " AND sale_id IS NULL AND sale_line_id IS NULL" if with_sales else ""
    receipt = (
        "event_type = 'COMPRA_RECEPCION' AND receipt_id IS NOT NULL "
        "AND purchase_line_id IS NOT NULL AND inventory_operation_id IS NULL "
        f"AND operation_kind IS NULL{without_sale} AND delta_milli BETWEEN 1 AND 999999999"
    )
    manual = []
    for event, kind, low, high in (
        ("TRASLADO_ENTRADA", "TRASLADO", 1, 999999999),
        ("TRASLADO_SALIDA", "TRASLADO", -999999999, -1),
        ("AJUSTE_ENTRADA", "AJUSTE_ENTRADA", 1, 999999999),
        ("AJUSTE_SALIDA", "AJUSTE_SALIDA", -999999999, -1),
        ("STOCK_INICIAL", "STOCK_INICIAL", 1, 999999999),
    ):
        manual.append(
            "event_type = '" + event + "' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
            "AND operation_kind IS NOT NULL AND operation_kind = '" + kind + "'"
            + without_sale + f" AND delta_milli BETWEEN {low} AND {high}"
        )
    sections = [receipt, *manual]
    if with_sales:
        sections.append(
            "event_type = 'VENTA_SALIDA' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NULL "
            "AND operation_kind IS NULL AND sale_id IS NOT NULL "
            "AND sale_line_id IS NOT NULL AND delta_milli BETWEEN -999999999 AND -1"
        )
    return " OR ".join(f"({x})" for x in sections)


def upgrade() -> None:
    op.create_table(
        "sales",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("request_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_sha256", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("subtotal_cents", sa.BigInteger(), nullable=False),
        sa.Column("discount_cents", sa.BigInteger(), nullable=False),
        sa.Column("total_cents", sa.BigInteger(), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=False,
                  server_default=sa.text("''")),
        sa.Column("created_by_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("balances_after", postgresql.JSONB(), nullable=False,
                  server_default=sa.text("'[]'::jsonb")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"],
                                name="fk_sales_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "location_id"],
                                ["locations.business_id", "locations.id"],
                                name="fk_sales_location_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "created_by_id"],
                                ["memberships.business_id", "memberships.user_id"],
                                name="fk_sales_creator_membership_tenant", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "id", name="uq_sales_business_id_id"),
        sa.UniqueConstraint("business_id", "request_id", name="uq_sales_business_request"),
        sa.CheckConstraint("status = 'CONFIRMADA'", name="ck_sales_status_confirmed"),
        sa.CheckConstraint("subtotal_cents BETWEEN 1 AND 99999999999",
                           name="ck_sales_subtotal_cents"),
        sa.CheckConstraint("discount_cents BETWEEN 0 AND 99999999999",
                           name="ck_sales_discount_cents"),
        sa.CheckConstraint(
            "total_cents BETWEEN 1 AND 99999999999 "
            "AND total_cents = subtotal_cents - discount_cents",
            name="ck_sales_positive_total_equals_subtotal_minus_discount",
        ),
        sa.CheckConstraint("length(request_sha256) = 64", name="ck_sales_request_digest"),
        sa.CheckConstraint("length(notes) <= 500", name="ck_sales_notes_length"),
        sa.CheckConstraint("jsonb_typeof(balances_after) = 'array'",
                           name="ck_sales_balance_snapshot_array"),
    )
    op.create_index("ix_sales_business_created", "sales", ["business_id", "created_at"])

    op.create_table(
        "sale_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("sale_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("line_number", sa.SmallInteger(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("description_snapshot", sa.String(length=140), nullable=False),
        sa.Column("kind_snapshot", sa.String(length=12), nullable=False),
        sa.Column("unit_snapshot", sa.String(length=16), nullable=False),
        sa.Column("sku_snapshot", sa.String(length=32), nullable=False,
                  server_default=sa.text("''")),
        sa.Column("quantity_milli", sa.BigInteger(), nullable=False),
        sa.Column("unit_price_cents", sa.BigInteger(), nullable=False),
        sa.Column("line_total_cents", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["business_id", "sale_id"], ["sales.business_id", "sales.id"],
            name="fk_sale_lines_sale_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "catalog_item_id"],
            ["catalog_items.business_id", "catalog_items.id"],
            name="fk_sale_lines_catalog_tenant", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("business_id", "id", name="uq_sale_lines_business_id_id"),
        sa.UniqueConstraint("business_id", "sale_id", "id",
                            name="uq_sale_lines_business_sale_id_id"),
        sa.UniqueConstraint("business_id", "sale_id", "line_number",
                            name="uq_sale_lines_business_sale_line_number"),
        sa.CheckConstraint("line_number BETWEEN 1 AND 30", name="ck_sale_lines_number"),
        sa.CheckConstraint("length(btrim(description_snapshot)) BETWEEN 2 AND 140",
                           name="ck_sale_lines_description"),
        sa.CheckConstraint(
            "(kind_snapshot = 'SERVICIO' AND unit_snapshot = 'SERVICIO') OR "
            "(kind_snapshot = 'BIEN' AND unit_snapshot IN "
            "('UNIDAD','GRAMO','KILOGRAMO','MILILITRO','LITRO','PAQUETE','CAJA'))",
            name="ck_sale_lines_kind_unit",
        ),
        sa.CheckConstraint("quantity_milli BETWEEN 1 AND 999999999",
                           name="ck_sale_lines_quantity"),
        sa.CheckConstraint(
            "unit_snapshot NOT IN ('UNIDAD','PAQUETE','CAJA','SERVICIO') "
            "OR quantity_milli % 1000 = 0",
            name="ck_sale_lines_discrete_quantity",
        ),
        sa.CheckConstraint("unit_price_cents BETWEEN 0 AND 99999999999",
                           name="ck_sale_lines_unit_price"),
        sa.CheckConstraint("line_total_cents BETWEEN 0 AND 99999999999",
                           name="ck_sale_lines_total"),
        sa.CheckConstraint(
            "line_total_cents = floor("
            "(quantity_milli::numeric * unit_price_cents + 500) / 1000)",
            name="ck_sale_lines_half_up_total",
        ),
    )

    op.create_table(
        "sale_payments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("sale_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("payment_number", sa.SmallInteger(), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("amount_cents", sa.BigInteger(), nullable=False),
        sa.Column("reference", sa.String(length=120), nullable=False,
                  server_default=sa.text("''")),
        sa.ForeignKeyConstraint(
            ["business_id", "sale_id"], ["sales.business_id", "sales.id"],
            name="fk_sale_payments_sale_tenant", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("business_id", "id", name="uq_sale_payments_business_id_id"),
        sa.UniqueConstraint("business_id", "sale_id", "payment_number",
                            name="uq_sale_payments_business_sale_number"),
        sa.CheckConstraint("payment_number BETWEEN 1 AND 6",
                           name="ck_sale_payments_number"),
        sa.CheckConstraint(
            "method IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI',"
            "'TARJETA','MERCADO_PAGO_DECLARADO')",
            name="ck_sale_payments_declared_method",
        ),
        sa.CheckConstraint("amount_cents BETWEEN 1 AND 99999999999",
                           name="ck_sale_payments_positive_amount"),
        sa.CheckConstraint("length(reference) <= 120",
                           name="ck_sale_payments_reference_length"),
    )

    # No hay ventas registradas aún. Los movimientos E2-4/E2-5 existentes
    # conservan NULL en los campos nuevos y siguen cumpliendo el CHECK extendido.
    op.add_column("stock_movements",
                  sa.Column("sale_id", sa.Uuid(as_uuid=True), nullable=True))
    op.add_column("stock_movements",
                  sa.Column("sale_line_id", sa.Uuid(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_stock_movements_sale_line_tenant", "stock_movements", "sale_lines",
        ["business_id", "sale_id", "sale_line_id"],
        ["business_id", "sale_id", "id"], ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_stock_movements_sale_line", "stock_movements",
        ["business_id", "sale_id", "sale_line_id"],
    )
    op.create_index("ix_stock_movements_business_sale", "stock_movements",
                    ["business_id", "sale_id"])
    op.drop_constraint("ck_stock_movements_origin_and_sign",
                       "stock_movements", type_="check")
    op.create_check_constraint(
        "ck_stock_movements_origin_and_sign",
        "stock_movements", _origin_check(with_sales=True),
    )


def downgrade() -> None:
    """Nunca borrar historia real de ventas: revertir solo en DB efímera vacía."""
    db = op.get_bind()
    count = db.execute(sa.text("SELECT count(*) FROM sales")).scalar_one()
    if count:
        raise RuntimeError(
            "No se puede revertir e26a_sales_foundation con ventas registradas"
        )
    op.drop_constraint("ck_stock_movements_origin_and_sign",
                       "stock_movements", type_="check")
    op.create_check_constraint(
        "ck_stock_movements_origin_and_sign",
        "stock_movements", _origin_check(with_sales=False),
    )
    op.drop_index("ix_stock_movements_business_sale", table_name="stock_movements")
    op.drop_constraint("uq_stock_movements_sale_line",
                       "stock_movements", type_="unique")
    op.drop_constraint("fk_stock_movements_sale_line_tenant",
                       "stock_movements", type_="foreignkey")
    op.drop_column("stock_movements", "sale_line_id")
    op.drop_column("stock_movements", "sale_id")
    op.drop_table("sale_payments")
    op.drop_table("sale_lines")
    op.drop_index("ix_sales_business_created", table_name="sales")
    op.drop_table("sales")
